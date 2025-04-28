import { Request, Response } from "express";
import { db } from "../../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";

// LinkedIn OAuth configuration (simpler implementation)
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

// LinkedIn API endpoints
const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_PROFILE_URL = "https://api.linkedin.com/v2/me";
const LINKEDIN_EMAIL_URL = "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))";

/**
 * Get simplified LinkedIn authorization URL
 */
export const getSimpleAuthUrl = (req: Request, res: Response) => {
  try {
    if (!LINKEDIN_CLIENT_ID) {
      return res.status(500).json({ error: "LinkedIn client ID not configured" });
    }
    
    // Generate a simpler state parameter
    const state = "linkedinauth";
    req.session.oauthState = state;
    
    // Determine a simpler redirect URI 
    // Note: Using the root domain instead of paths to avoid redirect URI mismatches
    const host = req.headers.host || "";
    const protocol = req.secure || (req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
    const redirectUri = `${protocol}://${host}/simple-callback`;
    
    // Build simplest possible LinkedIn auth URL (minimal parameters)
    const authUrl = `${LINKEDIN_AUTH_URL}?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    
    console.log("SIMPLE AUTH: Generated LinkedIn auth URL with minimal params:", authUrl);
    return res.json({ url: authUrl });
  } catch (error) {
    console.error("SIMPLE AUTH: Error generating LinkedIn auth URL:", error);
    return res.status(500).json({ error: "Failed to generate LinkedIn authorization URL" });
  }
};

/**
 * Handle simplified LinkedIn callback
 */
export const handleSimpleCallback = async (req: Request, res: Response) => {
  console.log("SIMPLE AUTH: Callback received with query params:", req.query);
  
  try {
    // Check for LinkedIn-provided errors
    if (req.query.error) {
      console.error("SIMPLE AUTH: LinkedIn returned error:", req.query.error);
      return res.redirect(`/?error=${req.query.error}`);
    }
    
    // Get minimal required params
    const { code } = req.query;
    if (!code) {
      console.error("SIMPLE AUTH: Missing authorization code");
      return res.redirect("/?error=missing_code");
    }
    
    // Build simple redirect URI (same as auth request)
    const host = req.headers.host || "";
    const protocol = req.secure || (req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
    const redirectUri = `${protocol}://${host}/simple-callback`;
    
    console.log("SIMPLE AUTH: Using simple redirect URI:", redirectUri);
    
    // Exchange code for token with minimal parameters
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code: code as string,
      redirect_uri: redirectUri,
      client_id: LINKEDIN_CLIENT_ID || "",
      client_secret: LINKEDIN_CLIENT_SECRET || ""
    });
    
    console.log("SIMPLE AUTH: Exchanging code for token with params:", tokenParams.toString());
    
    const tokenResponse = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: tokenParams
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("SIMPLE AUTH: Token exchange failed:", { 
        status: tokenResponse.status, 
        error: errorText 
      });
      return res.redirect(`/?error=token_exchange_failed&status=${tokenResponse.status}`);
    }
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error("SIMPLE AUTH: Token response missing access token");
      return res.redirect("/?error=missing_token");
    }
    
    console.log("SIMPLE AUTH: Successfully obtained access token");
    
    // Use a simpler linked ID as fallback (in case profile fetch fails)
    const tempId = Math.random().toString(36).substring(2, 15);
    let linkedinId = `temp_${tempId}`;
    let email = "";
    let firstName = "";
    let lastName = "";
    
    try {
      // Get basic profile info first
      const profileResponse = await fetch(LINKEDIN_PROFILE_URL, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      });
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        console.log("SIMPLE AUTH: Successfully retrieved profile");
        
        linkedinId = profileData.id || linkedinId;
        firstName = profileData.localizedFirstName || "";
        lastName = profileData.localizedLastName || "";
      } else {
        console.error("SIMPLE AUTH: Profile fetch failed, using fallback ID");
      }
      
      // Try to get email
      const emailResponse = await fetch(LINKEDIN_EMAIL_URL, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      });
      
      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        console.log("SIMPLE AUTH: Successfully retrieved email");
        email = emailData.elements?.[0]?.["handle~"]?.emailAddress || "";
      } else {
        console.error("SIMPLE AUTH: Email fetch failed, using empty email");
      }
    } catch (error) {
      console.error("SIMPLE AUTH: Error fetching profile data:", error);
      // Continue with fallback ID
    }
    
    // Create or find user with minimal required info
    console.log("SIMPLE AUTH: Processing user with LinkedIn ID:", linkedinId);
    
    let user = await db.query.users.findFirst({
      where: eq(users.linkedinId, linkedinId)
    });
    
    if (!user) {
      console.log("SIMPLE AUTH: Creating new user with ID:", linkedinId);
      
      try {
        const [newUser] = await db.insert(users).values({
          linkedinId,
          email: email || "",
          firstName: firstName || "",
          lastName: lastName || "",
          displayName: `${firstName} ${lastName}`.trim() || "LinkedIn User",
          profilePictureUrl: "",
          linkedinProfileUrl: `https://www.linkedin.com/in/${linkedinId}`,
          lastLoginAt: new Date()
        }).returning();
        
        user = newUser;
        console.log("SIMPLE AUTH: User created successfully with ID:", user.id);
      } catch (error) {
        console.error("SIMPLE AUTH: Error creating user:", error);
        return res.redirect("/?error=user_creation_failed");
      }
    } else {
      console.log("SIMPLE AUTH: Found existing user with ID:", user.id);
      
      // Quick update of last login time
      try {
        await db.update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, user.id));
      } catch (error) {
        console.error("SIMPLE AUTH: Error updating login time:", error);
        // Continue anyway with existing user
      }
    }
    
    // Set simplified session
    req.session.userId = user.id;
    req.session.linkedinId = linkedinId;
    
    console.log("SIMPLE AUTH: Session created successfully, redirecting to home");
    return res.redirect("/");
  } catch (error) {
    console.error("SIMPLE AUTH: Unhandled error:", error);
    return res.redirect("/?error=authentication_failed");
  }
};