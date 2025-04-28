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

/**
 * Get LinkedIn authorization URL with fixed format
 */
export const getFixedLinkedInAuthUrl = (req: Request, res: Response) => {
  try {
    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
      console.error("FIXED AUTH: LinkedIn credentials missing");
      return res.status(500).json({ error: "LinkedIn credentials not configured" });
    }
    
    // Use a fixed, simple state parameter
    const state = Math.random().toString(36).substring(2, 15);
    req.session.oauthState = state;
    
    // Determine the domain from request
    const host = req.headers.host || "";
    const protocol = req.secure || (req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
    
    // Always use the simplest possible redirect URI with NO path segments
    const redirectUri = `${protocol}://${host}/fixed-callback`;
    console.log(`FIXED AUTH: Using redirect URI: ${redirectUri}`);
    
    // Build LinkedIn auth URL with minimal parameters
    const authUrl = `${LINKEDIN_AUTH_URL}?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=r_liteprofile%20r_emailaddress`;
    
    // Log and return the URL
    console.log("FIXED AUTH: Generated LinkedIn auth URL");
    return res.json({ url: authUrl });
  } catch (error) {
    console.error("FIXED AUTH: Error generating LinkedIn auth URL:", error);
    return res.status(500).json({ error: "Failed to generate LinkedIn authorization URL" });
  }
};

/**
 * Handle LinkedIn callback with detailed logging
 */
export const handleFixedLinkedInCallback = async (req: Request, res: Response) => {
  console.log("FIXED AUTH: Received callback with query:", JSON.stringify(req.query));
  
  try {
    // Check for LinkedIn-provided errors
    if (req.query.error) {
      console.error("FIXED AUTH: LinkedIn returned error:", req.query.error, req.query.error_description);
      return res.redirect(`/?error=${req.query.error}&desc=${req.query.error_description}`);
    }
    
    // Verify required parameters
    const { code, state } = req.query;
    if (!code || !state) {
      console.error("FIXED AUTH: Missing code or state in callback", { hasCode: !!code, hasState: !!state });
      return res.redirect("/?error=missing_params");
    }
    
    // Verify state for security
    if (state !== req.session.oauthState) {
      console.error("FIXED AUTH: State mismatch", { 
        receivedState: state, 
        sessionState: req.session.oauthState 
      });
      return res.redirect("/?error=invalid_state");
    }
    
    // Determine redirect URI (must match what was used in auth request)
    const host = req.headers.host || "";
    const protocol = req.secure || (req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
    const redirectUri = `${protocol}://${host}/fixed-callback`;
    
    console.log("FIXED AUTH: Exchanging code for token using redirect URI:", redirectUri);
    
    // Exchange auth code for token
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code: code as string,
      redirect_uri: redirectUri,
      client_id: LINKEDIN_CLIENT_ID || "",
      client_secret: LINKEDIN_CLIENT_SECRET || ""
    });
    
    // Make token request with detailed error handling
    let tokenResponse;
    try {
      tokenResponse = await fetch(LINKEDIN_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: tokenParams
      });
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("FIXED AUTH: LinkedIn token exchange failed:", { 
          status: tokenResponse.status, 
          statusText: tokenResponse.statusText,
          error: errorText
        });
        return res.redirect(`/?error=token_exchange_failed&status=${tokenResponse.status}`);
      }
    } catch (error) {
      console.error("FIXED AUTH: Network error during token exchange:", error);
      return res.redirect("/?error=network_error");
    }
    
    // Parse token response
    let tokenData;
    try {
      tokenData = await tokenResponse.json();
      console.log("FIXED AUTH: Token obtained successfully");
    } catch (error) {
      console.error("FIXED AUTH: Error parsing token response:", error);
      return res.redirect("/?error=invalid_token_response");
    }
    
    if (!tokenData.access_token) {
      console.error("FIXED AUTH: Token response missing access_token");
      return res.redirect("/?error=missing_access_token");
    }
    
    const accessToken = tokenData.access_token;
    
    // Fetch LinkedIn profile
    let profileData;
    try {
      const profileResponse = await fetch(LINKEDIN_PROFILE_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        console.error("FIXED AUTH: LinkedIn profile fetch failed:", { 
          status: profileResponse.status, 
          error: errorText 
        });
        return res.redirect("/?error=profile_fetch_failed");
      }
      
      profileData = await profileResponse.json();
      console.log("FIXED AUTH: Profile fetched successfully");
    } catch (error) {
      console.error("FIXED AUTH: Error fetching profile:", error);
      return res.redirect("/?error=profile_error");
    }
    
    // Fetch LinkedIn email
    let emailData;
    try {
      const emailResponse = await fetch(LINKEDIN_EMAIL_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error("FIXED AUTH: LinkedIn email fetch failed:", { 
          status: emailResponse.status, 
          error: errorText 
        });
        return res.redirect("/?error=email_fetch_failed");
      }
      
      emailData = await emailResponse.json();
      console.log("FIXED AUTH: Email fetched successfully");
    } catch (error) {
      console.error("FIXED AUTH: Error fetching email:", error);
      return res.redirect("/?error=email_error");
    }
    
    // Extract user info
    if (!profileData.id) {
      console.error("FIXED AUTH: Profile data missing ID", profileData);
      return res.redirect("/?error=missing_profile_id");
    }
    
    const linkedinId = profileData.id;
    const firstName = profileData.localizedFirstName || "";
    const lastName = profileData.localizedLastName || "";
    const email = emailData.elements?.[0]?.["handle~"]?.emailAddress || "";
    
    console.log(`FIXED AUTH: Processing user ${firstName} ${lastName} (${email}) with LinkedIn ID ${linkedinId}`);
    
    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.linkedinId, linkedinId)
    });
    
    if (!user) {
      console.log("FIXED AUTH: Creating new user");
      
      const userData = {
        linkedinId,
        email,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim() || "LinkedIn User",
        profilePictureUrl: "",
        linkedinProfileUrl: `https://www.linkedin.com/in/${linkedinId}`,
        lastLoginAt: new Date()
      };
      
      try {
        const validatedData = insertUserSchema.parse(userData);
        const [newUser] = await db.insert(users).values(validatedData).returning();
        user = newUser;
        console.log("FIXED AUTH: User created successfully", user.id);
      } catch (error) {
        console.error("FIXED AUTH: Error creating user:", error);
        return res.redirect("/?error=user_creation_failed");
      }
    } else {
      console.log("FIXED AUTH: Updating existing user", user.id);
      
      try {
        await db
          .update(users)
          .set({
            email,
            firstName,
            lastName,
            displayName: `${firstName} ${lastName}`.trim() || user.displayName,
            lastLoginAt: new Date()
          })
          .where(eq(users.linkedinId, linkedinId));
      } catch (error) {
        console.error("FIXED AUTH: Error updating user:", error);
        // Continue with existing user even if update fails
      }
    }
    
    // Set session
    req.session.userId = user.id;
    req.session.linkedinId = linkedinId;
    req.session.linkedinProfileUrl = `https://www.linkedin.com/in/${linkedinId}`;
    
    console.log("FIXED AUTH: User session established, redirecting to home");
    return res.redirect("/");
  } catch (error) {
    console.error("FIXED AUTH: Unhandled error in OAuth callback:", error);
    return res.redirect("/?error=authentication_failed");
  }
};