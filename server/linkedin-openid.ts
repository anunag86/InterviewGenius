import { Express, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { users, insertUserSchema } from "../shared/schema";
import crypto from "crypto";
import { Session } from "express-session";

// Add LinkedIn properties to session
declare module "express-session" {
  interface SessionData {
    linkedinState?: string;
    linkedinRedirectUri?: string;
    linkedinAccessToken?: string;
  }
}

// Global variables for state management
declare global {
  var linkedInLastToken: {
    token: string | null;
    tokenType: string | null;
    params: any;
    timestamp: string | null;
  };
  
  // Store CSRF state tokens to prevent CSRF attacks
  var linkedInAuthStates: Record<string, {
    redirectUri: string;
    timestamp: number;
  }>;
}

// Initialize the global state store if not already initialized
if (!global.linkedInAuthStates) {
  global.linkedInAuthStates = {};
}

/**
 * LinkedIn Authentication
 * 
 * This module provides LinkedIn authentication using OpenID Connect
 * with a manual implementation to properly access the newer endpoints.
 * 
 * Follows LinkedIn's official OAuth2 + OpenID Connect flow:
 * https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
 */

// Initialize LinkedIn authentication
export async function setupLinkedInOpenID(app: Express, callbackURL: string) {
  console.log('⭐️⭐️⭐️ Setting up LinkedIn OpenID Connect authentication ⭐️⭐️⭐️');
  
  // Use the EXACT domain from our current deployment
  // This must match exactly what's registered in LinkedIn Developer Portal
  const hardcodedCallbackURL = 'https://d1c83042-9bf3-4c77-aac6-0e48ec45ead6-00-1ig9xnjl41ayf.picard.replit.dev/auth/linkedin/callback';
  
  console.log('Using HARDCODED callback URL:', hardcodedCallbackURL);
  console.log('NOTE: Dynamic callback URL detection is disabled to ensure consistency');
  
  // Store in multiple places to ensure consistency across all authentication steps
  process.env.LINKEDIN_REDIRECT_URI = hardcodedCallbackURL;
  app.locals.linkedInCallbackUrl = hardcodedCallbackURL;
  process.env.LINKEDIN_CALLBACK_URL = hardcodedCallbackURL;
  process.env.FIXED_LINKEDIN_CALLBACK_URL = hardcodedCallbackURL;
  
  // Return success - actual setup is handled in the routes
  return true;
}

// Routes for LinkedIn authentication
export function setupLinkedInRoutes(app: Express) {
  console.log('⭐️⭐️⭐️ Setting up LinkedIn OpenID Connect routes ⭐️⭐️⭐️');
  
  // Step 1: Initiate the authentication flow
  app.get('/auth/linkedin', (req, res) => {
    try {
      console.log('🔄 LinkedIn OpenID Connect authentication initiated');
      
      // HARDCODED: This must match what's registered in LinkedIn Developer Portal
      // NOTE: We are NOT using ANY dynamic logic or environment variables here
      const fixedCallbackURL = 'https://d1c83042-9bf3-4c77-aac6-0e48ec45ead6-00-1ig9xnjl41ayf.picard.replit.dev/auth/linkedin/callback';
      
      console.log('- Using EXACT callback URL:', fixedCallbackURL);
      console.log('- Callback URL must match what is registered in LinkedIn Developer Portal');
      
      // Generate CSRF state token to prevent CSRF attacks
      const state = crypto.randomBytes(16).toString('hex');
      
      // Store the state and fixed callback URL in session
      if (req.session) {
        req.session.linkedinState = state;
        req.session.linkedinRedirectUri = fixedCallbackURL;
      } else {
        console.error('Session not available');
        return res.redirect('/login?error=session_not_available');
      }
      
      // Redirect to LinkedIn authorization endpoint with recommended parameters
      const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('client_id', process.env.LINKEDIN_CLIENT_ID || '');
      authUrl.searchParams.append('redirect_uri', fixedCallbackURL);
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('scope', 'openid profile email');
      
      console.log('- Redirecting to LinkedIn authorization URL');
      res.redirect(authUrl.toString());
    } catch (error: any) {
      console.error('❌ LinkedIn auth error:', error);
      res.redirect('/login?error=auth_error');
    }
  });
  
  // Step 2: Handle the callback from LinkedIn with auth code
  app.get('/auth/linkedin/callback', async (req, res) => {
    try {
      console.log('🔄 LinkedIn callback received');
      console.log('- Query params:', req.query);
      
      // Check for error from LinkedIn
      if (req.query.error) {
        console.error(`LinkedIn returned error: ${req.query.error}`);
        console.error(`Error description: ${req.query.error_description || 'No description'}`);
        return res.redirect(`/login?error=linkedin_error&description=${encodeURIComponent(req.query.error_description as string || '')}`);
      }
      
      // Extract the authorization code and state
      const code = req.query.code as string;
      const state = req.query.state as string;
      
      // Verify state token to prevent CSRF attacks
      if (!state || !req.session || state !== req.session.linkedinState) {
        console.error('Invalid or expired state token');
        return res.redirect('/login?error=invalid_state');
      }
      
      if (!code) {
        console.error('No authorization code received from LinkedIn');
        return res.redirect('/login?error=no_code');
      }
      
      console.log('1️⃣ Exchanging authorization code for token');
      
      // Step 3: Exchange the code for an access token
      // HARDCODED - CRITICAL: The same callback URL must be used in both auth and token exchange steps
      const hardcodedCallbackUrl = 'https://d1c83042-9bf3-4c77-aac6-0e48ec45ead6-00-1ig9xnjl41ayf.picard.replit.dev/auth/linkedin/callback';
      
      console.log('📍 Using HARDCODED callback URL for token exchange:', hardcodedCallbackUrl);
      console.log('⚠️ This MUST match exactly with authorization request callback and LinkedIn Developer Portal');
      
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append('redirect_uri', hardcodedCallbackUrl);
      params.append('client_id', process.env.LINKEDIN_CLIENT_ID || '');
      params.append('client_secret', process.env.LINKEDIN_CLIENT_SECRET || '');
      
      const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      
      // Parse token data
      const tokenData = await tokenRes.json();
      console.log('🎟 Token data:', tokenData);
      
      if (!tokenData.access_token) {
        return res.status(401).send("❌ Failed to get access token");
      }
      
      // Store the token for debugging and in session
      global.linkedInLastToken = {
        token: tokenData.access_token,
        tokenType: 'Bearer',
        params: tokenData,
        timestamp: new Date().toISOString()
      };
      
      if (req.session) {
        req.session.linkedinAccessToken = tokenData.access_token;
      }
      
      console.log('✅ Access token received (masked):', 
        tokenData.access_token ? 
          `${tokenData.access_token.substring(0, 5)}...${tokenData.access_token.substring(tokenData.access_token.length - 5)}` : 
          'MISSING');
      
      console.log('2️⃣ Fetching user profile from userinfo endpoint');
      
      // Step 4: Fetch user info
      const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      });
      
      if (!userRes.ok) {
        console.error('❌ LinkedIn userinfo failed:', await userRes.text());
        return res.status(403).send("❌ Could not fetch user profile");
      }
      
      // Parse user profile
      const userInfo = await userRes.json();
      console.log('✅ LinkedIn user:', userInfo);
      
      // Step 5: Find or create user in our database
      const existingUsers = await db.select().from(users).where(eq(users.linkedinId, userInfo.sub));
      const existingUser = existingUsers.length > 0 ? existingUsers[0] : null;
      
      let user;
      
      if (existingUser) {
        // Update existing user (no need to update anything for our simplified schema)
        user = existingUser;
        console.log('👤 Using existing user:', existingUser.id);
      } else {
        // Create a new user
        const newUser = {
          linkedinId: userInfo.sub,
          username: userInfo.name || userInfo.given_name + ' ' + userInfo.family_name || "linkedin_user",
          password: tokenData.access_token.substring(0, 10) // Use part of the token as password
        };
        
        const validatedUser = insertUserSchema.parse(newUser);
        const [createdUser] = await db.insert(users).values(validatedUser).returning();
        
        user = createdUser;
        console.log('👤 Created new user:', createdUser.id);
      }
      
      // Step 6: Log in the user (set up session)
      req.login(user, (err) => {
        if (err) {
          console.error('Failed to log in user:', err);
          return res.redirect('/login?error=login_failed');
        }
        
        // Success! Redirect to home page
        return res.redirect('/');
      });
    } catch (error: any) {
      console.error('❌ LinkedIn callback error:', error);
      res.redirect('/login?error=callback_error');
    }
  });
  
  // Diagnostics endpoint to show current LinkedIn token info
  app.get('/api/auth/linkedin/latest-token', (req, res) => {
    // Check if we have token in session
    const accessToken = req.session?.linkedinAccessToken;
    
    if (!accessToken) {
      return res.json({
        success: false,
        message: 'No LinkedIn token has been recorded yet. Try logging in first.'
      });
    }
    
    // Return the token with masked values for security
    return res.json({
      success: true,
      token: {
        masked: accessToken ? `${accessToken.substring(0, 5)}...${accessToken.substring(accessToken.length - 5)}` : null,
        length: accessToken ? accessToken.length : 0,
      },
      message: 'Last LinkedIn token information'
    });
  });
  
  // Test endpoint to manually check a token against LinkedIn's userinfo endpoint
  app.get('/api/auth/linkedin/test-token', async (req, res) => {
    // Check if token is provided in query parameter or session
    const accessToken = (req.query.token as string) || req.session?.linkedinAccessToken;
    
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'No token provided. Add ?token=your_access_token to test or login first.'
      });
    }
    
    console.log('Testing LinkedIn token manually with userinfo endpoint...');
    
    try {
      // Make a request to the LinkedIn userinfo endpoint
      const response = await fetch('https://api.linkedin.com/v2/userinfo', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      // Log response status
      console.log('LinkedIn API test status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('LinkedIn userinfo failed:', errorText);
        return res.status(response.status).json({
          success: false,
          error: errorText,
          message: 'Failed to fetch user profile'
        });
      }
      
      // Parse user info
      const userInfo = await response.json();
      
      // Return result
      return res.json({
        success: true,
        user: userInfo
      });
    } catch (error: any) {
      console.error('Error testing LinkedIn token:', error);
      return res.status(500).json({
        success: false,
        error: error?.toString() || 'Unknown error',
        message: 'Failed to test LinkedIn token due to an unexpected error'
      });
    }
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