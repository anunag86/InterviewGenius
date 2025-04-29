import { Express, Request, Response, NextFunction } from "express";
import passport from "passport";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { users, insertUserSchema } from "../shared/schema";

// Import LinkedIn strategy
import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";

// Global variable to store the last token (for debugging)
declare global {
  var linkedInLastToken: {
    token: string | null;
    tokenType: string | null;
    params: any;
    timestamp: string | null;
  };
}

/**
 * LinkedIn Authentication
 * 
 * This module provides LinkedIn authentication using passport-linkedin-oauth2.
 * 
 * For reference see: https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
 */

// Initialize LinkedIn authentication
export async function setupLinkedInOpenID(app: Express, callbackURL: string) {
  console.log('⭐️⭐️⭐️ Setting up LinkedIn OAuth2 authentication ⭐️⭐️⭐️');
  
  try {
    // Configure LinkedIn Strategy
    console.log('1️⃣ Setting up LinkedIn Strategy with callback URL:', callbackURL);
    
    // Set up the LinkedIn OAuth2 strategy
    passport.use('linkedin', new LinkedInStrategy({
      clientID: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      callbackURL: callbackURL,
      scope: ['r_emailaddress', 'r_liteprofile'],
      state: true,
      passReqToCallback: true
    }, async (req: Request, accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        // Store the token for debugging
        global.linkedInLastToken = {
          token: accessToken,
          tokenType: 'Bearer',
          params: { refreshToken, profile: JSON.stringify(profile) },
          timestamp: new Date().toISOString()
        };
        
        console.log('🎉 LinkedIn OAuth2 authentication successful!');
        console.log('- Access token received (masked):', 
          accessToken ? 
            `${accessToken.substring(0, 5)}...${accessToken.substring(accessToken.length - 5)}` : 
            'MISSING');
        
        console.log('- User profile received:', {
          id: profile.id,
          name: profile.displayName,
          email: profile.emails?.[0]?.value || 'none'
        });
        
        // Find or create the user
        const existingUsers = await db.select().from(users).where(eq(users.linkedinId, profile.id));
        const existingUser = existingUsers.length > 0 ? existingUsers[0] : null;
        
        if (existingUser) {
          // Update user's token information
          await db.update(users)
            .set({ 
              accessToken: accessToken,
              updatedAt: new Date()
            })
            .where(eq(users.id, existingUser.id));
            
          return done(null, existingUser);
        }
        
        // Create a new user if not found
        const newUser = {
          linkedinId: profile.id,
          displayName: profile.displayName,
          email: profile.emails?.[0]?.value || "",
          photoUrl: profile.photos?.[0]?.value || "",
          profileUrl: profile.profileUrl || "",
          accessToken: accessToken,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const validatedUser = insertUserSchema.parse(newUser);
        const [createdUser] = await db.insert(users).values(validatedUser).returning();
        
        return done(null, createdUser);
      } catch (error) {
        console.error('❌ LinkedIn OAuth2 authentication error:', error);
        return done(error);
      }
    }));
    
    console.log('✅ LinkedIn OAuth2 authentication setup complete!');
    return true;
  } catch (error) {
    console.error('❌ Failed to set up LinkedIn OAuth2:', error);
    return false;
  }
}

// Routes for LinkedIn authentication
export function setupLinkedInRoutes(app: Express) {
  console.log('⭐️⭐️⭐️ Setting up LinkedIn OAuth2 routes ⭐️⭐️⭐️');
  
  // Authentication route
  app.get('/auth/linkedin', (req, res, next) => {
    console.log('🔄 LinkedIn OAuth2 authentication initiated');
    console.log('- Request host:', req.headers.host);
    
    // Start the authentication process
    passport.authenticate('linkedin')(req, res, next);
  });
  
  // Callback route
  app.get('/auth/linkedin/callback', (req, res, next) => {
    console.log('🔄 LinkedIn OAuth2 callback hit');
    console.log('- Query params:', req.query);
    
    // Check for error from LinkedIn
    if (req.query.error) {
      console.error(`LinkedIn returned error: ${req.query.error}`);
      console.error(`Error description: ${req.query.error_description || 'No description'}`);
      return res.redirect(`/login?error=linkedin_error&description=${encodeURIComponent(req.query.error_description as string || '')}`);
    }
    
    // Process the callback
    passport.authenticate('linkedin', {
      failureRedirect: '/login?error=auth_failed',
      successRedirect: '/',
    })(req, res, next);
  });
  
  // Diagnostics routes (moved from routes.ts for consistency)
  
  // Get the most recent LinkedIn token (for debugging only)
  app.get('/api/auth/linkedin/latest-token', async (req, res) => {
    // Check if we have global token storage
    const lastToken = global.linkedInLastToken || { 
      token: null, 
      tokenType: null, 
      params: null, 
      timestamp: null 
    };
    
    if (!lastToken.token) {
      return res.json({
        success: false,
        message: 'No LinkedIn token has been recorded yet. Try logging in first.'
      });
    }
    
    // Return the token with masked values for security
    return res.json({
      success: true,
      token: {
        masked: lastToken.token ? `${lastToken.token.substring(0, 5)}...${lastToken.token.substring(lastToken.token.length - 5)}` : null,
        tokenType: lastToken.tokenType,
        length: lastToken.token ? lastToken.token.length : 0,
        receivedAt: lastToken.timestamp,
      },
      message: 'Last LinkedIn token information'
    });
  });
}

// Ensure authenticated middleware
export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({
    isAuthenticated: false,
    message: "Authentication required",
    redirectTo: "/login"
  });
}