import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { generateInterview, getInterviewStatus, getInterviewHistory, saveUserResponse, getUserResponsesForInterview, gradeUserResponse } from "./controllers/interview";
import { submitFeedback } from "./controllers/feedback";
import { ensureAuthenticated } from "./auth";

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
  // Public API routes
  app.post("/api/feedback", submitFeedback);
  
  // Authentication status endpoint
  app.get('/api/auth/status', (req, res) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      user: req.user
    });
  });
  
  // LinkedIn authentication diagnostics endpoint
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
