import { Express, Request, Response, NextFunction } from "express";
import passport from "passport";
import session from "express-session";
import { db } from "../db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import connectPgSimple from "connect-pg-simple";
import { pool } from "../db";
import crypto from "crypto";

// Global variable to store callback URL
let detectedHost: string | null = null;

/**
 * Configure authentication for the application
 * 
 * This function sets up passport, session, and LinkedIn authentication
 * LinkedIn authentication is now handled in linkedin-openid.ts
 */
export function configureAuth(app: Express) {
  // Session middleware is initialized in server/index.ts before this function is called
  console.log('Configuring passport authentication (session is already initialized)');
  
  try {
    // Verify that session middleware is properly set up
    const sessionEnabled = app._router.stack.some((layer: any) => 
      layer.name === 'session' || 
      (layer.handle && layer.handle.name === 'session')
    );
    
    if (!sessionEnabled) {
      console.error('WARNING: Session middleware does not appear to be initialized!');
      console.error('This will cause authorization state verification to fail.');
    } else {
      console.log('✅ Session middleware verified in middleware stack');
    }
  } catch (error) {
    console.error('Error verifying session middleware:', error);
  }

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Try to detect the host from environment variables first
  if (process.env.REPLIT_CLUSTER) {
    // This is a Replit environment
    const replitDomain = `${process.env.REPLIT_CLUSTER}.replit.dev`;
    detectedHost = replitDomain;
    console.log('🔔 Host pre-detected from Replit environment:', detectedHost);
  }
  
  // Middleware to capture the actual host on first request
  app.use((req, res, next) => {
    if (req.headers.host) {
      // Always update the host with the most current value
      detectedHost = req.headers.host;
      console.log('🔔 Host dynamically detected from request:', detectedHost);
    }
    next();
  });
  
  // Create dynamic function to get callback URL based on detected host
  const getCallbackURL = (requestHost?: string) => {
    // Use requestHost, or detectedHost, or fallback to automatically detected Replit domain
    const host = requestHost || detectedHost;
    
    // If we don't have a host yet, don't generate a callback URL
    // We'll wait for the first request to set it properly
    if (!host) {
      console.log('⚠️ No host detected yet, waiting for first request to set callback URL');
      return 'placeholder-will-be-updated-on-first-request';
    }
    
    // Always use HTTPS for replit domains, HTTP only for localhost
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    // Store the detected URL in environment for the frontend to access
    const url = `${protocol}://${host}/auth/linkedin/callback`;
    
    // Store in environment for other parts of the application
    process.env.DETECTED_CALLBACK_URL = url;
    
    return url;
  };

  // Configure LinkedIn strategy - now handled in linkedin-openid.ts
  console.log('LinkedIn Strategy Configuration:');
  console.log('- Client ID:', process.env.LINKEDIN_CLIENT_ID ? '✓ Present' : '✗ Missing');
  console.log('- Client Secret:', process.env.LINKEDIN_CLIENT_SECRET ? '✓ Present' : '✗ Missing');
  
  // Using the OpenID Connect approach for LinkedIn auth
  console.log('🔄 Setting up LinkedIn authentication...');
  console.log('ℹ️ Note: We are using the linkedin-openid.ts implementation which properly implements OpenID Connect');

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

  // Note: LinkedIn auth routes are now handled by linkedin-openid.ts
  console.log('LinkedIn auth routes have been moved to linkedin-openid.ts');
}

// Export the getCallbackURL function for use in other modules
export function getDetectedCallbackURL(): string {
  // Generate a callback URL based on the current detected host
  const url = detectedHost ? `https://${detectedHost}/auth/linkedin/callback` : '';
  return url;
}

// Auth checking middleware
export function ensureAuthenticatedLegacy(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  // User is not authenticated, return 401 Unauthorized
  res.status(401).json({
    isAuthenticated: false,
    message: "Authentication required",
    redirectTo: "/login"
  });
}