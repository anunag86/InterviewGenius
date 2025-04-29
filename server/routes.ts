import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { generateInterview, getInterviewStatus, getInterviewHistory, saveUserResponse, getUserResponsesForInterview, gradeUserResponse } from "./controllers/interview";
import { submitFeedback } from "./controllers/feedback";
// Import the OpenID-based authentication instead of the deprecated LinkedIn OAuth
import { ensureAuthenticated } from "./auth"; // Keep this temporarily for backward compatibility
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
  // Set up LinkedIn OpenID Connect authentication
  console.log('Setting up LinkedIn OpenID Connect authentication routes...');
  
  // Detect current application host for callback URL
  const host = process.env.REPL_IDENTITY || process.env.REPLIT_CLUSTER || 'localhost:5000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const callbackURL = `${protocol}://${host}/auth/linkedin/callback/oidc`;
  
  // Initialize LinkedIn OpenID authentication
  console.log('Initializing LinkedIn OpenID with callback URL:', callbackURL);
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
  
  // Endpoint to get the current callback URL that needs to be registered in LinkedIn
  app.get('/api/auth/linkedin/callback-url', (req, res) => {
    // Detect the host from the request
    const host = req.headers.host || process.env.REPLIT_CLUSTER ? 
      `${process.env.REPLIT_CLUSTER}.replit.dev` : 'localhost:5000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    // Generate the callback URL
    const callbackURL = `${protocol}://${host}/auth/linkedin/callback`;
    
    // Store it in environment variable for other parts of the app
    process.env.DETECTED_CALLBACK_URL = callbackURL;
    
    // Generate alternative formats
    const alternativeUrls = [
      callbackURL,
      callbackURL.endsWith('/') ? callbackURL.slice(0, -1) : `${callbackURL}/`,
      callbackURL.replace('://', '://www.'),
      callbackURL.replace(/^https?:\/\/[^.]+\./, `${protocol}://`)
    ];
    
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
          .alternatives { margin-top: 30px; }
          .alternative { background: #f9f9f9; padding: 10px; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>LinkedIn Callback URL Configuration</h1>
        
        <div class="instructions">
          <h2>Instructions</h2>
          <ol>
            <li>Copy the exact callback URL shown below</li>
            <li>Go to the <a href="https://www.linkedin.com/developers/apps/" target="_blank">LinkedIn Developer Portal</a></li>
            <li>Select your application and go to the "Auth" tab</li>
            <li>Add this URL as a Redirect URL (must be exact, character-for-character)</li>
            <li>Click "Save" and try authenticating again</li>
          </ol>
        </div>
        
        <h2>Primary Callback URL</h2>
        <p>This is the URL you should register in your LinkedIn application:</p>
        
        <div class="url-box" id="callback-url">
          ${callbackURL}
          <button class="copy-btn" onclick="copyToClipboard('callback-url')">Copy</button>
        </div>
        
        <div class="alert">
          <strong>Important:</strong> The callback URL must match exactly what's registered in LinkedIn. 
          If you see "redirect_uri_mismatch" errors, it means the URLs don't match character-for-character.
        </div>
        
        <div class="alternatives">
          <h3>Alternative URLs to Try</h3>
          <p>If the primary URL doesn't work, try registering these alternatives:</p>
          
          ${alternativeUrls.map((url, i) => `
            <div class="alternative" id="alt-${i}">
              ${url}
              <button class="copy-btn" onclick="copyToClipboard('alt-${i}')">Copy</button>
            </div>
          `).join('')}
        </div>
        
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
