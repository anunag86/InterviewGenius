import { Request, Response } from "express";
import { getLinkedInRedirectUri } from "../utils/linkedinDomainConfig";
import { storage } from "../storage";

/**
 * Generate a LinkedIn authorization URL with direct domain configuration
 */
export const getDirectLinkedInAuthUrl = (req: Request, res: Response) => {
  try {
    // Make sure LinkedIn client ID is configured
    if (!process.env.LINKEDIN_CLIENT_ID) {
      return res.status(500).json({ error: "LinkedIn client ID not configured" });
    }
    
    // Generate a state parameter to prevent CSRF
    const state = Math.random().toString(36).substring(2, 15);
    
    // Store state in session
    if (req.session) {
      req.session.oauthState = state;
    }
    
    // Get redirect URI using our specialized function
    const redirectUri = getLinkedInRedirectUri(req);
    
    // Build LinkedIn auth URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINKEDIN_CLIENT_ID,
      redirect_uri: redirectUri,
      state,
      scope: 'r_liteprofile r_emailaddress'
    });
    
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    
    console.log("LinkedIn auth URL generated:", {
      clientId: process.env.LINKEDIN_CLIENT_ID.substring(0, 4) + '...',  // Only log prefix for security
      redirectUri,
      state,
      timestamp: new Date().toISOString()
    });
    
    // Return the auth URL
    res.json({ url: authUrl });
  } catch (error) {
    console.error("Error generating LinkedIn auth URL:", error);
    res.status(500).json({ error: "Failed to generate LinkedIn authorization URL" });
  }
};

/**
 * Handle the LinkedIn callback
 */
export const handleDirectLinkedInCallback = async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;
    
    // Check for LinkedIn error
    if (error) {
      console.error("LinkedIn error:", error, error_description);
      return res.redirect(`/auth?error=linkedin&message=${encodeURIComponent(error_description as string || '')}`);
    }
    
    // Validate state parameter
    const sessionState = req.session?.oauthState;
    if (!state || !sessionState || state !== sessionState) {
      console.error("Invalid state parameter", { 
        receivedState: state, 
        sessionState, 
        matches: state === sessionState 
      });
      return res.redirect("/auth?error=state");
    }
    
    // Make sure we have authorization code
    if (!code) {
      console.error("No authorization code received");
      return res.redirect("/auth?error=code");
    }
    
    // Get redirect URI (should match what we used for auth)
    const redirectUri = getLinkedInRedirectUri(req);
    
    // Exchange authorization code for token
    const tokenResponse = await exchangeCodeForToken(code.toString(), redirectUri);
    
    if (!tokenResponse.access_token) {
      console.error("No access token received:", tokenResponse);
      return res.redirect("/auth?error=token");
    }
    
    // Get user profile
    const profile = await getUserProfile(tokenResponse.access_token);
    
    if (!profile || !profile.id) {
      console.error("Failed to retrieve LinkedIn profile");
      return res.redirect("/auth?error=profile");
    }
    
    // Check if user exists
    let user = await storage.getUserByLinkedInId(profile.id);
    
    if (!user) {
      // Create username from email or name
      const emailUsername = profile.email ? profile.email.split('@')[0] : '';
      const username = emailUsername || profile.firstName.toLowerCase() || `user_${Math.floor(Math.random() * 10000)}`;
      
      // Create new user
      user = await storage.createUserFromLinkedIn({
        linkedinId: profile.id,
        username,
        email: profile.email || '',
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        profilePictureUrl: '',
        linkedinProfileUrl: `https://www.linkedin.com/in/${profile.id}`
      });
    } else {
      // Update last login
      await storage.updateLastLogin(user.id);
    }
    
    // Set user in session
    if (req.session) {
      req.session.userId = user.id;
    }
    
    // Redirect to home page
    res.redirect("/");
  } catch (error) {
    console.error("LinkedIn callback error:", error);
    return res.redirect("/auth?error=unexpected");
  }
};

/**
 * Exchange authorization code for token
 */
async function exchangeCodeForToken(code: string, redirectUri: string): Promise<any> {
  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
    throw new Error("LinkedIn client credentials not configured");
  }
  
  // Build parameters for token request
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: process.env.LINKEDIN_CLIENT_ID,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET
  });
  
  try {
    // Exchange code for token
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token exchange failed:", response.status, errorText);
      throw new Error(`LinkedIn token exchange failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    throw error;
  }
}

/**
 * Get user profile from LinkedIn
 */
async function getUserProfile(accessToken: string): Promise<{
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}> {
  try {
    // Get basic profile
    const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'cache-control': 'no-cache',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error("Error retrieving LinkedIn profile:", profileResponse.status, errorText);
      throw new Error(`Failed to retrieve LinkedIn profile: ${profileResponse.status}`);
    }
    
    const profileData = await profileResponse.json();
    
    // Get email address
    const emailResponse = await fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'cache-control': 'no-cache',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    let email = undefined;
    
    if (emailResponse.ok) {
      const emailData = await emailResponse.json();
      if (emailData?.elements?.[0]?.['handle~']?.emailAddress) {
        email = emailData.elements[0]['handle~'].emailAddress;
      }
    }
    
    // Return profile information
    return {
      id: profileData.id,
      firstName: profileData.localizedFirstName,
      lastName: profileData.localizedLastName,
      email
    };
  } catch (error) {
    console.error("Error getting LinkedIn profile:", error);
    throw error;
  }
}