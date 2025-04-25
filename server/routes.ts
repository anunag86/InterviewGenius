import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { generateInterview, getInterviewStatus, getInterviewHistory } from "./controllers/interview";
import { submitFeedback } from "./controllers/feedback";

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
  
  // Feedback endpoint
  app.post("/api/feedback", submitFeedback);

  const httpServer = createServer(app);

  return httpServer;
}
