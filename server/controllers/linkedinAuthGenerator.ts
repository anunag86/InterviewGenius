import { Request, Response } from "express";

// LinkedIn OAuth configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";

/**
 * Generate LinkedIn authorization URL for various paths
 * Allows specifying the callback path to test different redirect URI patterns
 */
export const generateAuthUrl = (req: Request, res: Response) => {
  try {
    // Check if client ID is configured
    if (!LINKEDIN_CLIENT_ID) {
      console.error("AUTH GENERATOR: LinkedIn client ID not configured");
      return res.status(500).json({ error: "LinkedIn client ID not configured" });
    }
    
    // Get callback path from query parameter, defaulting to root callback
    const callbackPath = req.query.callbackPath || "/callback";
    
    // Generate a unique state parameter
    const state = Math.random().toString(36).substring(2, 15);
    req.session.oauthState = state;
    
    // Build the redirect URI using the callback path and current hostname
    // For Replit, we need to use the environment variables to get the correct domain
    let redirectUri;
    
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      redirectUri = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co${callbackPath}`;
      console.log("AUTH GENERATOR: Using Replit domain for redirect URI");
    } else {
      const protocol = req.secure || (req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
      const host = req.headers.host || "";
      redirectUri = `${protocol}://${host}${callbackPath}`;
      console.log("AUTH GENERATOR: Using request headers for redirect URI");
    }
    
    // Special case for Replit Nix environment (dev environment)
    if (req.headers.host?.includes('picard.replit.dev')) {
      redirectUri = `https://${req.headers.host}${callbackPath}`;
      console.log("AUTH GENERATOR: Using picard.replit.dev domain for redirect URI");
    }
    
    // Build the authorization URL
    const params = new URLSearchParams({
      response_type: "code",
      client_id: LINKEDIN_CLIENT_ID,
      redirect_uri: redirectUri,
      state: state,
      scope: "r_liteprofile r_emailaddress"
    });
    
    const authUrl = `${LINKEDIN_AUTH_URL}?${params.toString()}`;
    
    console.log("AUTH GENERATOR: Generated LinkedIn auth URL:", { redirectUri, authUrl });
    
    // Return both the URL and the redirect URI for confirmation
    return res.json({
      url: authUrl,
      redirectUri: redirectUri
    });
  } catch (error) {
    console.error("AUTH GENERATOR: Error generating LinkedIn auth URL:", error);
    return res.status(500).json({ error: "Failed to generate LinkedIn authorization URL" });
  }
};