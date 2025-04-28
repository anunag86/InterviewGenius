import { Request, Response } from "express";
import { db } from "../../db";
import { users, insertUserSchema } from "../../shared/schema";
import { eq } from "drizzle-orm";

// LinkedIn OAuth configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

// LinkedIn API endpoints
const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_PROFILE_URL = "https://api.linkedin.com/v2/me";
const LINKEDIN_EMAIL_URL = "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))";

// Collection of alternative URIs to try
const ALTERNATIVE_URIS = [
  // Standard API path
  "/api/auth/linkedin/callback",
  // Without API prefix
  "/auth/linkedin/callback",
  // Simple root path
  "/callback",
  // LinkedIn specific path
  "/linkedin/callback"
];

/**
 * Generates a LinkedIn authorization URL with simpler params
 */
export const getSimpleLinkedInAuthUrl = (req: Request, res: Response) => {
  try {
    if (!LINKEDIN_CLIENT_ID) {
      return res.status(500).json({ error: "LinkedIn client ID not configured" });
    }
    
    const state = Math.random().toString(36).substring(2, 15);
    req.session.oauthState = state;
    
    // Use a simpler redirect URI pattern - just /callback at the root
    let baseUrl = "";
    
    // First check for an explicit override
    if (process.env.LINKEDIN_REDIRECT_BASE) {
      baseUrl = process.env.LINKEDIN_REDIRECT_BASE;
      console.log(`Using explicit LINKEDIN_REDIRECT_BASE: ${baseUrl}`);
    } 
    // Then try to derive from Replit
    else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      baseUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      console.log(`Using Replit-derived base URL: ${baseUrl}`);
    } 
    // Fallback to localhost
    else {
      baseUrl = 'http://localhost:5000';
      console.log(`Using localhost base URL: ${baseUrl}`);
    }
    
    // Get path override if specified, or use the simplest one
    const path = process.env.LINKEDIN_REDIRECT_PATH || "/callback";
    const redirectUri = `${baseUrl}${path}`;
    
    console.log(`SIMPLE AUTH: Using redirect URI: ${redirectUri}`);
    
    // Use the simpler URI format that LinkedIn prefers
    const authUrl = `${LINKEDIN_AUTH_URL}?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=r_liteprofile%20r_emailaddress`;
    
    return res.json({ url: authUrl });
  } catch (error) {
    console.error("Error generating simple LinkedIn auth URL:", error);
    return res.status(500).json({ error: "Failed to generate LinkedIn authorization URL" });
  }
};

/**
 * Handle LinkedIn OAuth callback at the root level
 */
export const handleSimpleLinkedInCallback = async (req: Request, res: Response) => {
  console.log(`SIMPLE AUTH CALLBACK received with query params:`, req.query);
  
  try {
    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
      console.error("Missing LinkedIn credentials");
      return res.redirect("/?error=missing_credentials");
    }
    
    const { code, state, error, error_description } = req.query;
    
    if (error) {
      console.error(`SIMPLE AUTH: LinkedIn OAuth error: ${error} - ${error_description}`);
      return res.redirect(`/?error=${error}&error_description=${error_description}`);
    }
    
    if (!code || !state) {
      console.error("SIMPLE AUTH: Missing required OAuth parameters");
      return res.redirect("/?error=missing_parameters");
    }
    
    if (state !== req.session.oauthState) {
      console.error(`SIMPLE AUTH: State mismatch: ${state} vs ${req.session.oauthState}`);
      return res.redirect("/?error=invalid_state");
    }
    
    console.log("SIMPLE AUTH: State verified, exchanging code for token...");
    
    // Get base URL for redirect URI (must match what was used in the auth request)
    let baseUrl = "";
    if (process.env.LINKEDIN_REDIRECT_BASE) {
      baseUrl = process.env.LINKEDIN_REDIRECT_BASE;
    } else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      baseUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    } else {
      baseUrl = 'http://localhost:5000';
    }
    
    // Get path override if specified, or use the simplest one
    const path = process.env.LINKEDIN_REDIRECT_PATH || "/callback";
    const redirectUri = `${baseUrl}${path}`;
    
    // Exchange code for access token
    const tokenResponse = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: redirectUri,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`SIMPLE AUTH: Token exchange failed: ${tokenResponse.status} - ${errorText}`);
      return res.redirect("/?error=token_exchange_failed");
    }
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error("SIMPLE AUTH: Token response missing access_token");
      return res.redirect("/?error=invalid_token_response");
    }
    
    console.log("SIMPLE AUTH: Token obtained, fetching profile...");
    const accessToken = tokenData.access_token;
    
    // Get user profile
    const profileResponse = await fetch(LINKEDIN_PROFILE_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error(`SIMPLE AUTH: Profile fetch failed: ${profileResponse.status} - ${errorText}`);
      return res.redirect("/?error=profile_fetch_failed");
    }
    
    const profileData = await profileResponse.json();
    console.log("SIMPLE AUTH: Profile fetched successfully");
    
    // Get user email
    const emailResponse = await fetch(LINKEDIN_EMAIL_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error(`SIMPLE AUTH: Email fetch failed: ${emailResponse.status} - ${errorText}`);
      return res.redirect("/?error=email_fetch_failed");
    }
    
    const emailData = await emailResponse.json();
    console.log("SIMPLE AUTH: Email fetched successfully");
    
    // Process user data
    const linkedinId = profileData.id;
    if (!linkedinId) {
      console.error("SIMPLE AUTH: Missing profile ID");
      return res.redirect("/?error=missing_profile_id");
    }
    
    const firstName = profileData.localizedFirstName || "";
    const lastName = profileData.localizedLastName || "";
    const email = emailData.elements?.[0]?.["handle~"]?.emailAddress || "";
    
    console.log(`SIMPLE AUTH: Processing user ${firstName} ${lastName} (${email})`);
    
    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.linkedinId, linkedinId),
    });
    
    if (!user) {
      console.log(`SIMPLE AUTH: Creating new user for LinkedIn ID ${linkedinId}`);
      
      const userData = {
        linkedinId,
        email,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim() || "LinkedIn User",
        profilePictureUrl: "",
        linkedinProfileUrl: `https://www.linkedin.com/in/${linkedinId}`,
        lastLoginAt: new Date(),
      };
      
      try {
        const validatedData = insertUserSchema.parse(userData);
        const [newUser] = await db.insert(users).values(validatedData).returning();
        user = newUser;
        console.log(`SIMPLE AUTH: User created with ID ${user.id}`);
      } catch (error) {
        console.error("SIMPLE AUTH: Error creating user:", error);
        return res.redirect("/?error=user_creation_failed");
      }
    } else {
      console.log(`SIMPLE AUTH: Updating existing user ${user.id}`);
      
      try {
        await db
          .update(users)
          .set({
            email,
            firstName,
            lastName,
            displayName: `${firstName} ${lastName}`.trim() || user.displayName,
            lastLoginAt: new Date(),
          })
          .where(eq(users.linkedinId, linkedinId));
      } catch (error) {
        console.error("SIMPLE AUTH: Error updating user:", error);
      }
    }
    
    // Set session data
    req.session.userId = user.id;
    req.session.linkedinId = linkedinId;
    req.session.linkedinProfileUrl = `https://www.linkedin.com/in/${linkedinId}`;
    
    console.log("SIMPLE AUTH: Session established, redirecting to home");
    return res.redirect("/");
  } catch (error) {
    console.error("SIMPLE AUTH: Unhandled error:", error);
    return res.redirect("/?error=authentication_failed");
  }
};