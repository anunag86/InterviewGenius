import { Request, Response } from "express";

// LinkedIn OAuth configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

// LinkedIn API endpoints
const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

/**
 * Test various LinkedIn OAuth permutations to find what works
 * This tests different combinations of auth parameters to identify what is causing the issue
 */
export const testLinkedInPermutations = async (req: Request, res: Response) => {
  try {
    const results: any = {
      clientInfo: {
        clientIdExists: !!LINKEDIN_CLIENT_ID,
        clientSecretExists: !!LINKEDIN_CLIENT_SECRET,
        clientIdLength: LINKEDIN_CLIENT_ID ? LINKEDIN_CLIENT_ID.length : 0,
        clientIdFirstChars: LINKEDIN_CLIENT_ID ? `${LINKEDIN_CLIENT_ID.substring(0, 3)}...` : "N/A"
      },
      permutations: []
    };
    
    // Get the base URL from request
    const host = req.headers.host || "";
    const protocol = req.secure || (req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;
    
    // Test various redirect URI patterns
    const redirectUris = [
      // Root level callback
      `${baseUrl}/callback`,
      // API path callback
      `${baseUrl}/api/callback`,
      // API namespaced callback
      `${baseUrl}/api/auth/callback`,
      // Full original callback
      `${baseUrl}/api/auth/linkedin/callback`,
      // Replit format
      req.hostname.includes('.repl.co') ? 
        `https://${req.hostname}/callback` : 
        `${baseUrl}/callback` // Fallback to baseUrl instead of undefined
    ].filter(Boolean);
    
    // Test different scope combinations
    const scopeCombinations = [
      "",
      "r_liteprofile",
      "r_emailaddress",
      "r_liteprofile r_emailaddress"
    ];
    
    // This will get token information for redirect validation
    const tokenTestResult = await testTokenExchange(results.clientInfo, redirectUris[0]);
    results.tokenTest = tokenTestResult;
    
    // Generate authorization URLs for each combination
    for (const redirectUri of redirectUris) {
      for (const scope of scopeCombinations) {
        try {
          // Create a unique state parameter
          const state = Math.random().toString(36).substring(2, 8);
          
          // Build parameters 
          const params = new URLSearchParams();
          params.append("response_type", "code");
          params.append("client_id", LINKEDIN_CLIENT_ID || "");
          params.append("redirect_uri", redirectUri);
          params.append("state", state);
          if (scope) {
            params.append("scope", scope);
          }
          
          const authUrl = `${LINKEDIN_AUTH_URL}?${params.toString()}`;
          
          results.permutations.push({
            redirectUri,
            scope: scope || "none",
            authUrl,
            label: `${redirectUri} (scope: ${scope || "none"})`
          });
        } catch (error) {
          console.error(`Error generating URL for ${redirectUri} with scope ${scope}:`, error);
        }
      }
    }
    
    // Run a direct test against LinkedIn token endpoint to verify credentials
    try {
      const testUrl = new URL(LINKEDIN_TOKEN_URL);
      const testResponse = await fetch(testUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        body: new URLSearchParams({
          "grant_type": "client_credentials",
          "client_id": LINKEDIN_CLIENT_ID || "",
          "client_secret": LINKEDIN_CLIENT_SECRET || ""
        })
      });
      
      const statusCode = testResponse.status;
      let responseData;
      
      try {
        responseData = await testResponse.json();
      } catch (e) {
        responseData = await testResponse.text();
      }
      
      results.clientCredentialsTest = {
        statusCode,
        response: responseData,
        ok: testResponse.ok
      };
    } catch (error) {
      results.clientCredentialsTest = {
        error: error instanceof Error ? error.message : String(error)
      };
    }
    
    return res.json(results);
  } catch (error) {
    console.error("Error testing LinkedIn permutations:", error);
    return res.status(500).json({ error: "Failed to test LinkedIn permutations" });
  }
};

/**
 * Test token exchange with LinkedIn
 * This is to verify if the client credentials are valid
 */
