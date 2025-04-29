import { Express, Request, Response, NextFunction } from "express";
import passport from "passport";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { users, insertUserSchema } from "../shared/schema";
import { Issuer, Strategy, generators, TokenSet, Client } from "openid-client";

// Define UserInfoResponse type
interface UserInfoResponse {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  picture?: string;
  [key: string]: any;
}

/**
 * LinkedIn Authentication using OpenID Connect
 * 
 * This is an implementation of the LinkedIn login flow using OpenID Connect
 * as recommended by LinkedIn to replace the deprecated passport-linkedin-oauth2 strategy.
 * 
 * For reference see: https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
 */

// Convert OpenID UserInfo to our application's user profile format
function oidcToProfile(userInfo: UserInfoResponse) {
  return {
    id: userInfo.sub,
    displayName: userInfo.name || `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim(),
    emails: userInfo.email ? [{ value: userInfo.email }] : undefined,
    photos: userInfo.picture ? [{ value: userInfo.picture }] : undefined,
    profileUrl: undefined
  };
}

// Initialize LinkedIn OpenID authentication
export async function setupLinkedInOpenID(app: Express, callbackURL: string) {
  console.log('⭐️⭐️⭐️ Setting up LinkedIn OpenID Connect authentication ⭐️⭐️⭐️');
  
  try {
    // Step 1: Discover LinkedIn's OpenID Connect configuration
    console.log('1️⃣ Discovering LinkedIn OpenID Connect configuration...');
    const issuer = await Issuer.discover('https://www.linkedin.com');
    console.log('✅ OpenID Connect issuer discovered:', issuer.metadata.issuer);
    
    // Step 2: Create the OpenID Client
    console.log('2️⃣ Creating OpenID Client with callback URL:', callbackURL);
    const client = new issuer.Client({
      client_id: process.env.LINKEDIN_CLIENT_ID || '',
      client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
      redirect_uris: [callbackURL],
      response_types: ['code'],
    });
    
    // Step 3: Register the OpenID Strategy with Passport
    console.log('3️⃣ Registering OpenID Connect strategy with Passport');
    passport.use('linkedin-oidc', new Strategy(
      {
        client,
        params: {
          scope: 'openid profile email',
        },
        passReqToCallback: true,
        usePKCE: false, // LinkedIn doesn't support PKCE yet
      },
      async (req, tokenSet, userinfo, done) => {
        try {
          // Store the token for debugging
          global.linkedInLastToken = {
            token: tokenSet.access_token,
            tokenType: 'Bearer',
            params: tokenSet,
            timestamp: new Date().toISOString()
          };
          
          console.log('🎉 LinkedIn OpenID Connect authentication successful!');
          console.log('- Access token received (masked):', 
            tokenSet.access_token ? 
              `${tokenSet.access_token.substring(0, 5)}...${tokenSet.access_token.substring(tokenSet.access_token.length - 5)}` : 
              'MISSING');
          console.log('- Token expires in:', tokenSet.expires_in, 'seconds');
          
          // Convert the OpenID profile to our application user profile
          const profile = oidcToProfile(userinfo as UserInfoResponse);
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
                accessToken: tokenSet.access_token,
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
            accessToken: tokenSet.access_token,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          const validatedUser = insertUserSchema.parse(newUser);
          const [createdUser] = await db.insert(users).values(validatedUser).returning();
          
          return done(null, createdUser);
        } catch (error) {
          console.error('❌ LinkedIn OpenID Connect authentication error:', error);
          return done(error);
        }
      }
    ));
    
    console.log('✅ LinkedIn OpenID Connect authentication setup complete!');
    return true;
  } catch (error) {
    console.error('❌ Failed to set up LinkedIn OpenID Connect:', error);
    return false;
  }
}

// Routes for LinkedIn authentication
export function setupLinkedInRoutes(app: Express) {
  console.log('⭐️⭐️⭐️ Setting up LinkedIn OpenID Connect routes ⭐️⭐️⭐️');
  
  // Authentication route
  app.get('/auth/linkedin/oidc', (req, res, next) => {
    console.log('🔄 LinkedIn OpenID Connect authentication initiated');
    console.log('- Request host:', req.headers.host);
    
    // Start the authentication process
    passport.authenticate('linkedin-oidc', {
      prompt: 'consent',
    })(req, res, next);
  });
  
  // Callback route
  app.get('/auth/linkedin/callback/oidc', (req, res, next) => {
    console.log('🔄 LinkedIn OpenID Connect callback hit');
    console.log('- Query params:', req.query);
    
    // Check for error from LinkedIn
    if (req.query.error) {
      console.error(`LinkedIn returned error: ${req.query.error}`);
      console.error(`Error description: ${req.query.error_description || 'No description'}`);
      return res.redirect(`/login?error=linkedin_error&description=${encodeURIComponent(req.query.error_description as string || '')}`);
    }
    
    // Process the callback
    passport.authenticate('linkedin-oidc', {
      failureRedirect: '/login?error=auth_failed',
      successRedirect: '/',
    })(req, res, next);
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