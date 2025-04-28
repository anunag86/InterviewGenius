import { Request, Response } from "express";

// LinkedIn OAuth credentials
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

/**
 * Generate a simple LinkedIn login URL with explicit repl.co domain
 */
export const generateQuickTestUrl = (req: Request, res: Response) => {
  try {
    if (!LINKEDIN_CLIENT_ID) {
      return res.status(500).json({ 
        error: "LinkedIn client ID not configured", 
        envChecks: {
          clientId: LINKEDIN_CLIENT_ID ? "Set" : "Missing",
          clientSecret: LINKEDIN_CLIENT_SECRET ? "Set" : "Missing"
        }
      });
    }
    
    // Generate state for security
    const state = Math.random().toString(36).substring(2, 15);
    req.session.oauthState = state;
    
    // Get current Replit domain
    let redirectUri;
    
    // Determine the redirect URI based on the environment
    // We need to prioritize the right domain for different Replit environments
    
    if (req.headers.host?.includes('picard.replit.dev')) {
      // Priority 1: If we're in the Replit editor preview (picard.replit.dev)
      redirectUri = `https://${req.headers.host}/api/quicktest/callback`;
      console.log(`QUICK TEST: Using picard.replit.dev domain for redirect URI: ${redirectUri}`);
    } else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      // Priority 2: If we're in a deployed Replit app (.repl.co)
      redirectUri = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/quicktest/callback`;
      console.log(`QUICK TEST: Using Replit domain for redirect URI: ${redirectUri}`);
    } else {
      // Priority 3: Fallback to request headers (local development)
      const protocol = req.secure || (req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
      const host = req.headers.host || "localhost:5000";
      redirectUri = `${protocol}://${host}/api/quicktest/callback`;
      console.log(`QUICK TEST: Using request headers for redirect URI: ${redirectUri}`);
    }
    
    // Build LinkedIn auth URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: LINKEDIN_CLIENT_ID,
      redirect_uri: redirectUri,
      state: state,
      scope: 'r_liteprofile r_emailaddress' // Minimal scopes required
    });
    
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    
    // Send the auth URL to the client
    return res.json({
      url: authUrl,
      redirectUri,
      timestamp: new Date().toISOString(),
      clientIdPrefix: LINKEDIN_CLIENT_ID ? LINKEDIN_CLIENT_ID.substring(0, 4) + '...' : 'Missing',
      environmentChecks: {
        REPL_SLUG: process.env.REPL_SLUG || 'Not set',
        REPL_OWNER: process.env.REPL_OWNER || 'Not set',
        NODE_ENV: process.env.NODE_ENV || 'Not set'
      }
    });
  } catch (error) {
    console.error("Error in quick test auth URL generation:", error);
    return res.status(500).json({ error: "Failed to generate auth URL" });
  }
};

/**
 * Handle quicktest callback with simplified code
 */
export const handleQuickTestCallback = async (req: Request, res: Response) => {
  try {
    const code = req.query.code;
    const state = req.query.state;
    
    if (!code) {
      console.error("QUICK TEST CALLBACK: Missing authorization code");
      return res.redirect("/?error=missing_code");
    }
    
    // Return summary HTML response
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>LinkedIn Quick Test Result</title>
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
          h1, h2 {
            color: #0077B5;
          }
          .success-box {
            background-color: #f0fff0;
            border-left: 4px solid #0a0;
            padding: 15px;
            margin: 20px 0;
          }
          code {
            background: #f0f0f0;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: monospace;
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
        <h1>LinkedIn Quick Test Result</h1>
        
        <div class="success-box">
          <h2>✅ Authentication Code Received</h2>
          <p>Successfully received authorization code from LinkedIn.</p>
          <p>This means that the first part of the OAuth flow is working correctly!</p>
          <p><strong>Code:</strong> <code>${code.toString().substring(0, 10)}...</code></p>
          <p><strong>State:</strong> <code>${state || 'Not provided'}</code></p>
          
          <h3>Next steps:</h3>
          <ol>
            <li>LinkedIn successfully redirected back with an authorization code</li>
            <li>Next, our application would exchange this code for an access token</li>
            <li>Then use the access token to fetch profile information</li>
          </ol>
          
          <p>The fact that you're seeing this page means that your LinkedIn app is correctly configured for the authorization request and redirect. If you're still having issues with the complete flow, the problem is likely in the token exchange or API request steps.</p>
        </div>
        
        <p><a href="/linkedin/test">← Back to LinkedIn Test Tool</a></p>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("QUICK TEST CALLBACK: Error handling callback:", error);
    res.status(500).send("Error processing LinkedIn callback");
  }
};