import { Request, Response } from "express";
import { detectDomain, generateRedirectUri, generateOAuthState } from "../utils/domainDetection";

/**
 * Auto-detecting LinkedIn auth URL generator
 * This function uses request headers to automatically detect the correct domain
 */
export const generateAutoDetectAuthUrl = (req: Request, res: Response) => {
  try {
    // Check if LinkedIn client ID is configured
    if (!process.env.LINKEDIN_CLIENT_ID) {
      return res.status(500).json({
        error: "LinkedIn client ID not configured",
        setup_required: true
      });
    }
    
    // Generate OAuth state 
    const state = generateOAuthState(req);
    
    // Generate redirect URI using auto-detection
    const redirectUri = generateRedirectUri(req, '/api/auto-detect/callback');
    
    // Build LinkedIn auth URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINKEDIN_CLIENT_ID,
      redirect_uri: redirectUri,
      state: state,
      scope: 'r_liteprofile r_emailaddress'
    });
    
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    
    // Return the auth URL and related info
    return res.json({
      url: authUrl,
      redirectUri: redirectUri,
      state: state,
      timestamp: new Date().toISOString(),
      detection: {
        detected_domain: detectDomain(req),
        host_header: req.headers.host || 'not present',
        forwarded_host: req.headers['x-forwarded-host'] || 'not present'
      }
    });
  } catch (error: any) {
    console.error("Error generating auto-detect LinkedIn auth URL:", error);
    return res.status(500).json({
      error: "Failed to generate LinkedIn authorization URL",
      message: error.message || "Unknown error",
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Auto-detecting callback handler
 * Logs all relevant information and returns a user-friendly result page
 */
export const handleAutoDetectCallback = (req: Request, res: Response) => {
  try {
    // Extract code and state from query parameters
    const { code, state, error, error_description } = req.query;
    
    // Log the full request details for debugging
    console.log("LinkedIn auto-detect callback received:", {
      code: code ? `${String(code).substring(0, 10)}...` : 'none',
      state,
      error,
      error_description,
      headers: {
        host: req.headers.host,
        origin: req.headers.origin,
        referer: req.headers.referer
      },
      url: req.url,
      originalUrl: req.originalUrl,
      expectedState: req.session?.oauthState
    });
    
    // Check state parameter to prevent CSRF
    const stateValid = req.session?.oauthState && req.session.oauthState === state;
    
    // Display success or error message
    if (error) {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>LinkedIn Authentication Failed</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
              margin: 0;
              padding: 20px;
              line-height: 1.5;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 {
              color: #d9534f;
            }
            .error-box {
              background-color: #f9f2f2;
              border-left: 4px solid #d9534f;
              padding: 15px;
              margin: 20px 0;
            }
            pre {
              background-color: #f5f5f5;
              padding: 10px;
              border-radius: 4px;
              overflow-x: auto;
            }
          </style>
        </head>
        <body>
          <h1>LinkedIn Authentication Failed</h1>
          
          <div class="error-box">
            <p><strong>Error:</strong> ${error}</p>
            <p><strong>Description:</strong> ${error_description || 'No description provided'}</p>
          </div>
          
          <h2>Technical Details</h2>
          <pre>${JSON.stringify({
            error,
            error_description,
            state,
            stateValid,
            timestamp: new Date().toISOString(),
            url: req.url,
            originalUrl: req.originalUrl
          }, null, 2)}</pre>
          
          <p><a href="/linkedin/auto-detect">Try Again</a></p>
        </body>
        </html>
      `);
    } else if (code) {
      // For a real implementation, you would exchange the code for a token here
      // But for this test, we just display the success
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>LinkedIn Authentication Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
              margin: 0;
              padding: 20px;
              line-height: 1.5;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 {
              color: #5cb85c;
            }
            .success-box {
              background-color: #f2f9f2;
              border-left: 4px solid #5cb85c;
              padding: 15px;
              margin: 20px 0;
            }
            pre {
              background-color: #f5f5f5;
              padding: 10px;
              border-radius: 4px;
              overflow-x: auto;
            }
            .warning {
              color: #f0ad4e;
            }
          </style>
        </head>
        <body>
          <h1>LinkedIn Authentication Successful!</h1>
          
          <div class="success-box">
            <p>Your LinkedIn authorization was successful!</p>
            <p>Authorization code received: ${String(code).substring(0, 10)}...</p>
            <p>State: ${state || 'None'} ${stateValid ? '(valid)' : '<span class="warning">(invalid - possible security issue)</span>'}</p>
          </div>
          
          <h2>Next Steps</h2>
          <p>The authorization step was successful, meaning the redirect URI was correctly configured.</p>
          <p>In a complete implementation, the server would now:</p>
          <ol>
            <li>Exchange this authorization code for an access token</li>
            <li>Use the access token to fetch your LinkedIn profile</li>
            <li>Create or update your user account in our system</li>
          </ol>
          
          <h2>Technical Details</h2>
          <pre>${JSON.stringify({
            code: `${String(code).substring(0, 10)}...`,
            state,
            stateValid,
            timestamp: new Date().toISOString(),
            callback_url: req.url,
            original_url: req.originalUrl,
            next_step: 'Exchange code for token'
          }, null, 2)}</pre>
          
          <p><a href="/linkedin/auto-detect">Start Over</a></p>
        </body>
        </html>
      `);
    } else {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>LinkedIn Authentication Incomplete</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
              margin: 0;
              padding: 20px;
              line-height: 1.5;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 {
              color: #f0ad4e;
            }
            .warning-box {
              background-color: #fcf8e3;
              border-left: 4px solid #f0ad4e;
              padding: 15px;
              margin: 20px 0;
            }
            pre {
              background-color: #f5f5f5;
              padding: 10px;
              border-radius: 4px;
              overflow-x: auto;
            }
          </style>
        </head>
        <body>
          <h1>LinkedIn Authentication Incomplete</h1>
          
          <div class="warning-box">
            <p>The callback was received, but no code or error was provided.</p>
            <p>This is an unusual state and may indicate a problem with the OAuth flow.</p>
          </div>
          
          <h2>Technical Details</h2>
          <pre>${JSON.stringify({
            query: req.query,
            timestamp: new Date().toISOString(),
            url: req.url,
            headers: {
              host: req.headers.host,
              referer: req.headers.referer
            }
          }, null, 2)}</pre>
          
          <p><a href="/linkedin/auto-detect">Try Again</a></p>
        </body>
        </html>
      `);
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error in auto-detect callback handler:", error);
    res.status(500).send(`
      <h1>Error Processing LinkedIn Callback</h1>
      <p>An unexpected error occurred: ${error?.message || 'Unknown error'}</p>
      <p><a href="/linkedin/auto-detect">Try Again</a></p>
    `);
  }
};