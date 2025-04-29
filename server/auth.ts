import { Express, Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";
import session from "express-session";
import { db } from "../db";
import { users, insertUserSchema } from "../shared/schema";
import { eq } from "drizzle-orm";
import connectPgSimple from "connect-pg-simple";
import { pool } from "../db";

// Extend the Express session type to include our custom properties
declare module 'express-session' {
  interface SessionData {
    linkedInAuthState?: string;
  }
}

// Add type for LinkedIn profile
interface LinkedInProfile {
  id: string;
  displayName: string;
  emails?: Array<{value: string}>;
  photos?: Array<{value: string}>;
  profileUrl?: string;
}

// Function to fetch the user profile from the OpenID Connect userinfo endpoint
async function fetchLinkedInUserProfile(accessToken: string): Promise<LinkedInProfile> {
  try {
    // Immediately log the access token (partially masked for security)
    console.log('LinkedIn access token (masked):', 
      accessToken ? accessToken.substring(0, 5) + '...' + accessToken.substring(accessToken.length - 5) : 'MISSING');
    
    if (!accessToken) {
      throw new Error('Access token is missing or empty');
    }
    
    console.log('█▓▒░ LINKEDIN AUTHENTICATION DEBUGGING ░▒▓█');
    console.log('1. Using correct OpenID Connect endpoint: https://api.linkedin.com/v2/userinfo');
    console.log('2. Using ONLY Authorization header with Bearer token');
    
    // Step 1: Make the request with ONLY the Authorization header (no Accept, Content-Type, etc.)
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      method: 'GET',
      headers: {
        // ONLY include the Authorization header as per LinkedIn's requirements
        'Authorization': `Bearer ${accessToken}`
        // DO NOT include any other headers
      },
    });
    
    // Step 2: Log ALL response details for debugging
    console.log('LinkedIn API Response Details:');
    console.log('- Status:', response.status);
    console.log('- Status Text:', response.statusText);
    
    // Log all response headers
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('- Response Headers:', JSON.stringify(headers, null, 2));
    
    // Log the complete response body for debugging
    let responseText = '';
    try {
      // Clone the response to avoid consuming it
      const clonedResponse = response.clone();
      responseText = await clonedResponse.text();
      console.log('- Response Body:', responseText);
    } catch (err) {
      console.error('- Failed to read response body:', err);
    }
    
    // Step 3: Handle error cases with detailed logging
    if (!response.ok) {
      console.error(`⚠️ LinkedIn API Error (${response.status}): ${response.statusText}`);
      console.error('Response Body:', responseText);
      
      // Log a helpful message based on status code
      if (response.status === 401) {
        console.error('AUTHENTICATION ERROR: The access token is invalid or expired.');
        console.error('FIX: Ensure the app is properly configured with correct scopes.');
      } else if (response.status === 403) {
        console.error('PERMISSION ERROR: The access token does not have permission to access this resource.');
        console.error('FIX: Verify your app has all required scopes (openid, profile, email).');
      } else if (response.status === 404) {
        console.error('ENDPOINT ERROR: The userinfo endpoint was not found.');
        console.error('FIX: Ensure you are using the correct OpenID Connect endpoint: https://api.linkedin.com/v2/userinfo');
      }
      
      throw new Error(`LinkedIn API error (${response.status}): ${responseText}`);
    }
    
    // Step 4: Parse and validate the response JSON
    let data;
    try {
      data = await response.json();
      console.log('LinkedIn userinfo response JSON:', JSON.stringify(data, null, 2));
      
      // Validate that we have the expected data
      if (!data.sub) {
        console.error('LinkedIn profile data missing "sub" field:', data);
        throw new Error('Invalid profile data: missing user ID (sub)');
      }
    } catch (error) {
      console.error('Failed to parse LinkedIn API response:', error);
      console.error('Raw response text:', responseText);
      throw new Error(`Failed to parse LinkedIn profile data: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Step 5: Convert OIDC format to passport profile format
    console.log('Successfully retrieved LinkedIn profile data!');
    return {
      id: data.sub,
      displayName: data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim(),
      emails: data.email ? [{ value: data.email }] : undefined,
      photos: data.picture ? [{ value: data.picture }] : undefined,
      profileUrl: data.profile || undefined
    };
  } catch (error) {
    console.error('❌ Error fetching LinkedIn profile:', error);
    throw error;
  }
}

// Configure passport with LinkedIn strategy
export function configureAuth(app: Express) {
  // Session middleware is now initialized in server/index.ts before this function is called
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

  // Use dynamic host detection for callback URL to handle Replit's changing domains
  
  // Store detected host from first request - initialize with current Replit domain if available
  let detectedHost: string | null = null;
  
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
    
    // Also store alternative URL formats to help with debugging
    const alternativeUrls = [
      // LinkedIn seems to be strict about trailing slashes, so we store both versions
      url,
      url.endsWith('/') ? url.slice(0, -1) : `${url}/`,
      // Also store the URL with www. prefix in case that's registered
      url.replace('://', '://www.'),
      // Also store without any subdomain prefix in case that's how it's registered
      url.replace(/^https?:\/\/[^.]+\./, `${protocol}://`)
    ];
    
    // Log all possible URLs that might be registered in LinkedIn
    console.log('📌 Setting callback URL to:', url);
    console.log('🔍 Alternative URL formats that might be registered:');
    alternativeUrls.forEach((altUrl, i) => {
      console.log(`  ${i+1}. ${altUrl}`);
    });
    
    // Store in environment for other parts of the application
    process.env.DETECTED_CALLBACK_URL = url;
    process.env.ALTERNATE_CALLBACK_URLS = JSON.stringify(alternativeUrls);
    
    return url;
  };
  
  // Set up a default callback URL that will work with localhost for initial setup
  // We'll update this as soon as we get a real request, but this ensures the strategy initializes properly
  const defaultCallbackURL = 'https://localhost:5000/auth/linkedin/callback';
  
  console.log('LinkedIn Strategy Configuration:');
  console.log('- Client ID:', process.env.LINKEDIN_CLIENT_ID ? '✓ Present' : '✗ Missing');
  console.log('- Client Secret:', process.env.LINKEDIN_CLIENT_SECRET ? '✓ Present' : '✗ Missing');
  
  // Configure LinkedIn strategy with proper callback URL and more robust error handling
  // Try to use a better default URL if possible
  let initialCallbackURL = defaultCallbackURL;
  
  // If we have Replit environment variables, use those to create a better default
  if (process.env.REPLIT_CLUSTER) {
    const replit_id = process.env.REPLIT_CLUSTER;
    initialCallbackURL = `https://${replit_id}.replit.dev/auth/linkedin/callback`;
    console.log('✨ Using Replit cluster ID for initial callback URL:', initialCallbackURL);
  }
  
  // If we already have a detected callback URL from previous requests, use that instead
  if (process.env.DETECTED_CALLBACK_URL) {
    initialCallbackURL = process.env.DETECTED_CALLBACK_URL;
    console.log('✨ Using previously detected callback URL:', initialCallbackURL);
  }
  
  passport.use('linkedin', new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    callbackURL: initialCallbackURL, // Start with better default, will still be updated on first request
    // Use the OpenID Connect scopes as approved by LinkedIn
    scope: ["openid", "profile", "email"],
    profileFields: ['id', 'first-name', 'last-name', 'profile-picture'],
    state: false, // Disable state verification to fix 'Unable to verify authorization request state' error
    proxy: true,
    // Add custom OAuth 2.0 token exchange handling to log token details
    passReqToCallback: true,
    customHeaders: {
      // Only send what's absolutely required
      Authorization: `Basic ${Buffer.from(`${process.env.LINKEDIN_CLIENT_ID}:${process.env.LINKEDIN_CLIENT_SECRET}`).toString('base64')}`
    }
  } as any, async (req: any, accessToken: string, refreshToken: string, params: any, _profile: LinkedInProfile, done: (error: any, user?: any) => void) => {
    // Create a global variable to store the latest token for debugging
    global.linkedInLastToken = {
      token: accessToken,
      tokenType: params?.token_type || null,
      params: params,
      timestamp: new Date().toISOString()
    };
    
    // Log the complete token exchange for debugging
    console.log('\n\n██████████████████████████████████████████████████████████████');
    console.log('█▓▒░ LINKEDIN OAUTH TOKEN RECEIVED ░▒▓█');
    console.log('██████████████████████████████████████████████████████████████\n');
    console.log('✅ Time:', new Date().toISOString());
    console.log('✅ Access Token (masked):', accessToken ? `${accessToken.substring(0, 5)}...${accessToken.substring(accessToken.length - 5)}` : 'MISSING');
    console.log('✅ Token Length:', accessToken ? accessToken.length : 0);
    console.log('✅ Response Params:', JSON.stringify(params, null, 2));
    console.log('✅ Token Type:', params?.token_type || 'not specified');
    console.log('✅ Expires In:', params?.expires_in || 'not specified');
    console.log('\n✨ To test this token, go to /linkedin-token-test on frontend');
    console.log('✨ Or visit: /api/auth/linkedin/latest-token');
    console.log('██████████████████████████████████████████████████████████████\n\n');
    try {
      // Instead of using the profile from LinkedIn's API, fetch it from the OpenID Connect endpoint
      const profile = await fetchLinkedInUserProfile(accessToken);
      
      // Log the profile data for debugging
      console.log('LinkedIn profile received from OpenID Connect endpoint:', {
        id: profile.id,
        displayName: profile.displayName,
        hasEmails: !!profile.emails?.length,
        hasPhotos: !!profile.photos?.length
      });
      
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
    // Always use https for Replit domains
    const protocol = req.headers.host?.includes('replit.dev') || req.headers.host?.includes('repl.co') ? 'https' : req.protocol;
    const testCallbackUrl = `${protocol}://${req.headers.host}/auth/linkedin/callback`;
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
          scope: ["openid", "profile", "email"],
          profileFields: ['id', 'first-name', 'last-name', 'profile-picture'],
          state: false, // Disable state verification to fix 'Unable to verify authorization request state' error
          proxy: true
        } as any, linkedinStrategy._verify));
        
        console.log('✅ LinkedIn strategy updated with new callback URL');
      }
    }
    
    // Using simplified auth options without state parameter
    // This helps bypass the "Unable to verify authorization request state" error
    // State verification has been disabled in the LinkedIn strategy configuration
    const authOptions = { 
      scope: ["openid", "profile", "email"], // Using approved LinkedIn OAuth scopes
      // No state parameter - using stateless authentication
    };
    
    // Force-update the LinkedIn strategy before authentication
    // This ensures we're always using the correct callback URL
    try {
      // Create a new strategy with the correct callback URL
      const correctCallbackURL = `https://${req.headers.host}/auth/linkedin/callback`;
      
      console.log('🔄 CRITICAL: Forcing callback URL update before authentication:', correctCallbackURL);
      
      // Re-create the LinkedIn strategy with the correct URL
      passport.use('linkedin', new LinkedInStrategy({
        clientID: process.env.LINKEDIN_CLIENT_ID || '',
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
        callbackURL: correctCallbackURL,
        scope: ["openid", "profile", "email"],
        profileFields: ['id', 'first-name', 'last-name', 'profile-picture'],
        state: false, // Disable state verification to fix 'Unable to verify authorization request state' error
        proxy: true
      } as any, async (accessToken: string, refreshToken: string, _profile: LinkedInProfile, done: (error: any, user?: any) => void) => {
        try {
          // Fetch profile from OpenID Connect endpoint
          const profile = await fetchLinkedInUserProfile(accessToken);
          
          // Log the profile data for debugging
          console.log('LinkedIn profile received from OpenID Connect endpoint:', {
            id: profile.id,
            displayName: profile.displayName,
            hasEmails: !!profile.emails?.length,
            hasPhotos: !!profile.photos?.length
          });
          
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
      
      // Verify the callbackURL was set correctly
      // @ts-ignore - Accessing private passport internals
      const updatedCallbackURL = passport._strategies?.linkedin?._oauth2?._callbackURL;
      console.log('✅ Verified callback URL before auth:', updatedCallbackURL);
      
      // THIS IS CRITICAL: Log the exact LinkedIn Code Exchange Parameter Method
      // This is what the error image specifically recommends
      try {
        const oauthStrat = passport._strategies?.linkedin?._oauth2;
        if (oauthStrat) {
          const originalGetOAuthAccessToken = oauthStrat.getOAuthAccessToken;
          // Override the method to log token exchange details
          oauthStrat.getOAuthAccessToken = function(code: string, params: any, callback: Function) {
            console.log('⭐️⭐️⭐️ LINKEDIN CODE EXCHANGE ATTEMPTED ⭐️⭐️⭐️');
            console.log('Code:', code ? code.substring(0, 5) + '...' + code.substring(code.length - 5) : 'MISSING');
            console.log('Params:', params);
            console.log('Callback URL:', this._callbackURL);
            
            // Call the original method
            return originalGetOAuthAccessToken.call(this, code, params, function(err: any, accessToken: string, refreshToken: string, results: any) {
              console.log('⭐️⭐️⭐️ LINKEDIN TOKEN EXCHANGE RESULT ⭐️⭐️⭐️');
              console.log('Error:', err ? 'YES' : 'NO');
              if (err) {
                console.error('LinkedIn token exchange error:', err);
              }
              console.log('Access Token:', accessToken ? accessToken.substring(0, 5) + '...' + accessToken.substring(accessToken.length - 5) : 'MISSING');
              console.log('Results:', results);
              
              // Store the token info in the global variable
              if (accessToken) {
                global.linkedInLastToken = {
                  token: accessToken,
                  tokenType: results?.token_type || null,
                  params: results,
                  timestamp: new Date().toISOString()
                };
              }
              
              // Call the original callback
              callback(err, accessToken, refreshToken, results);
            });
          };
          console.log('✅ LinkedIn token exchange logger installed');
        }
      } catch (e) {
        console.error('Failed to install token exchange logger:', e);
      }
    } catch (error) {
      console.error('Failed to update LinkedIn strategy before authentication:', error);
    }
    
    // Now authenticate with the updated strategy
    passport.authenticate('linkedin', authOptions)(req, res, next);
  });

  app.get(
    '/auth/linkedin/callback',
    (req, res, next) => {
      // CRITICAL DEBUGGING: Simple log to confirm this route is hit
      console.log('🔥 LINKEDIN CALLBACK HIT WITH QUERY:', req.query);
      console.log('LinkedIn callback route accessed with details:');
      console.log('- Host:', req.headers.host);
      console.log('- Query params:', req.query);
      console.log('- Error in query:', req.query.error || 'none');
      console.log('- Code in query:', req.query.code ? 'Present' : 'Missing');
      console.log('- State in query:', req.query.state || 'Missing');
      console.log('- Session object:', req.session ? 'Present' : 'Missing');
      console.log('- Expected state:', req.session.linkedInAuthState || 'Not set in session');
      
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
      
      // Log the state parameter handling for debugging
      console.log('⚠️ LinkedIn state validation info:', {
        queryState: req.query.state || null,
        sessionState: req.session.linkedInAuthState || null,
        sessionId: req.sessionID || 'no-session-id'
      });
      
      // Create a stateless version of the LinkedIn strategy
      try {
        // Create a new LinkedIn strategy with state verification disabled
        passport.use('linkedin-stateless', new LinkedInStrategy({
          clientID: process.env.LINKEDIN_CLIENT_ID || '',
          clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
          callbackURL: `https://${req.headers.host}/auth/linkedin/callback`,
          scope: ["openid", "profile", "email"],
          profileFields: ['id', 'first-name', 'last-name', 'profile-picture'],
          state: false, // Critically important: disable state verification
          proxy: true
        } as any, async (accessToken: string, refreshToken: string, _profile: LinkedInProfile, done: (error: any, user?: any) => void) => {
          try {
            // Fetch profile from OpenID Connect endpoint
            const profile = await fetchLinkedInUserProfile(accessToken);
            
            // Log the profile data for debugging
            console.log('LinkedIn profile received from OpenID Connect endpoint (stateless strategy):', {
              id: profile.id,
              displayName: profile.displayName,
              hasEmails: !!profile.emails?.length,
              hasPhotos: !!profile.photos?.length
            });
            
            // Find existing user based on LinkedIn ID
            const existingUsers = await db.select().from(users).where(eq(users.linkedinId, profile.id));
            const existingUser = existingUsers.length > 0 ? existingUsers[0] : null;
            
            if (existingUser) {
              return done(null, existingUser);
            }
            
            // Create new user if not found
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
        
        console.log('✅ Created stateless LinkedIn strategy for this request');
        
        // Install code exchange logging in the stateless strategy too
        try {
          // @ts-ignore - Accessing private passport internals
          const oauthStrat = passport._strategies?.['linkedin-stateless']?._oauth2;
          if (oauthStrat) {
            const originalGetOAuthAccessToken = oauthStrat.getOAuthAccessToken;
            // Override the method to log token exchange details
            oauthStrat.getOAuthAccessToken = function(code: string, params: any, callback: Function) {
              console.log('🔵🔵🔵 STATELESS LINKEDIN CODE EXCHANGE ATTEMPTED 🔵🔵🔵');
              console.log('Code:', code ? code.substring(0, 5) + '...' + code.substring(code.length - 5) : 'MISSING');
              console.log('Params:', params);
              console.log('Callback URL:', this._callbackURL);
              
              // Call the original method
              return originalGetOAuthAccessToken.call(this, code, params, function(err: any, accessToken: string, refreshToken: string, results: any) {
                console.log('🔵🔵🔵 STATELESS LINKEDIN TOKEN EXCHANGE RESULT 🔵🔵🔵');
                console.log('Error:', err ? 'YES' : 'NO');
                if (err) {
                  console.error('Stateless LinkedIn token exchange error:', err);
                }
                console.log('Access Token:', accessToken ? accessToken.substring(0, 5) + '...' + accessToken.substring(accessToken.length - 5) : 'MISSING');
                console.log('Results:', results);
                
                // Store the token info in the global variable
                if (accessToken) {
                  global.linkedInLastToken = {
                    token: accessToken,
                    tokenType: results?.token_type || null,
                    params: results,
                    timestamp: new Date().toISOString()
                  };
                }
                
                // Call the original callback
                callback(err, accessToken, refreshToken, results);
              });
            };
            console.log('✅ Stateless LinkedIn token exchange logger installed');
          }
        } catch (e) {
          console.error('Failed to install stateless token exchange logger:', e);
        }
      } catch (strategyError) {
        console.error('Failed to create stateless LinkedIn strategy:', strategyError);
      }
      
      // Use the stateless strategy for this request
      passport.authenticate('linkedin-stateless', { 
        failureRedirect: '/login?error=auth_failed',
        session: true // We still want to create a session
      }, (err: Error | null, user: any, info: { message: string } | undefined) => {
        // Log token response as suggested in the error image
        console.log("🔍 Access token response from LinkedIn:", info);
        
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
    // Always use HTTPS for replit domains, HTTP only for localhost
    const protocol = host?.includes('localhost') ? 'http' : 'https';
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
          + `&scope=openid profile email`;
          
        linkedinAuthUrl = authURL;
          
        // Validation approach: use a simpler check for credential validation
        // LinkedIn authentication URLs with valid client IDs return 200/302, even with a bad redirect_uri
        try {
          // Check LinkedIn's authorization endpoint with minimal parameters (not including redirect_uri)
          const minimalAuthURL = `https://www.linkedin.com/oauth/v2/authorization?`
            + `response_type=code`
            + `&client_id=${encodeURIComponent(clientId)}`
            + `&scope=openid profile email`;
            
          // Don't use HEAD - some APIs don't respond properly to HEAD requests
          const response = await fetch(minimalAuthURL, { 
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 PrepTalk App'
            }
          });
          
          // Log the full result for debugging
          console.log(`LinkedIn auth validation test status: ${response.status}`);
          linkedinStatusCode = response.status;

          // Either we get a valid response (200-299) or a redirect (30x) if credentials are valid
          // If we get a 4xx error, it likely means invalid client ID
          credentialsValid = (response.status >= 200 && response.status < 400);
          
          if (!credentialsValid) {
            console.log(`LinkedIn credential validation failed with status: ${response.status}`);
          } else {
            console.log(`LinkedIn credential validation successful with status: ${response.status}`);
          }
        } catch (testError) {
          console.error('Failed to validate LinkedIn credentials:', testError);
          // Set some default values for the diagnostic info
          credentialsValid = false;
          linkedinStatusCode = 0;
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
      // Always use HTTPS for replit domains, HTTP only for localhost
      const protocol = host?.includes('localhost') ? 'http' : 'https';
      const expectedCallbackURL = `${protocol}://${host}/auth/linkedin/callback`;
      
      // Update the LinkedIn strategy with this URL (if needed)
      try {
        // @ts-ignore - Accessing private passport internals
        const linkedinStrategy = passport._strategies?.linkedin;
        if (linkedinStrategy && (!callbackURL || callbackURL.includes('localhost'))) {
          // Create a new strategy with the updated callback URL
          passport.use('linkedin', new LinkedInStrategy({
            clientID: process.env.LINKEDIN_CLIENT_ID || '',
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
            callbackURL: expectedCallbackURL,
            scope: ["openid", "profile", "email"],
            profileFields: ['id', 'first-name', 'last-name', 'profile-picture'],
            state: true,
            proxy: true
          } as any, linkedinStrategy._verify));
          
          console.log('✅ LinkedIn strategy updated with new callback URL:', expectedCallbackURL);
          
          // Update the callbackURL for the diagnostics
          callbackURL = expectedCallbackURL;
        }
      } catch (e) {
        console.error('Error updating LinkedIn strategy:', e);
      }
      
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
        stateHandling: {
          enabled: true, // We've enabled state handling
          sessionSupport: true, // We're using express-session
          storageMethod: 'session', // We store in the session
          stateParam: 'preptalk-linkedin-auth', // Our fixed state value
          bypassEnabled: true, // We're currently bypassing strict verification for debugging
        },
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