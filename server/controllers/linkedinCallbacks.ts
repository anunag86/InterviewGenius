import { Request, Response } from "express";
import { db } from "../../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";

// LinkedIn OAuth configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

// LinkedIn API endpoints
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_PROFILE_URL = "https://api.linkedin.com/v2/me";
const LINKEDIN_EMAIL_URL = "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))";

/**
 * Universal LinkedIn OAuth callback handler that works with any path
 * Can be mounted at any path, including:
 * - /callback
 * - /api/callback
 * - /api/auth/callback
 * - /api/auth/linkedin/callback
 */
export const handleUniversalCallback = async (req: Request, res: Response) => {
  console.log(`UNIVERSAL CALLBACK [${req.path}]: Received request`, { 
    query: req.query,
    headers: {
      host: req.headers.host,
      referer: req.headers.referer
    }
  });
  
  try {
    // Check for LinkedIn-provided errors
    if (req.query.error) {
      console.error(`UNIVERSAL CALLBACK [${req.path}]: LinkedIn returned error:`, req.query.error, req.query.error_description);
      return res.redirect(`/?error=${req.query.error}&desc=${encodeURIComponent(req.query.error_description as string || '')}`);
    }
    
    // Verify required parameters
    const { code } = req.query;
    if (!code) {
      console.error(`UNIVERSAL CALLBACK [${req.path}]: Missing authorization code`);
      return res.redirect("/?error=missing_code");
    }
    
    // Determine the redirect URI that was used
    // This MUST match exactly what was used in the authorization request
    let redirectUri;
    
    // For Replit, we need to use the environment variables to get the correct domain
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      redirectUri = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co${req.originalUrl.split('?')[0]}`;
      console.log(`UNIVERSAL CALLBACK [${req.path}]: Using Replit domain for redirect URI`);
    } else {
      const protocol = req.secure || (req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
      const host = req.headers.host || "";
      redirectUri = `${protocol}://${host}${req.originalUrl.split('?')[0]}`;
      console.log(`UNIVERSAL CALLBACK [${req.path}]: Using request headers for redirect URI`);
    }
    
    // Special case for Replit Nix environment (dev environment)
    if (req.headers.host?.includes('picard.replit.dev')) {
      redirectUri = `https://${req.headers.host}${req.originalUrl.split('?')[0]}`;
      console.log(`UNIVERSAL CALLBACK [${req.path}]: Using picard.replit.dev domain for redirect URI`);
    }
    
    console.log(`UNIVERSAL CALLBACK [${req.path}]: Using redirect URI:`, redirectUri);
    
    // Exchange the authorization code for an access token
    const tokenResponse = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: redirectUri,
        client_id: LINKEDIN_CLIENT_ID || "",
        client_secret: LINKEDIN_CLIENT_SECRET || ""
      })
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`UNIVERSAL CALLBACK [${req.path}]: Token exchange failed:`, {
        status: tokenResponse.status,
        error: errorText,
        requestDetails: {
          clientIdUsed: LINKEDIN_CLIENT_ID?.substring(0, 4) + '...',
          clientSecretUsed: LINKEDIN_CLIENT_SECRET ? 'Provided' : 'Missing',
          redirectUri,
          codeLength: (code as string).length
        }
      });
      
      // Try to parse the error response
      let parsedError = "";
      try {
        const errorJson = JSON.parse(errorText);
        parsedError = `&message=${encodeURIComponent(errorJson.error_description || errorJson.error || 'Unknown error')}`;
      } catch (e) {
        // If not JSON, just use the text
        parsedError = `&message=${encodeURIComponent(errorText.substring(0, 100))}`;
      }
      
      return res.redirect(`/?error=token_exchange_failed&status=${tokenResponse.status}${parsedError}`);
    }
    
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      console.error(`UNIVERSAL CALLBACK [${req.path}]: Missing access token in response`);
      return res.redirect("/?error=missing_access_token");
    }
    
    const accessToken = tokenData.access_token;
    console.log(`UNIVERSAL CALLBACK [${req.path}]: Successfully obtained access token`);
    
    // Get user profile data
    const profileResponse = await fetch(LINKEDIN_PROFILE_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error(`UNIVERSAL CALLBACK [${req.path}]: Profile fetch failed:`, {
        status: profileResponse.status,
        error: errorText
      });
      return res.redirect("/?error=profile_fetch_failed");
    }
    
    const profileData = await profileResponse.json();
    console.log(`UNIVERSAL CALLBACK [${req.path}]: Successfully retrieved profile data`);
    
    // Attempt to get email
    let email = "";
    try {
      const emailResponse = await fetch(LINKEDIN_EMAIL_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        email = emailData.elements?.[0]?.["handle~"]?.emailAddress || "";
        console.log(`UNIVERSAL CALLBACK [${req.path}]: Successfully retrieved email:`, email);
      } else {
        console.warn(`UNIVERSAL CALLBACK [${req.path}]: Failed to retrieve email, continuing anyway`);
      }
    } catch (error) {
      console.error(`UNIVERSAL CALLBACK [${req.path}]: Error fetching email:`, error);
      // Continue anyway, email is optional
    }
    
    // Extract user data
    const linkedinId = profileData.id;
    if (!linkedinId) {
      console.error(`UNIVERSAL CALLBACK [${req.path}]: Missing LinkedIn ID in profile data`);
      return res.redirect("/?error=missing_profile_id");
    }
    
    const firstName = profileData.localizedFirstName || "";
    const lastName = profileData.localizedLastName || "";
    
    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.linkedinId, linkedinId)
    });
    
    if (!user) {
      console.log(`UNIVERSAL CALLBACK [${req.path}]: Creating new user with LinkedIn ID:`, linkedinId);
      
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
        console.log(`UNIVERSAL CALLBACK [${req.path}]: User created successfully with ID:`, user.id);
      } catch (error) {
        console.error(`UNIVERSAL CALLBACK [${req.path}]: Error creating user:`, error);
        return res.redirect("/?error=user_creation_failed");
      }
    } else {
      console.log(`UNIVERSAL CALLBACK [${req.path}]: Found existing user with ID:`, user.id);
      
      // Update user info
      try {
        await db.update(users)
          .set({
            email: email || user.email,
            firstName: firstName || user.firstName,
            lastName: lastName || user.lastName,
            displayName: `${firstName} ${lastName}`.trim() || user.displayName,
            lastLoginAt: new Date()
          })
          .where(eq(users.id, user.id));
        
        console.log(`UNIVERSAL CALLBACK [${req.path}]: User updated successfully`);
      } catch (error) {
        console.error(`UNIVERSAL CALLBACK [${req.path}]: Error updating user:`, error);
        // Continue anyway with existing user
      }
    }
    
    // Set session
    req.session.userId = user.id;
    req.session.linkedinId = linkedinId;
    req.session.linkedinProfileUrl = `https://www.linkedin.com/in/${linkedinId}`;
    
    console.log(`UNIVERSAL CALLBACK [${req.path}]: Session established, redirecting to home`);
    return res.redirect("/");
  } catch (error) {
    console.error(`UNIVERSAL CALLBACK [${req.path}]: Unhandled error:`, error);
    return res.redirect("/?error=authentication_failed");
  }
};