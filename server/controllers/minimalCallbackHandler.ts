import { Request, Response } from "express";

/**
 * Minimal callback handler for LinkedIn OAuth
 * This only logs the response and displays it - doesn't attempt to exchange tokens
 */
export const handleMinimalCallback = (req: Request, res: Response) => {
  try {
    // Extract code and state from query parameters
    const { code, state, error, error_description } = req.query;
    
    // Log the full request details for debugging
    console.log("LinkedIn minimal callback received:", {
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
      path: req.path
    });
    
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
            timestamp: new Date().toISOString(),
            url: req.url,
            originalUrl: req.originalUrl
          }, null, 2)}</pre>
          
          <p><a href="/linkedin/minimal">Try Again</a></p>
        </body>
        </html>
      `);
    } else if (code) {
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
          </style>
        </head>
        <body>
          <h1>LinkedIn Authentication Successful</h1>
          
          <div class="success-box">
            <p>Your LinkedIn authorization was successful!</p>
            <p>Authorization code received: ${String(code).substring(0, 10)}...</p>
            <p>State: ${state || 'None'}</p>
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
            timestamp: new Date().toISOString(),
            callback_url: req.url,
            original_url: req.originalUrl,
            next_step: 'Exchange code for token'
          }, null, 2)}</pre>
          
          <p><a href="/linkedin/minimal">Start Over</a></p>
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
          
          <p><a href="/linkedin/minimal">Try Again</a></p>
        </body>
        </html>
      `);
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error in minimal callback handler:", error);
    res.status(500).send(`
      <h1>Error Processing LinkedIn Callback</h1>
      <p>An unexpected error occurred: ${error?.message || 'Unknown error'}</p>
      <p><a href="/linkedin/minimal">Try Again</a></p>
    `);
  }
};