import { Express, Request, Response, NextFunction } from "express";
import passport from "passport";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { users, insertUserSchema } from "../shared/schema";
import crypto from "crypto";
import { URLSearchParams } from "url";

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
  console.log('Using callback URL:', callbackURL);
  
  // Store the callback URL for later use
  app.locals.linkedInCallbackUrl = callbackURL;
  
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
      
      // Get the callback URL
      const callbackUrl = app.locals.linkedInCallbackUrl;
      console.log('- Using callback URL:', callbackUrl);
      
      // Generate CSRF state token to prevent CSRF attacks
      const state = crypto.randomBytes(16).toString('hex');
      
      // Store the state with timestamp for verification
      global.linkedInAuthStates[state] = {
        redirectUri: callbackUrl,
        timestamp: Date.now()
      };
      
      // Cleanup old state tokens (older than 1 hour)
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      Object.keys(global.linkedInAuthStates).forEach(key => {
        if (global.linkedInAuthStates[key].timestamp < oneHourAgo) {
          delete global.linkedInAuthStates[key];
        }
      });
      
      // Redirect to LinkedIn authorization endpoint
      const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('client_id', process.env.LINKEDIN_CLIENT_ID || '');
      authUrl.searchParams.append('redirect_uri', callbackUrl);
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('scope', 'openid profile email');
      
      console.log('- Redirecting to LinkedIn authorization URL');
      res.redirect(authUrl.toString());
    } catch (error) {
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
      if (!state || !global.linkedInAuthStates[state]) {
        console.error('Invalid or expired state token');
        return res.redirect('/login?error=invalid_state');
      }
      
      // Get the matching redirect URI from state store
      const storedState = global.linkedInAuthStates[state];
      const redirectUri = storedState.redirectUri;
      
      // Clean up the used state
      delete global.linkedInAuthStates[state];
      
      if (!code) {
        console.error('No authorization code received from LinkedIn');
        return res.redirect('/login?error=no_code');
      }
      
      console.log('1️⃣ Exchanging authorization code for token');
      
      // Step 3: Exchange the code for an access token
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append('redirect_uri', redirectUri);
      params.append('client_id', process.env.LINKEDIN_CLIENT_ID || '');
      params.append('client_secret', process.env.LINKEDIN_CLIENT_SECRET || '');
      
      const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });
      
      // Verify token response
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Failed to exchange code for token:', tokenResponse.status, errorText);
        return res.redirect('/login?error=token_exchange_failed');
      }
      
      // Parse token data
      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;
      
      // Store the token for debugging
      global.linkedInLastToken = {
        token: accessToken,
        tokenType: 'Bearer',
        params: tokenData,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Access token received (masked):', 
        accessToken ? 
          `${accessToken.substring(0, 5)}...${accessToken.substring(accessToken.length - 5)}` : 
          'MISSING');
      
      console.log('2️⃣ Fetching user profile from userinfo endpoint');
      
      // Step 4: Fetch the user profile using the OpenID userinfo endpoint
      const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      // Verify profile response
      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        console.error('Failed to fetch user profile:', profileResponse.status, errorText);
        return res.redirect('/login?error=profile_fetch_failed');
      }
      
      // Parse user profile
      const userProfile = await profileResponse.json();
      
      console.log('✅ User profile received:', {
        sub: userProfile.sub,
        name: userProfile.name,
        email: userProfile.email || 'none'
      });
      
      // Step 5: Find or create user in our database
      const existingUsers = await db.select().from(users).where(eq(users.linkedinId, userProfile.sub));
      const existingUser = existingUsers.length > 0 ? existingUsers[0] : null;
      
      let user;
      
      if (existingUser) {
        // Update existing user with latest token
        await db.update(users)
          .set({ 
            accessToken: accessToken,
            updatedAt: new Date()
          })
          .where(eq(users.id, existingUser.id));
        
        user = existingUser;
        console.log('👤 Updated existing user:', existingUser.id);
      } else {
        // Create a new user
        const newUser = {
          linkedinId: userProfile.sub,
          displayName: userProfile.name || userProfile.given_name + ' ' + userProfile.family_name,
          email: userProfile.email || "",
          photoUrl: userProfile.picture || "",
          profileUrl: "",
          accessToken: accessToken,
          createdAt: new Date(),
          updatedAt: new Date()
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
    } catch (error) {
      console.error('❌ LinkedIn callback error:', error);
      res.redirect('/login?error=callback_error');
    }
  });
  
  // Diagnostics endpoint to show current LinkedIn token info
  app.get('/api/auth/linkedin/latest-token', (req, res) => {
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
  
  // Test endpoint to manually check a token against LinkedIn's userinfo endpoint
  app.get('/api/auth/linkedin/test-token', async (req, res) => {
    // Check if token is provided in query parameter
    const accessToken = req.query.token as string;
    
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'No token provided. Add ?token=your_access_token to test.'
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
      
      // Get response body
      const responseText = await response.text();
      let responseData;
      
      try {
        // Try to parse as JSON if possible
        responseData = JSON.parse(responseText);
      } catch (e) {
        // If not JSON, use the raw text
        responseData = responseText;
      }
      
      // Return result
      return res.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        response: responseData
      });
    } catch (error) {
      console.error('Error testing LinkedIn token:', error);
      return res.status(500).json({
        success: false,
        error: error.toString(),
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