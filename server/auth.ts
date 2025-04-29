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

  // Initialize session middleware
  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: 'session' // This table will be created automatically
      }),
      secret: process.env.SESSION_SECRET || 'preptalk-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      }
    })
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure LinkedIn strategy
  passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    callbackURL: "/auth/linkedin/callback",
    scope: ['r_emailaddress', 'r_liteprofile']
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

  // LinkedIn auth routes
  app.get('/auth/linkedin', passport.authenticate('linkedin'));

  app.get(
    '/auth/linkedin/callback',
    passport.authenticate('linkedin', {
      successRedirect: '/',
      failureRedirect: '/login'
    })
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