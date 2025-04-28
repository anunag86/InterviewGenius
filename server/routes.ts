import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { generateInterview, getInterviewStatus, getInterviewHistory, saveUserResponse, getUserResponsesForInterview, gradeUserResponse } from "./controllers/interview";
import { submitFeedback } from "./controllers/feedback";
import { getLinkedInAuthUrl, handleLinkedInCallback, getCurrentUser, logout } from "./controllers/auth";
import { getLinkedInDiagnostics } from "./controllers/diagnostics";
import { getSimpleLinkedInAuthUrl, handleSimpleLinkedInCallback } from "./controllers/altauth";
import { getFixedLinkedInAuthUrl, handleFixedLinkedInCallback } from "./controllers/fixedAuthLinkedin";
import { handleManualLinkedInProfile } from "./controllers/manualAuth";
import { getSimpleAuthUrl, handleSimpleCallback } from "./controllers/simpleAuth";
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
  app.get("/api/auth/linkedin/url", getLinkedInAuthUrl);
  app.get("/api/auth/linkedin/callback", handleLinkedInCallback);
  app.get("/api/auth/me", getCurrentUser);
  app.post("/api/auth/logout", logout);
  
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
  
  // Manual LinkedIn profile submission endpoint
  app.post("/api/auth/manual-linkedin", handleManualLinkedInProfile);
  
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
  
  app.get("/linkedin/advanced-diagnostics", (req, res) => {
    res.sendFile('linkedin-deep-diagnostics.html', { root: './client/public' });
  });
  
  app.get("/linkedin/direct-connection", (req, res) => {
    res.sendFile('linkedin-direct-connection.html', { root: './client/public' });
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
