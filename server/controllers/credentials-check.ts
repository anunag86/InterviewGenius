import { Request, Response } from "express";

/**
 * Check LinkedIn credentials
 */
export const checkLinkedInCredentials = (req: Request, res: Response) => {
  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID || "";
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || "";
    
    // Only return first 4 characters for security
    const clientIdPrefix = clientId.substring(0, 4) + "...";
    const clientSecretPrefix = clientSecret.substring(0, 4) + "...";
    
    res.json({
      clientIdExists: !!clientId,
      clientSecretExists: !!clientSecret,
      clientIdPrefix,
      clientSecretPrefix,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error checking credentials:", error);
    res.status(500).json({ error: "Failed to check credentials" });
  }
};