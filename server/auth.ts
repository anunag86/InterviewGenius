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
  passport.use('linkedin', new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    callbackURL: callbackURL,
    scope: ['r_emailaddress', 'r_liteprofile'],
    profileFields: ['id', 'first-name', 'last-name', 'email-address', 'profile-picture'],
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
    
    // Log key information (just length/format, not the actual key values)
    const clientId = process.env.LINKEDIN_CLIENT_ID || '';
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';
    
    console.log('LinkedIn credentials check:');
    console.log('- Client ID length:', clientId.length, 'format:', clientId.substring(0, 2) + '...' + clientId.substring(clientId.length - 2));
    console.log('- Client Secret length:', clientSecret.length, 'format:', clientSecret.substring(0, 2) + '...' + clientSecret.substring(clientSecret.length - 2));
    
    // Create a test OAuth URL (don't include the full keys in logs)
    const testCallbackUrl = `${req.protocol}://${req.headers.host}/auth/linkedin/callback`;
    console.log('- Test callback URL:', testCallbackUrl);
    
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
        passport.use('linkedin', new LinkedInStrategy({
          clientID: process.env.LINKEDIN_CLIENT_ID || '',
          clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
          callbackURL: newCallbackURL,
          scope: ['r_emailaddress', 'r_liteprofile'],
          profileFields: ['id', 'first-name', 'last-name', 'email-address', 'profile-picture'],
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
  
  // Add a diagnostic endpoint for LinkedIn OAuth
  app.get('/api/linkedin-diagnostic', async (req, res) => {
    try {
      // Log LinkedIn API key information (safely)
      const clientId = process.env.LINKEDIN_CLIENT_ID || '';
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';
      const partialClientId = clientId.length > 4 ? 
        clientId.substring(0, 2) + '...' + clientId.substring(clientId.length - 2) : 
        'invalid';
        
      // Test if the LinkedIn credentials are valid by making a request directly to LinkedIn
      let credentialsValid = false;
      let linkedinAuthUrl = '';
      let linkedinStatusCode = 0;
      
      try {
        // Make a simple request to LinkedIn's API to verify the credentials
        const testHost = req.headers.host || detectedHost || 'unknown-host';
        const testCallbackURL = `https://${testHost}/auth/linkedin/callback`;
        const testState = 'test_state_123456';
        
        // Construct the authorization URL
        const authURL = `https://www.linkedin.com/oauth/v2/authorization?`
          + `response_type=code`
          + `&client_id=${encodeURIComponent(clientId)}`
          + `&redirect_uri=${encodeURIComponent(testCallbackURL)}`
          + `&state=${encodeURIComponent(testState)}`
          + `&scope=r_emailaddress,r_liteprofile`;
          
        linkedinAuthUrl = authURL;
          
        // Make a HEAD request to check if the URL is valid
        try {
          const https = require('https');
          const testURL = new URL(authURL);
          
          await new Promise((resolve, reject) => {
            const reqOptions = {
              method: 'HEAD',
              hostname: testURL.hostname,
              path: testURL.pathname + testURL.search,
              headers: {
                'User-Agent': 'Mozilla/5.0 PrepTalk App'
              }
            };
            
            const req = https.request(reqOptions, (response: any) => {
              // LinkedIn should redirect or return something other than 400/401 if credentials are valid
              credentialsValid = response.statusCode < 400 || response.statusCode === 302;
              linkedinStatusCode = response.statusCode;
              console.log(`LinkedIn auth URL test status: ${response.statusCode}`);
              resolve(true);
            });
            
            req.on('error', (err: any) => {
              console.error('Error testing LinkedIn auth URL:', err);
              reject(err);
            });
            
            req.end();
          });
        } catch (testError) {
          console.error('Failed to validate LinkedIn credentials:', testError);
        }
      } catch (validationError) {
        console.error('Error during LinkedIn credential validation:', validationError);
      }
      
      // Fetch internal strategy information
      // @ts-ignore - Accessing private passport internals
      const strategy = passport._strategies?.linkedin;
      const hasStrategy = !!strategy;
      
      // Get callback URL from strategy if available
      let callbackURL = null;
      try {
        // @ts-ignore - Accessing private passport internals
        callbackURL = strategy?._oauth2?._callbackURL;
      } catch (e) {
        // Ignore errors
      }
      
      // Generate a test OAuth URL (for debugging purposes only)
      const host = req.headers.host || detectedHost || 'unknown-host';
      const protocol = (req.headers['x-forwarded-proto'] || req.protocol) as string;
      const expectedCallbackURL = `${protocol}://${host}/auth/linkedin/callback`;
      
      // Create response with diagnostic info
      const diagnosticInfo = {
        clientIdStatus: clientId ? 'present' : 'missing',
        clientIdLength: clientId.length,
        clientIdPartial: partialClientId,
        clientSecretStatus: clientSecret ? 'present' : 'missing',
        clientSecretLength: clientSecret.length,
        strategyConfigured: hasStrategy,
        callbackConfigured: !!callbackURL,
        callbackURL: callbackURL || 'not available',
        expectedCallbackURL,
        detectedHost: detectedHost || 'none',
        linkedInTest: {
          urlTested: linkedinAuthUrl ? 'yes' : 'no',
          credentialsValid,
          statusCode: linkedinStatusCode,
          authUrlFormat: linkedinAuthUrl ? linkedinAuthUrl.substring(0, 60) + '...' : 'not tested',
        }
      };
      
      // Return diagnostic info
      return res.json({
        status: 'success',
        message: 'LinkedIn OAuth diagnostic completed',
        data: diagnosticInfo
      });
    } catch (error) {
      console.error('Error in LinkedIn diagnostic:', error);
      return res.status(500).json({
        status: 'error',
        message: 'LinkedIn OAuth diagnostic failed',
        error: String(error)
      });
    }
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