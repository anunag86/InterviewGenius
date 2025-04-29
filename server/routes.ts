import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { generateInterview, getInterviewStatus, getInterviewHistory, saveUserResponse, getUserResponsesForInterview, gradeUserResponse } from "./controllers/interview";
import { submitFeedback } from "./controllers/feedback";
import { getLinkedInDiagnostic } from "./controllers/linkedin";
// Import the OpenID-based authentication instead of the deprecated LinkedIn OAuth
import { ensureAuthenticated } from "./linkedin-openid"; // Using the OpenID implementation
import { setupLinkedInOpenID, setupLinkedInRoutes } from "./linkedin-openid";

// Configure multer for memory storage (files are processed in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_, file, cb) => {
    // Only allow .doc and .docx file formats
    if (
      file.mimetype === "application/msword" || // .doc
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // .docx
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only Word documents (.doc or .docx) are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up LinkedIn OAuth2 authentication
  console.log('Setting up LinkedIn OAuth2 authentication routes...');
  
  // HARDCODED: The exact callback URL that's registered in LinkedIn Developer Portal
  // This must match EXACTLY what's in LinkedIn's Developer Portal - no dynamic detection
  const callbackURL = 'https://d1c83042-9bf3-4c77-aac6-0e48ec45ead6-00-1ig9xnjl41ayf.picard.replit.dev/auth/linkedin/callback';
  
  // Store this fixed URL in multiple environment variables to ensure consistency
  process.env.FIXED_LINKEDIN_CALLBACK_URL = callbackURL;
  process.env.LINKEDIN_CALLBACK_URL = callbackURL;
  process.env.LINKEDIN_REDIRECT_URI = callbackURL;
  
  console.log('👉 FIXED LinkedIn callback URL (hardcoded):', callbackURL);
  
  // Initialize LinkedIn authentication
  console.log('Initializing LinkedIn OAuth2 with callback URL:', callbackURL);
  await setupLinkedInOpenID(app, callbackURL);
  
  // Set up LinkedIn authentication routes
  setupLinkedInRoutes(app);
  
  // Public API routes
  app.post("/api/feedback", submitFeedback);
  
  // Authentication status endpoint
  app.get('/api/auth/status', (req, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      user: req.user
    });
  });
  
  // User information endpoint - same as auth/status but with a simpler path
  app.get('/api/me', (req, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      user: req.user
    });
  });
  
  // Simple endpoint for callback URL - always returns the fixed hardcoded URL
  app.get('/api/linkedin-callback-url', (req, res) => {
    // Return ONLY the hardcoded URL that's consistent with our LinkedIn registration
    // This must be the same URL used in LinkedIn Developer Portal
    res.json({
      callbackURL: 'https://d1c83042-9bf3-4c77-aac6-0e48ec45ead6-00-1ig9xnjl41ayf.picard.replit.dev/auth/linkedin/callback'
    });
  });
  
  // LinkedIn diagnostic endpoint for the client UI
  app.get('/api/linkedin-diagnostic', getLinkedInDiagnostic);
  
  // Endpoint to get the FIXED callback URL that needs to be registered in LinkedIn
  app.get('/api/auth/linkedin/callback-url', (req, res) => {
    // HARDCODED URL - this is the ONLY one that will work
    const hardcodedCallbackURL = 'https://d1c83042-9bf3-4c77-aac6-0e48ec45ead6-00-1ig9xnjl41ayf.picard.replit.dev/auth/linkedin/callback';
    
    // For display purposes only, detect the current host (NOT USED for authentication)
    const host = req.headers.host || 'unknown-host';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const detectedCallbackURL = `${protocol}://${host}/auth/linkedin/callback`;
    
    console.log('LinkedIn callback URL page requested');
    console.log('- HARDCODED URL (the one to use):', hardcodedCallbackURL);
    console.log('- Detected host URL (NOT used):', detectedCallbackURL);
    
    // Do not generate alternatives - there is only ONE valid callback URL
    
    // HTML response with easy copy-paste for the callback URL
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>LinkedIn Callback URL Configuration</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: system-ui, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #0077B5; }
          .url-box { background: #f3f4f6; border-radius: 4px; padding: 15px; margin: 15px 0; position: relative; word-break: break-all; }
          .copy-btn { position: absolute; top: 8px; right: 8px; background: #0077B5; color: white; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; }
          .copy-btn:hover { background: #005e8b; }
          .instructions { background: #e5f5fd; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .instructions ol { padding-left: 20px; }
          pre { background: #f0f0f0; padding: 10px; border-radius: 4px; overflow-x: auto; }
          .alert { background: #feeceb; color: #e53935; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .highlight-box { background: #ebfaeb; border: 2px solid #4CAF50; border-radius: 4px; padding: 15px; margin: 15px 0; position: relative; word-break: break-all; }
          .your-url { background: #f0f0f0; padding: 10px; color: #999; border-radius: 4px; margin: 10px 0; text-decoration: line-through; }
        </style>
      </head>
      <body>
        <h1>LinkedIn Callback URL Configuration</h1>
        
        <div class="alert">
          <strong>CRITICAL INFORMATION:</strong> LinkedIn authentication now REQUIRES a fixed callback URL.
          Dynamic URLs based on your current Replit domain will NOT work with LinkedIn's OAuth implementation.
        </div>
        
        <div class="instructions">
          <h2>Instructions</h2>
          <ol>
            <li>Copy the <strong>exact</strong> hardcoded callback URL shown below</li>
            <li>Go to the <a href="https://www.linkedin.com/developers/apps/" target="_blank">LinkedIn Developer Portal</a></li>
            <li>Select your application and go to the "Auth" tab</li>
            <li>Delete any existing Redirect URLs and add ONLY the one below</li>
            <li>Make sure your app has the "Sign In with LinkedIn using OpenID Connect" product enabled</li>
            <li>Ensure your OAuth 2.0 scopes include exactly: "openid profile email"</li>
            <li>Click "Save" and try authenticating again</li>
          </ol>
        </div>
        
        <h2>Required Callback URL</h2>
        <p>You <strong>MUST</strong> use this exact URL in your LinkedIn application:</p>
        
        <div class="highlight-box" id="hardcoded-url">
          https://d1c83042-9bf3-4c77-aac6-0e48ec45ead6-00-1ig9xnjl41ayf.picard.replit.dev/auth/linkedin/callback
          <button class="copy-btn" onclick="copyToClipboard('hardcoded-url')">Copy</button>
        </div>
        
        <div class="alert">
          <strong>Important:</strong> Do NOT use any other URL variations or the dynamic URL shown below.
          The callback URL must match exactly, character-for-character.
        </div>
        
        <h3>Your Current Host URL (DO NOT USE)</h3>
        <p>This is your current Replit URL, but it will NOT work with LinkedIn:</p>
        
        <div class="your-url">
          ${detectedCallbackURL || `${protocol}://${host}/auth/linkedin/callback`}
        </div>
        
        <p><strong>Why?</strong> LinkedIn requires the callback URL to be registered in advance and remain consistent.
        Replit's dynamic URLs change with each deployment. We've hardcoded a fixed URL that will work consistently.</p>
        
        <script>
          function copyToClipboard(elementId) {
            const element = document.getElementById(elementId);
            const text = element.innerText.split('Copy')[0].trim();
            
            navigator.clipboard.writeText(text).then(function() {
              const btn = element.querySelector('.copy-btn');
              const originalText = btn.innerText;
              btn.innerText = 'Copied!';
              setTimeout(() => {
                btn.innerText = originalText;
              }, 2000);
            }).catch(err => {
              console.error('Failed to copy: ', err);
              alert('Failed to copy to clipboard. Please copy manually.');
            });
          }
        </script>
      </body>
      </html>
    `;
    
    // Send HTML response
    res.type('html').send(html);
  });
  
  // LinkedIn authentication diagnostics endpoint
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
    
    // Make sure token is a string (not a JSON object)
    let tokenStr = lastToken.token;
    
    // If token accidentally stored as JSON string, extract the actual token
    if (typeof tokenStr === 'string' && (tokenStr.startsWith('{') || tokenStr.startsWith('['))) {
      try {
        // Try to parse it as JSON
        const tokenObj = JSON.parse(tokenStr);
        // Look for common token field names
        if (tokenObj.access_token) {
          tokenStr = tokenObj.access_token;
          console.log('Extracted access_token from JSON token');
        } else if (tokenObj.token) {
          tokenStr = tokenObj.token;
          console.log('Extracted token from JSON token');
        } else {
          console.log('Token is in JSON format but could not find a valid token field');
        }
      } catch (e) {
        console.log('Token appears to be JSON but failed to parse', e);
      }
    }
    
    // Return the token with masked values for security
    return res.json({
      success: true,
      token: {
        masked: tokenStr ? `${tokenStr.substring(0, 5)}...${tokenStr.substring(tokenStr.length - 5)}` : null,
        tokenType: lastToken.tokenType,
        length: tokenStr ? tokenStr.length : 0,
        receivedAt: lastToken.timestamp,
        format: typeof tokenStr
      },
      // Include a direct link to test this token
      testLink: `/api/auth/linkedin/test-token?token=${encodeURIComponent(tokenStr)}`,
      message: 'Use the test link to check if this token works with the userinfo endpoint.'
    });
  });

  // Test endpoint to manually validate a LinkedIn access token
  app.get('/api/auth/linkedin/test-token', async (req, res) => {
    // Check if token is provided in query parameter
    let accessToken = req.query.token as string;
    
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'No token provided. Add ?token=your_access_token to test.'
      });
    }
    
    // Parse JSON token if needed
    if (accessToken.startsWith('{') || accessToken.startsWith('[')) {
      try {
        const tokenObj = JSON.parse(accessToken);
        // Look for common token field names
        if (tokenObj.access_token) {
          accessToken = tokenObj.access_token;
          console.log('Extracted access_token from JSON token object');
        } else if (tokenObj.token) {
          accessToken = tokenObj.token;
          console.log('Extracted token from JSON token object');
        } else if (tokenObj.masked && tokenObj.length) {
          // This is our token format, not the actual token
          return res.status(400).json({
            success: false,
            message: 'You provided a token metadata object instead of the actual token. Get the actual token from /api/auth/linkedin/callback.'
          });
        }
      } catch (e) {
        console.log('Token appears to be JSON but failed to parse', e);
      }
    }
    
    console.log('Testing LinkedIn token manually...');
    console.log('Token (masked):', accessToken.substring(0, 5) + '...' + accessToken.substring(accessToken.length - 5));
    
    try {
      // Make a request to the LinkedIn userinfo endpoint with ONLY Authorization header
      const response = await fetch('https://api.linkedin.com/v2/userinfo', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      // Log response status
      console.log('LinkedIn API test status:', response.status, response.statusText);
      
      // Get response headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      
      // Get response body
      const responseText = await response.text();
      let responseData: any = null;
      
      try {
        // Try to parse as JSON if possible
        responseData = JSON.parse(responseText);
      } catch (e) {
        // If not JSON, use the raw text
        responseData = responseText;
      }
      
      // Determine the error type based on status code
      let errorType = null;
      let recommendation = null;
      
      if (!response.ok) {
        if (response.status === 401) {
          errorType = 'Invalid or expired token';
          recommendation = 'The token is rejected by LinkedIn. Re-authenticate to get a new token.';
        } else if (response.status === 403) {
          errorType = 'Insufficient permissions';
          recommendation = 'Token is valid but lacks scope permission. Check your LinkedIn app has openid, profile, email scopes.';
        } else if (response.status === 404) {
          errorType = 'Endpoint not found';
          recommendation = 'The userinfo endpoint URL is incorrect. Check LinkedIn developer documentation.';
        } else {
          errorType = `${response.status} error`;
          recommendation = 'Unknown error. Check the response details for more information.';
        }
      }
      
      // Return diagnostic information
      return res.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        errorType,
        recommendation,
        headers,
        responseData,
        url: 'https://api.linkedin.com/v2/userinfo',
        tokenLength: accessToken.length,
        tokenFirstChars: accessToken.substring(0, 5),
        tokenLastChars: accessToken.substring(accessToken.length - 5)
      });
    } catch (error) {
      console.error('Error testing LinkedIn token:', error);
      return res.status(500).json({
        success: false,
        message: 'Error testing token',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Logout endpoint
  app.get('/api/auth/logout', (req, res) => {
    // Check if user is authenticated
    if (req.isAuthenticated()) {
      console.log('Logging out user:', req.user);
      
      // Perform logout
      req.logout((err) => {
        if (err) {
          console.error('Error during logout:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error during logout'
          });
        }
        
        // Clear the session
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ 
              success: false,
              message: 'Error destroying session' 
            });
          }
          
          // Successfully logged out
          return res.json({ 
            success: true, 
            message: 'Successfully logged out' 
          });
        });
      });
    } else {
      // User was not logged in
      res.json({ 
        success: true, 
        message: 'User was not logged in' 
      });
    }
  });

  app.get('/api/auth/linkedin/diagnostics', (req, res) => {
    // Detect the current request's host for accurate callback URL reporting
    const host = req.headers.host || 'unknown-host';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const detectedCallbackUrl = `${protocol}://${host}/auth/linkedin/callback`;
    
    // Get the callback URL stored in environment (if available)
    const storedCallbackUrl = process.env.DETECTED_CALLBACK_URL || null;
    
    // Assemble diagnostic data
    const diagnostics = {
      callbackUrl: storedCallbackUrl || detectedCallbackUrl,
      linkedinClientConfigured: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
      sessionConfigured: !!(app as any)._router.stack.some((layer: any) => 
        layer.name === 'session' || 
        (layer.handle && layer.handle.name === 'session')
      ),
      passportInitialized: !!(app as any)._router.stack.some((layer: any) => 
        layer.name === 'initialize' || 
        (layer.handle && layer.handle.name === 'initialize')
      ),
      authEndpoints: {
        login: '/auth/linkedin',
        callback: '/auth/linkedin/callback'
      },
      serverDetails: {
        host: host,
        protocol: protocol,
        nodeEnv: process.env.NODE_ENV || 'development'
      }
    };
    
    // Log the diagnostics to the console for debugging
    console.log('LinkedIn diagnostics requested:', diagnostics);
    
    res.json(diagnostics);
  });

  // Protected API routes (require authentication)
  app.post(
    "/api/interview/generate",
    ensureAuthenticated,
    upload.single("resume"),
    generateInterview
  );
  
  app.get("/api/interview/status/:id", ensureAuthenticated, getInterviewStatus);
  
  // Interview history endpoint
  app.get("/api/interview/history", ensureAuthenticated, getInterviewHistory);
  
  // User responses endpoints
  app.post("/api/interview/response", ensureAuthenticated, saveUserResponse);
  app.get("/api/interview/:interviewPrepId/responses", ensureAuthenticated, getUserResponsesForInterview);
  app.post("/api/interview/response/grade", ensureAuthenticated, gradeUserResponse);

  const httpServer = createServer(app);

  return httpServer;
}
