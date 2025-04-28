import { Request, Response } from "express";
import fetch from "node-fetch";

/**
 * LinkedIn OAuth Flow Systematic Test
 * This file contains a set of functions to test each step of the LinkedIn OAuth flow
 * to identify exactly where the failure is occurring.
 */

// Stage 1: Test LinkedIn Connection and API Access
export const testSystematicConnection = async (req: Request, res: Response) => {
  try {
    // Simple test to see if we can reach LinkedIn's servers
    const response = await fetch('https://www.linkedin.com/oauth/v2/authorization', {
      method: 'HEAD',
    });
    
    return res.json({
      stage: "connection",
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({
      stage: "connection",
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Stage 2: Test Credentials
export const testSystematicCredentials = (req: Request, res: Response) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  
  const results = {
    stage: "credentials",
    client_id: {
      exists: !!clientId,
      value_preview: clientId ? `${clientId.substring(0, 5)}...` : 'missing'
    },
    client_secret: {
      exists: !!clientSecret,
      length: clientSecret ? clientSecret.length : 0
    },
    environment: {
      REPL_SLUG: process.env.REPL_SLUG || 'not set',
      REPL_OWNER: process.env.REPL_OWNER || 'not set',
      NODE_ENV: process.env.NODE_ENV || 'not set'
    },
    timestamp: new Date().toISOString()
  };
  
  return res.json(results);
};

// Stage 3: Generate Authorization URL with Proper Scopes
export const testAuthorizationUrl = (req: Request, res: Response) => {
  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) {
      return res.status(400).json({
        stage: "authorization_url",
        success: false,
        error: "Missing LinkedIn Client ID",
        timestamp: new Date().toISOString()
      });
    }
    
    // Generate state parameter
    const state = Math.random().toString(36).substring(2, 15);
    if (req.session) {
      req.session.oauthState = state;
    }
    
    // Generate redirect URI based on request host
    let redirectUri = "";
    if (req.headers.host?.includes('picard.replit.dev')) {
      // Replit editor domain
      redirectUri = `https://${req.headers.host}/api/linkedin/systematic/callback`;
    } else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      // Replit deployed domain
      redirectUri = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/linkedin/systematic/callback`;
    } else {
      // Localhost or other
      const protocol = req.secure ? 'https' : 'http';
      redirectUri = `${protocol}://${req.headers.host || 'localhost:5000'}/api/linkedin/systematic/callback`;
    }
    
    // Build authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state: state,
      scope: 'r_liteprofile r_emailaddress'
    });
    
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    
    return res.json({
      stage: "authorization_url",
      success: true,
      url: authUrl,
      redirect_uri: redirectUri,
      state: state,
      scope: 'r_liteprofile r_emailaddress',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({
      stage: "authorization_url",
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Stage 4: Handle Callback
export const handleSystematicCallback = async (req: Request, res: Response) => {
  try {
    // Record all information about the callback
    const { code, state, error, error_description } = req.query;
    const expectedState = req.session?.oauthState;
    const stateValid = !!state && expectedState === state;
    
    // Log all details for debugging
    console.log("LinkedIn OAuth Callback Results:", {
      received_code: code ? true : false,
      received_state: state ? true : false,
      state_valid: stateValid,
      error: error || 'none',
      error_description: error_description || 'none',
      host: req.headers.host
    });
    
    // If we received an error, report it
    if (error) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>LinkedIn OAuth Test - Error</title>
          <style>
            body { font-family: sans-serif; margin: 20px; line-height: 1.5; }
            .error { color: red; }
            .success { color: green; }
            pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
            h2 { border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          </style>
        </head>
        <body>
          <h1>LinkedIn OAuth Flow Failed at Callback Stage</h1>
          
          <div class="error">
            <h2>Error Details</h2>
            <p><strong>Error:</strong> ${error}</p>
            <p><strong>Description:</strong> ${error_description || 'No description provided'}</p>
          </div>
          
          <h2>Testing Data</h2>
          <pre>${JSON.stringify({
            stage: "callback",
            success: false,
            error,
            error_description,
            received_state: state ? true : false,
            state_valid: stateValid,
            timestamp: new Date().toISOString()
          }, null, 2)}</pre>
          
          <p>Return to <a href="/linkedin/systematic">Systematic Test Page</a></p>
        </body>
        </html>
      `);
    }
    
    // If we received a code, try to exchange it for a token
    if (code) {
      // We now want to try the token exchange
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>LinkedIn OAuth Test - Success</title>
          <style>
            body { font-family: sans-serif; margin: 20px; line-height: 1.5; }
            .error { color: red; }
            .success { color: green; }
            pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
            h2 { border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            button { background: #0077b5; color: white; border: none; padding: 10px 15px; 
                     border-radius: 5px; cursor: pointer; font-size: 16px; }
            button:hover { background: #005d8f; }
          </style>
        </head>
        <body>
          <h1>LinkedIn OAuth Authorization Successful</h1>
          
          <div class="success">
            <h2>Authorization Code Received</h2>
            <p>We successfully received an authorization code from LinkedIn!</p>
            <p>This indicates the redirect URI was correctly configured and permission was granted.</p>
            <p><strong>Code:</strong> ${String(code).substring(0, 7)}...</p>
            <p><strong>State:</strong> ${state} ${stateValid ? '✅ Valid' : '❌ Invalid'}</p>
          </div>
          
          <h2>Next Step: Exchange Code for Token</h2>
          <p>Click the button below to attempt to exchange this code for an access token:</p>
          <button id="exchange-token">Exchange for Token</button>
          <div id="token-result" style="margin-top: 20px; display: none;"></div>
          
          <h2>Testing Data</h2>
          <pre>${JSON.stringify({
            stage: "callback",
            success: true,
            received_code: true,
            received_state: state ? true : false,
            state_valid: stateValid,
            timestamp: new Date().toISOString()
          }, null, 2)}</pre>
          
          <script>
            document.getElementById('exchange-token').addEventListener('click', async () => {
              try {
                const resultDiv = document.getElementById('token-result');
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = '<p>Exchanging code for token...</p>';
                
                const response = await fetch('/api/linkedin/systematic/exchange-token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    code: '${code}',
                    state: '${state}'
                  })
                });
                
                const result = await response.json();
                
                if (result.success) {
                  resultDiv.innerHTML = \`
                    <div class="success">
                      <h3>Token Exchange Successful! ✅</h3>
                      <p>We successfully exchanged the code for an access token.</p>
                      <p><strong>Access Token:</strong> \${result.token_preview}...</p>
                      <p>Click below to retrieve the LinkedIn profile:</p>
                      <button id="get-profile">Get Profile</button>
                      <div id="profile-result" style="margin-top: 20px;"></div>
                    </div>
                    <pre>\${JSON.stringify(result, null, 2)}</pre>
                  \`;
                  
                  document.getElementById('get-profile').addEventListener('click', async () => {
                    try {
                      const profileDiv = document.getElementById('profile-result');
                      profileDiv.innerHTML = '<p>Fetching profile...</p>';
                      
                      const profileResponse = await fetch('/api/linkedin/systematic/get-profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: result.access_token })
                      });
                      
                      const profileResult = await profileResponse.json();
                      
                      if (profileResult.success) {
                        profileDiv.innerHTML = \`
                          <div class="success">
                            <h3>Profile Retrieved! ✅</h3>
                            <p>Complete LinkedIn OAuth flow successful!</p>
                            <p><strong>Name:</strong> \${profileResult.firstName} \${profileResult.lastName}</p>
                            <p><strong>Email:</strong> \${profileResult.email || 'Not available'}</p>
                          </div>
                          <pre>\${JSON.stringify(profileResult, null, 2)}</pre>
                        \`;
                      } else {
                        profileDiv.innerHTML = \`
                          <div class="error">
                            <h3>Profile Retrieval Failed ❌</h3>
                            <p>Error: \${profileResult.error}</p>
                          </div>
                          <pre>\${JSON.stringify(profileResult, null, 2)}</pre>
                        \`;
                      }
                    } catch (error) {
                      document.getElementById('profile-result').innerHTML = \`
                        <div class="error">
                          <h3>Profile Retrieval Failed ❌</h3>
                          <p>Error: \${error.message}</p>
                        </div>
                      \`;
                    }
                  });
                } else {
                  resultDiv.innerHTML = \`
                    <div class="error">
                      <h3>Token Exchange Failed ❌</h3>
                      <p>Error: \${result.error}</p>
                    </div>
                    <pre>\${JSON.stringify(result, null, 2)}</pre>
                  \`;
                }
              } catch (error) {
                document.getElementById('token-result').innerHTML = \`
                  <div class="error">
                    <h3>Token Exchange Failed ❌</h3>
                    <p>Error: \${error.message}</p>
                  </div>
                \`;
              }
            });
          </script>
          
          <p style="margin-top: 30px;">Return to <a href="/linkedin/systematic">Systematic Test Page</a></p>
        </body>
        </html>
      `);
    }
    
    // If we didn't receive a code or an error, something unexpected happened
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>LinkedIn OAuth Test - Unexpected</title>
        <style>
          body { font-family: sans-serif; margin: 20px; line-height: 1.5; }
          .warning { color: orange; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
          h2 { border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        </style>
      </head>
      <body>
        <h1>LinkedIn OAuth Flow - Unexpected Result</h1>
        
        <div class="warning">
          <h2>No Code or Error Received</h2>
          <p>LinkedIn did not provide an authorization code or an error.</p>
          <p>This is unusual and may indicate an issue with the OAuth configuration.</p>
        </div>
        
        <h2>Request Details</h2>
        <pre>${JSON.stringify({
          query: req.query,
          headers: {
            host: req.headers.host,
            referer: req.headers.referer
          },
          timestamp: new Date().toISOString()
        }, null, 2)}</pre>
        
        <p>Return to <a href="/linkedin/systematic">Systematic Test Page</a></p>
      </body>
      </html>
    `);
  } catch (error: any) {
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>LinkedIn OAuth Test - Error</title>
        <style>
          body { font-family: sans-serif; margin: 20px; line-height: 1.5; }
          .error { color: red; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>LinkedIn OAuth Flow - Internal Error</h1>
        
        <div class="error">
          <h2>Internal Server Error</h2>
          <p>An unexpected error occurred while processing the callback: ${error.message}</p>
        </div>
        
        <p>Return to <a href="/linkedin/systematic">Systematic Test Page</a></p>
      </body>
      </html>
    `);
  }
};

// Stage 5: Exchange Token
export const exchangeToken = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        stage: "token_exchange",
        success: false,
        error: "No authorization code provided",
        timestamp: new Date().toISOString()
      });
    }
    
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return res.status(400).json({
        stage: "token_exchange",
        success: false,
        error: "Missing LinkedIn credentials",
        missing_client_id: !clientId,
        missing_client_secret: !clientSecret,
        timestamp: new Date().toISOString()
      });
    }
    
    // Determine the redirect URI that was used
    let redirectUri = "";
    if (req.headers.host?.includes('picard.replit.dev')) {
      // Replit editor domain
      redirectUri = `https://${req.headers.host}/api/linkedin/systematic/callback`;
    } else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      // Replit deployed domain
      redirectUri = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/linkedin/systematic/callback`;
    } else {
      // Localhost or other
      const protocol = req.secure ? 'https' : 'http';
      redirectUri = `${protocol}://${req.headers.host || 'localhost:5000'}/api/linkedin/systematic/callback`;
    }
    
    // Exchange the code for a token
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret
    });
    
    console.log("Exchanging token with params:", {
      code: `${code.substring(0, 7)}...`,
      redirect_uri: redirectUri,
      client_id: `${clientId.substring(0, 5)}...`,
      client_secret: '******'
    });
    
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    
    const data = await response.json();
    
    if (data.error) {
      return res.json({
        stage: "token_exchange",
        success: false,
        error: data.error,
        error_description: data.error_description,
        status: response.status,
        linkedin_response: data,
        timestamp: new Date().toISOString()
      });
    }
    
    if (data.access_token) {
      // Store the token in session for later use
      if (req.session) {
        // Use type assertion since linkedinToken is not in the Session type
        (req.session as any).linkedinToken = data.access_token;
      }
      
      return res.json({
        stage: "token_exchange",
        success: true,
        access_token: data.access_token,
        token_preview: data.access_token.substring(0, 10),
        expires_in: data.expires_in,
        timestamp: new Date().toISOString()
      });
    }
    
    return res.json({
      stage: "token_exchange",
      success: false,
      error: "Unknown response format",
      linkedin_response: data,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({
      stage: "token_exchange",
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Stage 6: Get Profile
export const getProfile = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        stage: "profile",
        success: false,
        error: "No access token provided",
        timestamp: new Date().toISOString()
      });
    }
    
    // Get basic profile
    const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    const profileData = await profileResponse.json();
    
    if (profileData.status && profileData.status >= 400) {
      return res.json({
        stage: "profile",
        success: false,
        error: "Failed to fetch LinkedIn profile",
        linkedin_response: profileData,
        timestamp: new Date().toISOString()
      });
    }
    
    // Get email address
    const emailResponse = await fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'cache-control': 'no-cache',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    const emailData = await emailResponse.json();
    let email = null;
    
    if (emailData?.elements?.[0]?.['handle~']?.emailAddress) {
      email = emailData.elements[0]['handle~'].emailAddress;
    }
    
    return res.json({
      stage: "profile",
      success: true,
      id: profileData.id,
      firstName: profileData.localizedFirstName,
      lastName: profileData.localizedLastName,
      email: email,
      raw_profile: profileData,
      raw_email: emailData,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({
      stage: "profile",
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};