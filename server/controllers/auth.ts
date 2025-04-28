import { Request, Response } from "express";
import { db } from "../../db";
import { users, insertUserSchema } from "../../shared/schema";
import { eq } from "drizzle-orm";
import "express-session";

// LinkedIn OAuth configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

// Define a list of supported redirect URIs for LinkedIn OAuth
// This handles both development and production environments
const SUPPORTED_REDIRECT_URIS = [
  // Local development
  'http://localhost:5000/api/auth/linkedin/callback',
  // Replit domain
  `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/auth/linkedin/callback`,
  // Custom domain if provided
  process.env.REDIRECT_URI,
].filter(Boolean); // Remove any undefined/null values

// Log available redirect URIs for debugging
console.log('Available LinkedIn redirect URIs:', SUPPORTED_REDIRECT_URIS);

// Use the first redirect URI as the default
const REDIRECT_URI = SUPPORTED_REDIRECT_URIS[0] || 'http://localhost:5000/api/auth/linkedin/callback';

// LinkedIn API endpoints
const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_PROFILE_URL = "https://api.linkedin.com/v2/me";
const LINKEDIN_EMAIL_URL = "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))";

/**
 * Get LinkedIn authorization URL
 */
export const getLinkedInAuthUrl = (req: Request, res: Response) => {
  if (!LINKEDIN_CLIENT_ID) {
    return res.status(500).json({ 
      error: "LinkedIn client ID not configured" 
    });
  }

  const state = Math.random().toString(36).substring(2, 15);
  // Store state in session to prevent CSRF attacks
  req.session.oauthState = state;
  
  const authUrl = `${LINKEDIN_AUTH_URL}?response_type=code` +
    `&client_id=${LINKEDIN_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&state=${state}` +
    `&scope=r_liteprofile%20r_emailaddress`;
  
  console.log("LinkedIn Auth URL generated:", authUrl);
  return res.json({ url: authUrl });
};

/**
 * Handle LinkedIn OAuth callback and user session creation
 */
export const handleLinkedInCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    
    // Verify state to prevent CSRF attacks
    if (state !== req.session.oauthState) {
      return res.status(400).json({ error: "Invalid state parameter" });
    }
    
    // Exchange code for access token
    const tokenResponse = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: REDIRECT_URI,
        client_id: LINKEDIN_CLIENT_ID || "",
        client_secret: LINKEDIN_CLIENT_SECRET || "",
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("LinkedIn token error:", tokenData);
      return res.status(400).json({ error: "Failed to get access token" });
    }
    
    const accessToken = tokenData.access_token;
    
    // Get user profile information
    const profileResponse = await fetch(LINKEDIN_PROFILE_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    const profileData = await profileResponse.json();
    
    if (!profileResponse.ok) {
      console.error("LinkedIn profile error:", profileData);
      return res.status(400).json({ error: "Failed to fetch LinkedIn profile" });
    }
    
    // Get user email
    const emailResponse = await fetch(LINKEDIN_EMAIL_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    const emailData = await emailResponse.json();
    
    if (!emailResponse.ok) {
      console.error("LinkedIn email error:", emailData);
      return res.status(400).json({ error: "Failed to fetch LinkedIn email" });
    }
    
    // Extract profile information
    const linkedinId = profileData.id;
    const firstName = profileData.localizedFirstName;
    const lastName = profileData.localizedLastName;
    const email = emailData.elements?.[0]?.["handle~"]?.emailAddress;
    const pictureUrl = profileData.profilePicture?.["displayImage~"]?.elements?.[0]?.identifiers?.[0]?.identifier;

    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.linkedinId, linkedinId),
    });
    
    if (!user) {
      // Create new user
      const userData = {
        linkedinId,
        email,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        profilePictureUrl: pictureUrl,
        linkedinProfileUrl: `https://www.linkedin.com/in/${linkedinId}`,
        lastLoginAt: new Date(),
      };
      
      try {
        const validatedData = insertUserSchema.parse(userData);
        const [newUser] = await db.insert(users).values(validatedData).returning();
        user = newUser;
      } catch (error) {
        console.error("Error creating user:", error);
        return res.status(500).json({ error: "Failed to create user account" });
      }
    } else {
      // Update existing user
      await db
        .update(users)
        .set({
          email,
          firstName,
          lastName,
          displayName: `${firstName} ${lastName}`,
          profilePictureUrl: pictureUrl,
          lastLoginAt: new Date(),
        })
        .where(eq(users.linkedinId, linkedinId));
    }
    
    // Set user session
    req.session.userId = user.id;
    req.session.linkedinId = linkedinId;
    req.session.linkedinProfileUrl = `https://www.linkedin.com/in/${linkedinId}`;
    
    // Redirect to client-side callback page
    return res.redirect("/auth/callback");
  } catch (error) {
    console.error("LinkedIn callback error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.session.userId),
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      profilePictureUrl: user.profilePictureUrl,
      linkedinProfileUrl: user.linkedinProfileUrl,
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({ error: "Failed to get user profile" });
  }
};

/**
 * Log out current user
 */
export const logout = (req: Request, res: Response) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ error: "Failed to logout" });
    }
    
    res.clearCookie("connect.sid");
    return res.json({ success: true });
  });
};