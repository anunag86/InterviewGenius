import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { generateInterview, getInterviewStatus, getInterviewHistory, saveUserResponse, getUserResponsesForInterview, gradeUserResponse } from "./controllers/interview";
import { submitFeedback } from "./controllers/feedback";
import { getLinkedInAuthUrl, handleLinkedInCallback, getCurrentUser, logout } from "./controllers/auth";
import { getLinkedInDiagnostics } from "./controllers/diagnostics";
import { getSimpleLinkedInAuthUrl, handleSimpleLinkedInCallback } from "./controllers/altauth";
import { getFixedLinkedInAuthUrl, handleFixedLinkedInCallback } from "./controllers/fixedAuthLinkedin";
import { registerUser, loginUser } from "./controllers/manualAuth";
import { getSimpleAuthUrl, handleSimpleCallback } from "./controllers/simpleAuth";
import { getDirectLinkedInAuthUrl, handleDirectLinkedInCallback } from "./controllers/directLinkedinAuth";
import { getMinimalAuthUrl, handleMinimalCallback as handleSuperMinimalCallback } from "./controllers/minimalLinkedInAuth";
import { handleUniversalCallback } from "./controllers/linkedinCallbacks";
import { generateAuthUrl } from "./controllers/linkedinAuthGenerator";
import { checkLinkedInCredentials } from "./controllers/credentials-check";
import { testLinkedInPermutations, generateLinkedInDiagnosticPage } from "./controllers/linkedinDeepDiagnostics";
import { 
  testLinkedInConnection, 
  testLinkedInCredentials,
  testRedirectUri,
  checkOAuthEnvironment,
  generateAllPossibleRedirectUris
} from "./controllers/linkedinDebug";
import { generateQuickTestUrl, handleQuickTestCallback } from "./controllers/quickTest";
import { debugRequestHeaders } from "./controllers/debugRequestHeaders";
import { handleMinimalCallback } from "./controllers/minimalCallbackHandler";
import { generateAutoDetectAuthUrl, handleAutoDetectCallback } from "./controllers/autoDetectAuth";
import { getLinkedInRobustAuthUrl, handleLinkedInRobustCallback, renderAuthPage } from "./controllers/robustAuth";
import { 
  testSystematicConnection,
  testSystematicCredentials,
  testAuthorizationUrl,
  handleSystematicCallback,
  exchangeToken,
  getProfile
} from "./controllers/linkedinSystematicTest";
import { runDiagnostics, generateDiagnosticReport } from "./controllers/linkedinDiagnosticTool";
import { setSessionValue, getSessionValue } from "./controllers/sessionDebug";

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
  // API routes
  app.post(
    "/api/interview/generate",
    upload.single("resume"),
    generateInterview
  );
  
  app.get("/api/interview/status/:id", getInterviewStatus);
  
  // Interview history endpoint
  app.get("/api/interview/history", getInterviewHistory);
  
  // User responses endpoints - new!
  app.post("/api/interview/response", saveUserResponse);
  app.get("/api/interview/:interviewPrepId/responses", getUserResponsesForInterview);
  app.post("/api/interview/response/grade", gradeUserResponse);
  
  // Feedback endpoint
  app.post("/api/feedback", submitFeedback);
  
  // Auth endpoints
  app.get("/api/auth/linkedin/url", getLinkedInAuthUrl); // Legacy endpoint
  app.get("/api/auth/linkedin/callback", handleLinkedInCallback); // Legacy endpoint
  app.get("/api/auth/me", getCurrentUser);
  app.post("/api/auth/logout", logout);
  
  // New robust auth endpoints
  app.get("/auth", renderAuthPage);
  app.get("/api/auth/linkedin/robust-url", getLinkedInRobustAuthUrl);
  app.get("/api/auth/linkedin/robust-callback", handleLinkedInRobustCallback);
  
  // New direct LinkedIn auth endpoints - these should work with LinkedIn's domain requirements
  app.get("/api/auth/linkedin/direct-url", getDirectLinkedInAuthUrl);
  app.get("/api/auth/linkedin/direct-callback", handleDirectLinkedInCallback);
  app.get("/direct-callback", handleDirectLinkedInCallback);
  
  // Special direct LinkedIn connect endpoints
  app.get("/linkedin", (req, res) => {
    res.sendFile('linkedin-connect.html', { root: './client/public' });
  });
  
  // LinkedIn settings helper page
  app.get("/linkedin/settings", (req, res) => {
    res.sendFile('linkedin-settings.html', { root: './client/public' });
  });
  
  // Simple LinkedIn connection page
  app.get("/linkedin/simple", (req, res) => {
    res.sendFile('linkedin-simple.html', { root: './client/public' });
  });
  
  // LinkedIn diagnostics endpoint
  app.get("/api/diagnostics/linkedin", getLinkedInDiagnostics);
  
  // LinkedIn debugging page
  app.get("/linkedin/debug", (req, res) => {
    res.sendFile('linkedin-debug.html', { root: './client/public' });
  });
  
  // LinkedIn debugging API endpoints
  app.get("/api/debug/linkedin/environment", checkOAuthEnvironment);
  app.get("/api/debug/linkedin/connection", testLinkedInConnection);
  app.get("/api/debug/linkedin/credentials", testLinkedInCredentials);
  app.get("/api/debug/linkedin/redirect-test", testRedirectUri);
  app.get("/api/debug/linkedin/redirect-uris", generateAllPossibleRedirectUris);
  app.get("/api/debug/request-headers", debugRequestHeaders);
  
  // Session debugging endpoints
  app.get("/api/debug/session/set", setSessionValue);
  app.get("/api/debug/session/get", getSessionValue);
  
  // Comprehensive LinkedIn diagnostic tool
  app.get("/linkedin/diagnostic-tool", generateDiagnosticReport);
  app.get("/api/linkedin/diagnostic-tool", runDiagnostics);
  
  // Simple LinkedIn auth endpoints with different redirect URI pattern
  app.get("/api/auth/linkedin/simple-url", getSimpleLinkedInAuthUrl);
  app.get("/callback", handleSimpleLinkedInCallback);
  
  // Fixed LinkedIn auth endpoints with simpler redirect URI
  app.get("/api/auth/linkedin/fixed-url", getFixedLinkedInAuthUrl);
  app.get("/fixed-callback", handleFixedLinkedInCallback);
  
  // Fixed method interface
  app.get("/linkedin/fixed", (req, res) => {
    res.sendFile('linkedin-fixed.html', { root: './client/public' });
  });
  
  // Direct manual LinkedIn profile entry
  app.get("/linkedin/direct", (req, res) => {
    res.sendFile('linkedin-direct.html', { root: './client/public' });
  });
  
  // Complete bypass mode - no authentication at all
  app.get("/linkedin/bypass", (req, res) => {
    res.sendFile('linkedin-bypass.html', { root: './client/public' });
  });
  
  // Manual registration and login endpoints
  app.post("/api/auth/register", registerUser);
  app.post("/api/auth/login", loginUser);
  
  // New simplified LinkedIn auth endpoints
  app.get("/api/auth/linkedin/simple", getSimpleAuthUrl);
  app.get("/simple-callback", handleSimpleCallback);
  
  // New direct HTML page for simple LinkedIn auth
  app.get("/linkedin/super-simple", (req, res) => {
    res.sendFile('linkedin-super-simple.html', { root: './client/public' });
  });
  
  // NEW LINKEDIN DIAGNOSTIC & CALLBACK ROUTES
  
  // Deep LinkedIn OAuth diagnostics
  app.get("/linkedin/deep-diagnostics", generateLinkedInDiagnosticPage);
  app.get("/api/deep-diagnostics/linkedin", testLinkedInPermutations);
  app.get("/linkedin/diagnostics", (req, res) => {
    res.sendFile('linkedin-diagnostic-results.html', { root: './client/public' });
  });
  
  app.get("/linkedin/test", (req, res) => {
    res.sendFile('linkedin-test.html', { root: './client/public' });
  });
  
  app.get("/linkedin/direct-test", (req, res) => {
    res.sendFile('linkedin-direct-test.html', { root: './client/public' });
  });
  
  // Simple direct test page
  app.get("/direct-linkedin", (req, res) => {
    res.sendFile('direct-linkedin-test.html', { root: './client/public' });
  });
  
  // Direct LinkedIn auth page - minimal approach
  app.get("/linkedin-auth", (req, res) => {
    res.sendFile('direct-linkedin-auth.html', { root: './client/public' });
  });
  
  app.get("/linkedin/advanced-diagnostics", (req, res) => {
    res.sendFile('linkedin-deep-diagnostics.html', { root: './client/public' });
  });
  
  app.get("/linkedin/direct-connection", (req, res) => {
    res.sendFile('linkedin-direct-connection.html', { root: './client/public' });
  });
  
  // Environment checker tool
  app.get("/linkedin/environment", (req, res) => {
    res.sendFile('check-environment.html', { root: './client/public' });
  });
  
  // Ultra-minimal LinkedIn test
  app.get("/linkedin/minimal", (req, res) => {
    res.sendFile('linkedin-direct-minimal.html', { root: './client/public' });
  });
  
  // Auto-detecting LinkedIn test
  app.get("/linkedin/auto-detect", (req, res) => {
    res.sendFile('linkedin-auto-detect.html', { root: './client/public' });
  });
  
  // New comprehensive diagnostic tool
  app.get("/linkedin/diagnostic", (req, res) => {
    res.sendFile('linkedin-diagnostic.html', { root: './client/public' });
  });
  
  // API endpoint for LinkedIn diagnostics
  app.get("/api/linkedin/diagnostics", getLinkedInDiagnostics);
  
  // Credentials check endpoint
  app.get("/api/linkedin/check-credentials", checkLinkedInCredentials);
  
  // Dynamic auth URL generator
  app.get("/api/auth/linkedin/generate", generateAuthUrl);
  
  // Universal callback handlers at different paths
  app.get("/callback", handleUniversalCallback);
  app.get("/api/callback", handleUniversalCallback);
  app.get("/api/auth/callback", handleUniversalCallback);
  // Original callback path is already registered
  
  // New minimal LinkedIn authentication routes
  app.get("/api/auth/linkedin/minimal-url", getMinimalAuthUrl);
  app.get("/minimal-callback", handleSuperMinimalCallback);
  
  // Minimal LinkedIn test page
  app.get("/linkedin/minimal-test", (req, res) => {
    res.sendFile('minimal-linkedin-test.html', { root: './client/public' });
  });
  
  // Auto-detect route for LinkedIn OAuth
  app.get("/api/auth/linkedin/auto-detect", generateAutoDetectAuthUrl);
  app.get("/api/auto-detect/callback", handleAutoDetectCallback);
  
  // Quick test routes - simplified minimal OAuth flow
  app.get("/api/quicktest/url", generateQuickTestUrl);
  app.get("/api/quicktest/callback", handleQuickTestCallback);
  
  // NEW SYSTEMATIC TESTING ROUTES
  app.get("/linkedin/systematic", (req, res) => {
    res.sendFile('linkedin-systematic-test.html', { root: './client/public' });
  });
  app.get("/api/linkedin/systematic/connection", testSystematicConnection);
  app.get("/api/linkedin/systematic/credentials", testSystematicCredentials);
  app.get("/api/linkedin/systematic/auth-url", testAuthorizationUrl);
  app.get("/api/linkedin/systematic/callback", handleSystematicCallback);
  app.post("/api/linkedin/systematic/exchange-token", exchangeToken);
  app.post("/api/linkedin/systematic/get-profile", getProfile);
  
  // Quick test HTML page
  app.get("/linkedin/quicktest", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>LinkedIn Quick Test</title>
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
            color: #0077B5;
          }
          .info-box {
            background-color: #f0f7ff;
            border-left: 4px solid #0077B5;
            padding: 15px;
            margin: 20px 0;
          }
          button {
            background-color: #0077B5;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
          }
          button:hover {
            background-color: #005e93;
          }
          #result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 4px;
            background-color: #f5f5f5;
            display: none;
          }
        </style>
      </head>
      <body>
        <h1>LinkedIn Quick Test</h1>
        
        <div class="info-box">
          <p>This is a simplified test of the LinkedIn OAuth flow. It tests only the authorization request and redirect handling, without completing the token exchange.</p>
          <p>Use this to verify that your LinkedIn application's redirect URI settings are correct.</p>
        </div>
        
        <button id="start-test">Run Quick Test</button>
        
        <div id="result"></div>
        
        <script>
          document.getElementById('start-test').addEventListener('click', async () => {
            try {
              document.getElementById('result').style.display = 'block';
              document.getElementById('result').innerHTML = 'Loading...';
              
              const response = await fetch('/api/quicktest/url');
              const data = await response.json();
              
              if (data.error) {
                document.getElementById('result').innerHTML = \`
                  <h3 style="color: #d00;">Error</h3>
                  <p>\${data.error}</p>
                  <pre>\${JSON.stringify(data, null, 2)}</pre>
                \`;
              } else {
                document.getElementById('result').innerHTML = \`
                  <h3 style="color: #0077B5;">Test Ready</h3>
                  <p>LinkedIn authorization URL generated successfully.</p>
                  <p><strong>Redirect URI:</strong> \${data.redirectUri}</p>
                  <p><strong>Client ID:</strong> \${data.clientIdPrefix}</p>
                  <p>Click the button below to start the authentication flow:</p>
                  <button onclick="window.location.href='\${data.url}'">Start Authentication</button>
                  <hr>
                  <details>
                    <summary>Technical Details</summary>
                    <pre>\${JSON.stringify(data, null, 2)}</pre>
                  </details>
                \`;
              }
            } catch (error) {
              document.getElementById('result').innerHTML = \`
                <h3 style="color: #d00;">Error</h3>
                <p>\${error.message}</p>
              \`;
            }
          });
        </script>
      </body>
      </html>
    `);
  });
  
  // Direct auth route - no JavaScript intermediary
  app.get("/linkedin/auth", (req, res) => {
    try {
      if (!process.env.LINKEDIN_CLIENT_ID) {
        return res.status(500).send("LinkedIn client ID not configured");
      }
      
      // Generate state
      const state = Math.random().toString(36).substring(2, 15);
      req.session.oauthState = state;
      
      // Get redirect URI
      let redirectUri = "";
      if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        redirectUri = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/auth/linkedin/callback`;
      } else if (process.env.REDIRECT_URI) {
        redirectUri = process.env.REDIRECT_URI;
      } else {
        redirectUri = 'http://localhost:5000/api/auth/linkedin/callback';
      }
      
      // Build LinkedIn auth URL
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.LINKEDIN_CLIENT_ID,
        redirect_uri: redirectUri,
        state: state,
        scope: 'r_liteprofile r_emailaddress'
      });
      
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
      console.log("Direct LinkedIn auth redirect to:", authUrl);
      
      // Redirect user directly to LinkedIn
      res.redirect(authUrl);
    } catch (error) {
      console.error("Direct LinkedIn auth error:", error);
      res.status(500).send("Error initiating LinkedIn authentication");
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
