import { Express, Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";
import session from "express-session";
import { db } from "../db";
import { users, insertUserSchema } from "../shared/schema";
import { eq } from "drizzle-orm";
import connectPgSimple from "connect-pg-simple";
import { pool } from "../db";

// Add type for LinkedIn profile
interface LinkedInProfile {
  id: string;
  displayName: string;
  emails?: Array<{value: string}>;
  photos?: Array<{value: string}>;
  profileUrl?: string;
}

// Configure passport with LinkedIn strategy
export function configureAuth(app: Express) {
  // Setup session store with PostgreSQL
  const PgSession = connectPgSimple(session);

  // Ensure the session table exists
  try {
    console.log('Setting up session store with PostgreSQL');
    
    // Initialize session middleware with proper settings
    app.use(
      session({
        store: new PgSession({
          pool,
          tableName: 'session', // Use the existing session table
          createTableIfMissing: true, // Create table if it doesn't exist
        }),
        secret: process.env.SESSION_SECRET || 'preptalk-secret-key-dev-only',
        resave: false,
        saveUninitialized: false,
        cookie: {
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        }
      })
    );
    console.log('Session middleware initialized successfully');
  } catch (error) {
    console.error('Error setting up session middleware:', error);
  }

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Use dynamic host detection for callback URL to handle Replit's changing domains
  
  // Store detected host from first request
  let detectedHost: string | null = null;
  
  // Middleware to capture the actual host on first request
  app.use((req, res, next) => {
    if (!detectedHost && req.headers.host) {
      detectedHost = req.headers.host;
      console.log('🔔 Host dynamically detected:', detectedHost);
    }
    next();
  });
  
  // Create dynamic function to get callback URL based on detected host
  const getCallbackURL = (requestHost?: string) => {
    // Use requestHost, or detectedHost, or fallback to environment variables
    const host = requestHost || detectedHost || (process.env.REPL_SLUG 
      ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` 
      : 'localhost:5000');
    
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    // Store the detected URL in environment for the frontend to access
    process.env.DETECTED_CALLBACK_URL = `${protocol}://${host}/auth/linkedin/callback`;
    
    return process.env.DETECTED_CALLBACK_URL;
  };
  
  // Initial callback URL (will be updated on first request)
  let callbackURL = getCallbackURL();
  
  console.log('LinkedIn Strategy Configuration:');
  console.log('- Client ID:', process.env.LINKEDIN_CLIENT_ID ? '✓ Present' : '✗ Missing');
  console.log('- Client Secret:', process.env.LINKEDIN_CLIENT_SECRET ? '✓ Present' : '✗ Missing');
  console.log('- Callback URL:', callbackURL);
  
  // Configure LinkedIn strategy with proper callback URL and more robust error handling
  passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    callbackURL: callbackURL,
    scope: ['r_emailaddress', 'r_liteprofile'],
    // Explicitly setting auth type and response type
    authType: 'reauthenticate',
    state: true,
    proxy: true
  } as any, async (accessToken: string, refreshToken: string, profile: LinkedInProfile, done: (error: any, user?: any) => void) => {
    // Log the profile data for debugging
    console.log('LinkedIn profile received:', {
      id: profile.id,
      displayName: profile.displayName,
      hasEmails: !!profile.emails?.length,
      hasPhotos: !!profile.photos?.length
    });
    try {
      // Find existing user based on LinkedIn ID
      const existingUsers = await db.select().from(users).where(eq(users.linkedinId, profile.id));
      const existingUser = existingUsers.length > 0 ? existingUsers[0] : null;

      if (existingUser) {
        // Update user's access token
        await db.update(users)
          .set({ 
            accessToken,
            updatedAt: new Date()
          })
          .where(eq(users.id, existingUser.id));
          
        return done(null, existingUser);
      }

      // If user doesn't exist, create a new one
      const newUser = {
        linkedinId: profile.id,
        displayName: profile.displayName,
        email: profile.emails?.[0]?.value || "",
        profileUrl: profile.profileUrl || "",
        photoUrl: profile.photos?.[0]?.value || "",
        accessToken,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const validatedUser = insertUserSchema.parse(newUser);
      const [createdUser] = await db.insert(users).values(validatedUser).returning();
      
      return done(null, createdUser);
    } catch (error) {
      console.error("Authentication error:", error);
      return done(error as Error);
    }
  }));

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const userResults = await db.select().from(users).where(eq(users.id, id));
      const user = userResults.length > 0 ? userResults[0] : null;
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // LinkedIn auth routes with detailed logging
  app.get('/auth/linkedin', (req, res, next) => {
    console.log('LinkedIn auth route accessed with following details:');
    console.log('- Host:', req.headers.host);
    console.log('- Referrer:', req.headers.referer || 'none');
    console.log('- User-Agent:', req.headers['user-agent']);
    
    // Log any query parameters
    if (Object.keys(req.query).length > 0) {
      console.log('- Query params:', req.query);
    }
    
    // Test the LinkedIn credentials before authenticating
    if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
      console.error('LinkedIn credentials missing or invalid');
      return res.redirect('/login?error=missing_credentials');
    }
    
    // Update the callback URL based on the current request host
    if (req.headers.host && req.headers.host !== detectedHost) {
      detectedHost = req.headers.host;
      const newCallbackURL = getCallbackURL(detectedHost);
      console.log('🔄 Updating callback URL to match current request:', newCallbackURL);
      
      // Recreate LinkedIn strategy with updated callback URL
      // We need to access the strategy through passport internals
      // Use ts-ignore to bypass TypeScript's type checking for internal properties
      // @ts-ignore - Accessing private passport internals
      const linkedinStrategy = passport._strategies?.linkedin;
      
      if (linkedinStrategy) {
        // Create a new strategy with the updated callback URL
        passport.use(new LinkedInStrategy({
          clientID: process.env.LINKEDIN_CLIENT_ID || '',
          clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
          callbackURL: newCallbackURL,
          scope: ['r_emailaddress', 'r_liteprofile'],
          authType: 'reauthenticate',
          state: true,
          proxy: true
        } as any, linkedinStrategy._verify));
        
        console.log('✅ LinkedIn strategy updated with new callback URL');
      }
    }
    
    // Custom auth options to force new auth
    const authOptions = { 
      scope: ['r_emailaddress', 'r_liteprofile'],
      state: Math.random().toString(36).substring(2),
    };
    
    // Safely log current strategy's callback URL
    try {
      // @ts-ignore - Accessing private passport internals
      const callbackURL = passport._strategies?.linkedin?._oauth2?._callbackURL;
      console.log('🔍 Using callback URL:', callbackURL || 'Could not determine callback URL');
    } catch (error) {
      console.log('Could not access strategy callback URL');
    }
    
    passport.authenticate('linkedin', authOptions)(req, res, next);
  });

  app.get(
    '/auth/linkedin/callback',
    (req, res, next) => {
      console.log('LinkedIn callback route accessed with details:');
      console.log('- Host:', req.headers.host);
      console.log('- Query params:', req.query);
      console.log('- Error in query:', req.query.error || 'none');
      console.log('- Code in query:', req.query.code ? 'Present' : 'Missing');
      
      // Check for error in the query parameters (from LinkedIn)
      if (req.query.error) {
        console.error(`LinkedIn returned error: ${req.query.error}`);
        console.error(`Error description: ${req.query.error_description || 'No description'}`);
        return res.redirect(`/login?error=linkedin_error&description=${encodeURIComponent(req.query.error_description as string || '')}`);
      }
      
      // Check that we have an auth code from LinkedIn
      if (!req.query.code) {
        console.error('LinkedIn callback missing authorization code');
        return res.redirect('/login?error=missing_code');
      }
      
      // Handle authentication
      passport.authenticate('linkedin', { failureRedirect: '/login?error=auth_failed' }, (err: Error | null, user: any, info: { message: string } | undefined) => {
        console.log('LinkedIn authentication result:', { 
          error: err ? 'Yes' : 'No', 
          user: user ? 'Found' : 'Not found', 
          info: info || 'No info'
        });
        
        if (err) {
          console.error('LinkedIn auth error:', err);
          return res.redirect(`/login?error=auth_error&message=${encodeURIComponent(err.message)}`);
        }
        
        if (!user) {
          console.error('LinkedIn auth failed:', info);
          return res.redirect(`/login?error=auth_failed&message=${encodeURIComponent(info?.message || 'Unknown error')}`);
        }
        
        req.logIn(user, (err) => {
          if (err) {
            console.error('Login error:', err);
            return res.redirect(`/login?error=login_error&message=${encodeURIComponent(err.message)}`);
          }
          
          console.log('User successfully authenticated and logged in');
          return res.redirect('/');
        });
      })(req, res, next);
    }
  );

  // Logout route
  app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect('/login');
    });
  });

  // Current user route
  app.get('/api/me', (req, res) => {
    if (req.isAuthenticated()) {
      res.json({
        isAuthenticated: true,
        user: req.user
      });
    } else {
      res.json({
        isAuthenticated: false,
        user: null
      });
    }
  });
  
  // Add an endpoint for getting the exact callback URL that LinkedIn needs
  app.get('/api/linkedin-callback-url', (req, res) => {
    // Generate callback URL specifically for this request
    const host = req.headers.host || detectedHost;
    const protocol = (req.headers['x-forwarded-proto'] || req.protocol) as string;
    const callbackURL = `${protocol}://${host}/auth/linkedin/callback`;
    
    // Log and store it in environment
    console.log('LinkedIn callback URL requested:', callbackURL);
    process.env.DETECTED_CALLBACK_URL = callbackURL;
    
    // Return it to the client
    res.json({ callbackURL });
  });
}

// Middleware to ensure user is authenticated
export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  // Check if it's an API request
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(401).json({
      error: 'Unauthorized',
      redirectTo: '/login'
    });
  }
  
  // Redirect to login for regular requests
  res.redirect('/login');
}