async function testTokenExchange(clientInfo: any, redirectUri: string) {
  try {
    // If we don't have both credentials, return error
    if (!clientInfo.clientIdExists || !clientInfo.clientSecretExists) {
      return {
        success: false,
        error: "Missing client credentials"
      };
    }
    
    // Try a basic validation request (which will fail but should give us diagnostic info)
    const testParams = new URLSearchParams({
      grant_type: "authorization_code",
      code: "test_code",
      redirect_uri: redirectUri,
      client_id: LINKEDIN_CLIENT_ID || "",
      client_secret: LINKEDIN_CLIENT_SECRET || ""
    });
    
    const response = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: testParams
    });
    
    const statusCode = response.status;
    let responseData;
    
    try {
      responseData = await response.json();
    } catch (e) {
      responseData = await response.text();
    }
    
    // Analyze the response
    return {
      success: response.ok,
      statusCode,
      response: responseData,
      invalidCredentials: responseData?.error === "invalid_client",
      invalidRedirect: responseData?.error === "invalid_request" && 
                     typeof responseData?.error_description === "string" && 
                     responseData.error_description.includes("redirect_uri"),
      invalidCode: responseData?.error === "invalid_grant"
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Generate HTML diagnostic page for LinkedIn OAuth
 */
export const generateLinkedInDiagnosticPage = (req: Request, res: Response) => {
  // Get the base URL from request
  const host = req.headers.host || "";
  const protocol = req.secure || (req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;
  
  // Generate HTML with inline script to test all options
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LinkedIn OAuth Deep Diagnostics</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        margin: 0;
        padding: 20px;
        line-height: 1.5;
        color: #333;
      }
      .container {
        max-width: 800px;
        margin: 0 auto;
      }
      h1 {
        color: #0077B5;
        border-bottom: 2px solid #eee;
        padding-bottom: 10px;
      }
      h2 {
        color: #0077B5;
        margin-top: 30px;
      }
      pre {
        background-color: #f5f5f5;
        padding: 10px;
        border-radius: 4px;
        overflow-x: auto;
      }
      .diagnostic-section {
        margin-bottom: 30px;
        padding: 15px;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      .test-url {
        display: block;
        padding: 8px;
        margin: 8px 0;
        background-color: #f0f7ff;
        border-radius: 4px;
        word-break: break-all;
      }
      .test-url a {
        color: #0077B5;
        text-decoration: none;
      }
      .test-url a:hover {
        text-decoration: underline;
      }
      .error {
        background-color: #fff0f0;
        color: #c00;
        padding: 10px;
        border-radius: 4px;
        margin: 10px 0;
      }
      .success {
        background-color: #f0fff0;
        color: #0a0;
        padding: 10px;
        border-radius: 4px;
        margin: 10px 0;
      }
      .credential-status {
        padding: 10px;
        margin: 10px 0;
        border-radius: 4px;
      }
      .loading {
        color: #666;
        font-style: italic;
      }
      button {
        background-color: #0077B5;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      button:hover {
        background-color: #005e93;
      }
      .copy-button {
        background-color: #eee;
        color: #333;
        border: 1px solid #ddd;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
        margin-left: 6px;
        cursor: pointer;
      }
      .copy-button:hover {
        background-color: #ddd;
      }
      .recommendations {
        background-color: #fff8e1;
        padding: 15px;
        border-radius: 4px;
        margin: 20px 0;
        border-left: 4px solid #ffc107;
      }
      .btn-container {
        display: flex;
        justify-content: space-between;
        margin: 20px 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>LinkedIn OAuth Deep Diagnostics</h1>
      <p>This page performs comprehensive diagnostics on LinkedIn OAuth configuration to identify why authentication is failing.</p>
      
      <div class="btn-container">
        <button id="run-tests-btn">Run All Diagnostics</button>
        <button id="back-btn" onclick="window.location.href='/'">Back to Home</button>
      </div>
      
      <div id="loading-section" style="display: none;">
        <p class="loading">Running diagnostics, please wait...</p>
      </div>
      
      <div id="client-info-section" class="diagnostic-section" style="display: none;">
        <h2>Client Credentials</h2>
        <div id="client-info-content"></div>
      </div>
      
      <div id="token-test-section" class="diagnostic-section" style="display: none;">
        <h2>Token Exchange Test</h2>
        <div id="token-test-content"></div>
      </div>
      
      <div id="client-credentials-test-section" class="diagnostic-section" style="display: none;">
        <h2>Direct Client Credentials Test</h2>
        <div id="client-credentials-content"></div>
      </div>
      
      <div id="recommendations-section" class="recommendations" style="display: none;">
        <h3>Recommendations</h3>
        <div id="recommendations-content"></div>
      </div>
      
      <div id="url-tests-section" class="diagnostic-section" style="display: none;">
        <h2>Authorization URL Tests</h2>
        <p>Try these different URL combinations to see which one works with LinkedIn:</p>
        <div id="url-tests-content"></div>
      </div>
      
      <div id="callback-section" class="diagnostic-section" style="display: none;">
        <h2>Callback Handling Setup</h2>
        <p>
          For testing, we've set up callback handlers at these paths. All should work, but you need to
          make sure the redirect URI in your LinkedIn application matches the one you're testing:
        </p>
        <ul id="callback-list">
          <li><code>${baseUrl}/callback</code> - Root level callback</li>
          <li><code>${baseUrl}/api/callback</code> - API path callback</li>
          <li><code>${baseUrl}/api/auth/callback</code> - API namespaced callback</li>
          <li><code>${baseUrl}/api/auth/linkedin/callback</code> - Full path callback</li>
        </ul>
      </div>
    </div>
    
    <script>
      // Run diagnostics
      document.getElementById('run-tests-btn').addEventListener('click', async () => {
        // Show loading
        document.getElementById('loading-section').style.display = 'block';
        document.getElementById('run-tests-btn').disabled = true;
        document.getElementById('run-tests-btn').textContent = 'Running...';
        
        // Clear previous results
        document.getElementById('client-info-content').innerHTML = '';
        document.getElementById('token-test-content').innerHTML = '';
        document.getElementById('client-credentials-content').innerHTML = '';
        document.getElementById('recommendations-content').innerHTML = '';
        document.getElementById('url-tests-content').innerHTML = '';
        
        // Hide results sections
        document.getElementById('client-info-section').style.display = 'none';
        document.getElementById('token-test-section').style.display = 'none';
        document.getElementById('client-credentials-test-section').style.display = 'none';
        document.getElementById('recommendations-section').style.display = 'none';
        document.getElementById('url-tests-section').style.display = 'none';
        document.getElementById('callback-section').style.display = 'none';
        
        try {
          // Fetch the diagnostics data
          const response = await fetch('/api/deep-diagnostics/linkedin');
          
          if (!response.ok) {
            throw new Error('Failed to run diagnostics');
          }
          
          const diagnostics = await response.json();
          
          // Display client info
          document.getElementById('client-info-section').style.display = 'block';
          let clientInfoHtml = '';
          
          if (diagnostics.clientInfo.clientIdExists && diagnostics.clientInfo.clientSecretExists) {
            clientInfoHtml += '<div class="credential-status success">LinkedIn Client ID and Secret are both configured</div>';
            clientInfoHtml += \`<p>Client ID: Starts with \${diagnostics.clientInfo.clientIdFirstChars} (length: \${diagnostics.clientInfo.clientIdLength})</p>\`;
          } else {
            clientInfoHtml += '<div class="credential-status error">Missing credentials:</div>';
            clientInfoHtml += '<ul>';
            if (!diagnostics.clientInfo.clientIdExists) clientInfoHtml += '<li>Client ID is missing</li>';
            if (!diagnostics.clientInfo.clientSecretExists) clientInfoHtml += '<li>Client Secret is missing</li>';
            clientInfoHtml += '</ul>';
          }
          
          document.getElementById('client-info-content').innerHTML = clientInfoHtml;
          
          // Display token test results
          document.getElementById('token-test-section').style.display = 'block';
          let tokenTestHtml = '';
          
          if (diagnostics.tokenTest.success) {
            tokenTestHtml += '<div class="success">Token exchange test succeeded</div>';
          } else {
            tokenTestHtml += '<div class="error">Token exchange test failed</div>';
            
            if (diagnostics.tokenTest.invalidCredentials) {
              tokenTestHtml += '<p><strong>Issue detected:</strong> Invalid client credentials</p>';
            }
            
            if (diagnostics.tokenTest.invalidRedirect) {
              tokenTestHtml += '<p><strong>Issue detected:</strong> Invalid redirect URI</p>';
            }
            
            if (diagnostics.tokenTest.invalidCode) {
              tokenTestHtml += '<p><strong>Issue detected:</strong> Invalid authorization code (expected in test)</p>';
            }
            
            if (diagnostics.tokenTest.response) {
              tokenTestHtml += '<h4>LinkedIn Response:</h4>';
              tokenTestHtml += \`<pre>\${JSON.stringify(diagnostics.tokenTest.response, null, 2)}</pre>\`;
            }
          }
          
          document.getElementById('token-test-content').innerHTML = tokenTestHtml;
          
          // Display client credentials test
          document.getElementById('client-credentials-test-section').style.display = 'block';
          let clientCredentialsHtml = '';
          
          if (diagnostics.clientCredentialsTest.ok) {
            clientCredentialsHtml += '<div class="success">Client credentials are valid</div>';
          } else {
            clientCredentialsHtml += '<div class="error">Client credentials test failed</div>';
            
            if (diagnostics.clientCredentialsTest.statusCode) {
              clientCredentialsHtml += \`<p>Status code: \${diagnostics.clientCredentialsTest.statusCode}</p>\`;
            }
            
            if (diagnostics.clientCredentialsTest.response) {
              clientCredentialsHtml += '<h4>LinkedIn Response:</h4>';
              clientCredentialsHtml += \`<pre>\${JSON.stringify(diagnostics.clientCredentialsTest.response, null, 2)}</pre>\`;
            }
            
            if (diagnostics.clientCredentialsTest.error) {
              clientCredentialsHtml += \`<p>Error: \${diagnostics.clientCredentialsTest.error}</p>\`;
            }
          }
          
          document.getElementById('client-credentials-content').innerHTML = clientCredentialsHtml;
          
          // Generate recommendations
          document.getElementById('recommendations-section').style.display = 'block';
          let recommendationsHtml = '<ul>';
          
          // Client ID and Secret recommendations
          if (!diagnostics.clientInfo.clientIdExists || !diagnostics.clientInfo.clientSecretExists) {
            recommendationsHtml += '<li><strong>Configure credentials:</strong> Make sure both LinkedIn Client ID and Client Secret are configured</li>';
          } else if (diagnostics.tokenTest.invalidCredentials || 
                   (diagnostics.clientCredentialsTest.response && diagnostics.clientCredentialsTest.response.error === "invalid_client")) {
            recommendationsHtml += '<li><strong>Check credentials:</strong> Your LinkedIn credentials appear to be invalid. Verify them in the LinkedIn Developer Portal.</li>';
            recommendationsHtml += '<li><strong>Verify application:</strong> Make sure your LinkedIn application is approved and active in the Developer Portal.</li>';
          }
          
          // Redirect URI recommendations
          if (diagnostics.tokenTest.invalidRedirect) {
            recommendationsHtml += '<li><strong>Configure redirect URIs:</strong> Add all the tested redirect URIs to your LinkedIn application settings.</li>';
          }
          
          // General recommendations
          recommendationsHtml += '<li><strong>Try simple paths:</strong> LinkedIn can be sensitive to complex redirect paths. Try using the simplest path (e.g., /callback).</li>';
          recommendationsHtml += '<li><strong>Check permissions:</strong> Make sure your LinkedIn application has the necessary OAuth permissions enabled.</li>';
          recommendationsHtml += '<li><strong>Verify scope:</strong> Try different scope combinations, starting with "r_liteprofile r_emailaddress".</li>';
          
          recommendationsHtml += '</ul>';
          document.getElementById('recommendations-content').innerHTML = recommendationsHtml;
          
          // Display URL tests
          if (diagnostics.permutations && diagnostics.permutations.length > 0) {
            document.getElementById('url-tests-section').style.display = 'block';
            document.getElementById('callback-section').style.display = 'block';
            
            let urlTestsHtml = '';
            diagnostics.permutations.forEach((perm, index) => {
              urlTestsHtml += \`
                <div class="test-url">
                  <strong>Test #\${index + 1}:</strong> \${perm.label}
                  <a href="\${perm.authUrl}" target="_blank">Try this URL</a>
                  <button class="copy-button" onclick="copyToClipboard('\${perm.authUrl}')">Copy</button>
                </div>
              \`;
            });
            
            document.getElementById('url-tests-content').innerHTML = urlTestsHtml;
          }
        } catch (error) {
          console.error('Diagnostics error:', error);
          document.getElementById('client-info-content').innerHTML = \`<div class="error">Error running diagnostics: \${error.message}</div>\`;
          document.getElementById('client-info-section').style.display = 'block';
        } finally {
          // Hide loading
          document.getElementById('loading-section').style.display = 'none';
          document.getElementById('run-tests-btn').disabled = false;
          document.getElementById('run-tests-btn').textContent = 'Run All Diagnostics';
        }
      });
      
      // Copy to clipboard function
      function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
          // Flash "Copied!"
          const button = event.target;
          const originalText = button.textContent;
          button.textContent = 'Copied!';
          setTimeout(() => {
            button.textContent = originalText;
          }, 1500);
        }).catch(err => {
          console.error('Failed to copy text: ', err);
        });
      }
    </script>
  </body>
  </html>
  `;
  
  res.send(html);
};