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

  // Get the hostname for proper callback URL
  const getHostName = () => {
    // Try to get the hostname from environment variables (for production)
    const replitDomain = process.env.REPL_SLUG 
      ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` 
      : null;
    
    // Use the replit domain if available, otherwise fallback to localhost
    return replitDomain || 'localhost:5000';
  };
  
  // Create full callback URL to match LinkedIn settings
  const host = getHostName();
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const callbackURL = `${protocol}://${host}/auth/linkedin/callback`;
  
  console.log('LinkedIn Strategy Configuration:');
  console.log('- Client ID:', process.env.LINKEDIN_CLIENT_ID ? '✓ Present' : '✗ Missing');
  console.log('- Client Secret:', process.env.LINKEDIN_CLIENT_SECRET ? '✓ Present' : '✗ Missing');
  console.log('- Callback URL:', callbackURL);
  
  // Configure LinkedIn strategy with proper callback URL
  passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    callbackURL: callbackURL,
    scope: ['r_emailaddress', 'r_liteprofile'],
    // Set state parameter for CSRF protection and allow proxies for Replit deployment
    state: true,
    proxy: true
  } as any, async (accessToken: string, refreshToken: string, profile: LinkedInProfile, done: (error: any, user?: any) => void) => {
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
    console.log('LinkedIn auth route accessed');
    passport.authenticate('linkedin')(req, res, next);
  });

  app.get(
    '/auth/linkedin/callback',
    (req, res, next) => {
      console.log('LinkedIn callback route accessed', {
        query: req.query,
        params: req.params,
        headers: req.headers['host']
      });
      
      passport.authenticate('linkedin', (err: Error | null, user: any, info: { message: string } | undefined) => {
        console.log('LinkedIn authentication result:', { 
          error: err ? 'Yes' : 'No', 
          user: user ? 'Found' : 'Not found', 
          info: info || 'No info'
        });
        
        if (err) {
          console.error('LinkedIn auth error:', err);
          return res.redirect('/login?error=auth_error');
        }
        
        if (!user) {
          console.error('LinkedIn auth failed:', info);
          return res.redirect('/login?error=auth_failed');
        }
        
        req.logIn(user, (err) => {
          if (err) {
            console.error('Login error:', err);
            return res.redirect('/login?error=login_error');
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