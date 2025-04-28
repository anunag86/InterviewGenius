import { Request, Response } from "express";
import { db } from "../../db";
import { users, insertUserSchema } from "../../shared/schema";
import { eq } from "drizzle-orm";
import "express-session";

// LinkedIn OAuth configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

// Determine the exact LinkedIn redirect URI to use
// This must match the URI registered in the LinkedIn Developer app settings
let REDIRECT_URI: string;

// Explicitly log environment variables for debugging LinkedIn connectivity issues
console.log(`DEBUG LinkedIn OAuth - Environment variables:
  REPL_SLUG: ${process.env.REPL_SLUG || 'not set'}
  REPL_OWNER: ${process.env.REPL_OWNER || 'not set'}
  REDIRECT_URI env var: ${process.env.REDIRECT_URI || 'not set'}
  NODE_ENV: ${process.env.NODE_ENV || 'not set'}
`);

// Prioritize the explicit REDIRECT_URI if set (most reliable)
if (process.env.REDIRECT_URI) {
  REDIRECT_URI = process.env.REDIRECT_URI;
  console.log(`Using explicitly configured REDIRECT_URI: ${REDIRECT_URI}`);
} 
// Otherwise use Replit URL if in Replit environment
else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
  REDIRECT_URI = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/auth/linkedin/callback`;
  console.log(`Using Replit-derived REDIRECT_URI: ${REDIRECT_URI}`);
} 
// Fallback to localhost for local development
else {
  REDIRECT_URI = 'http://localhost:5000/api/auth/linkedin/callback';
  console.log(`Using local development REDIRECT_URI: ${REDIRECT_URI}`);
}

// IMPORTANT: This URI must exactly match what's registered in the LinkedIn Developer App
console.log(`FINAL LinkedIn OAuth redirect URI: ${REDIRECT_URI}`);

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
  console.log("LinkedIn callback received with query params:", req.query);
  
  try {
    // Validate required environment variables
    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
      console.error("Missing LinkedIn credentials:", { 
        hasClientId: !!LINKEDIN_CLIENT_ID, 
        hasClientSecret: !!LINKEDIN_CLIENT_SECRET 
      });
      return res.redirect("/auth/callback?error=missing_credentials");
    }
    
    const { code, state, error, error_description } = req.query;
    
    // Handle LinkedIn-provided errors (user denied access, etc.)
    if (error) {
      console.error("LinkedIn OAuth error:", { error, error_description });
      return res.redirect(`/auth/callback?error=${error}&error_description=${error_description}`);
    }
    
    // Verify that required params are present
    if (!code || !state) {
      console.error("Missing required OAuth parameters:", { hasCode: !!code, hasState: !!state });
      return res.redirect("/auth/callback?error=missing_parameters");
    }
    
    // Verify state to prevent CSRF attacks
    if (state !== req.session.oauthState) {
      console.error("OAuth state mismatch:", { 
        receivedState: state, 
        expectedState: req.session.oauthState || "no state in session" 
      });
      return res.redirect("/auth/callback?error=invalid_state");
    }
    
    console.log("LinkedIn OAuth state verified, exchanging code for token...");
    
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
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("LinkedIn token exchange failed:", { 
        status: tokenResponse.status, 
        statusText: tokenResponse.statusText,
        errorText
      });
      return res.redirect("/auth/callback?error=token_exchange_failed");
    }
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error("LinkedIn token response missing access_token:", tokenData);
      return res.redirect("/auth/callback?error=invalid_token_response");
    }
    
    console.log("LinkedIn token obtained successfully, fetching profile...");
    const accessToken = tokenData.access_token;
    
    // Get user profile information
    const profileResponse = await fetch(LINKEDIN_PROFILE_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error("LinkedIn profile fetch failed:", { 
        status: profileResponse.status, 
        statusText: profileResponse.statusText,
        errorText 
      });
      return res.redirect("/auth/callback?error=profile_fetch_failed");
    }
    
    const profileData = await profileResponse.json();
    console.log("LinkedIn profile retrieved successfully");
    
    // Get user email
    const emailResponse = await fetch(LINKEDIN_EMAIL_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("LinkedIn email fetch failed:", { 
        status: emailResponse.status, 
        statusText: emailResponse.statusText,
        errorText
      });
      return res.redirect("/auth/callback?error=email_fetch_failed");
    }
    
    const emailData = await emailResponse.json();
    console.log("LinkedIn email retrieved successfully");
    
    // Extract profile information
    const linkedinId = profileData.id;
    if (!linkedinId) {
      console.error("LinkedIn profile data missing ID:", profileData);
      return res.redirect("/auth/callback?error=missing_profile_id");
    }
    
    const firstName = profileData.localizedFirstName || "";
    const lastName = profileData.localizedLastName || "";
    const email = emailData.elements?.[0]?.["handle~"]?.emailAddress || "";
    const pictureUrl = profileData.profilePicture?.["displayImage~"]?.elements?.[0]?.identifiers?.[0]?.identifier || "";

    console.log("Processing user data for LinkedIn ID:", linkedinId);
    
    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.linkedinId, linkedinId),
    });
    
    if (!user) {
      console.log("Creating new user for LinkedIn ID:", linkedinId);
      // Create new user
      const userData = {
        linkedinId,
        email,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim() || "LinkedIn User",
        profilePictureUrl: pictureUrl,
        linkedinProfileUrl: `https://www.linkedin.com/in/${linkedinId}`,
        lastLoginAt: new Date(),
      };
      
      try {
        const validatedData = insertUserSchema.parse(userData);
        const [newUser] = await db.insert(users).values(validatedData).returning();
        user = newUser;
        console.log("New user created successfully:", user.id);
      } catch (error) {
        console.error("Error creating user:", error);
        return res.redirect("/auth/callback?error=user_creation_failed");
      }
    } else {
      console.log("Updating existing user:", user.id);
      // Update existing user
      try {
        await db
          .update(users)
          .set({
            email,
            firstName,
            lastName,
            displayName: `${firstName} ${lastName}`.trim() || user.displayName,
            profilePictureUrl: pictureUrl || user.profilePictureUrl,
            lastLoginAt: new Date(),
          })
          .where(eq(users.linkedinId, linkedinId));
        console.log("User updated successfully");
      } catch (error) {
        console.error("Error updating user:", error);
        // Continue with existing user data even if update fails
      }
    }
    
    // Set user session
    req.session.userId = user.id;
    req.session.linkedinId = linkedinId;
    req.session.linkedinProfileUrl = `https://www.linkedin.com/in/${linkedinId}`;
    
    console.log("User session established, redirecting to callback page");
    
    // Redirect to client-side callback page
    return res.redirect("/auth/callback");
  } catch (error) {
    console.error("LinkedIn callback error:", error);
    // Redirect to client callback with error
    return res.redirect("/auth/callback?error=authentication_failed");
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