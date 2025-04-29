import { Express } from "express";
import { getLinkedInAuthUrl, handleLinkedInCallback, getCurrentUser, logout } from "./controllers/auth";

/**
 * Register authentication routes
 */
export function registerAuthRoutes(app: Express) {
  // LinkedIn OAuth routes
  app.get("/api/auth/linkedin/url", getLinkedInAuthUrl);
  app.get("/api/auth/linkedin/callback", handleLinkedInCallback);
  
  // User authentication routes
  app.get("/api/auth/me", getCurrentUser);
  app.post("/api/auth/logout", logout);

  console.log("Auth routes registered successfully");
}