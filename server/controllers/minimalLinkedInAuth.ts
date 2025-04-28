import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "@db";
import { users } from "@shared/schema";

/**
 * Minimal LinkedIn authentication controller
 * 
 * This is a stripped-down version for easier debugging
 */

// Get the redirect URI based on the current environment
function getRedirectUri(req: Request): string {
  // Explicit environment variable override has highest priority
  if (process.env.LINKEDIN_REDIRECT_URI) {
    console.log(`Using explicit LINKEDIN_REDIRECT_URI override: ${process.env.LINKEDIN_REDIRECT_URI}`);
    return process.env.LINKEDIN_REDIRECT_URI;
  }
  
  // Detect if we're running on Replit
  const isReplit = !!process.env.REPL_SLUG && !!process.env.REPL_OWNER;
  
  // Get the domain
  let baseUrl;
  
  if (isReplit) {
    // On Replit, we have multiple options
    const replitDomain = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    console.log(`Using Replit domain: ${replitDomain}`);
    baseUrl = replitDomain;
  } else {
    // Local development
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    baseUrl = `${protocol}://${req.headers.host}`;
    console.log(`Using local domain: ${baseUrl}`);
  }
  
  // LinkedIn prefers simpler callback URLs - use root-level path
  const callbackPath = '/minimal-callback';
  const redirectUri = `${baseUrl}${callbackPath}`;
  
  console.log(`Final LinkedIn redirect URI: ${redirectUri}`);
  return redirectUri;
}

// Generate the LinkedIn authorization URL
export const getMinimalAuthUrl = (req: Request, res: Response) => {
  try {
    if (!process.env.LINKEDIN_CLIENT_ID) {
      console.error("LinkedIn client ID not configured");
      return res.status(500).json({ error: "LinkedIn client ID not configured" });
    }
    
    // Generate a random state
    const state = Math.random().toString(36).substring(2, 15);
    req.session.oauthState = state;
    
    // Get the redirect URI
    const redirectUri = getRedirectUri(req);
    
    // Build the authorization URL
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
      `response_type=code` +
      `&client_id=${encodeURIComponent(process.env.LINKEDIN_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}` +
      `&scope=r_liteprofile%20r_emailaddress`;
    
    // Log details for debugging
    console.log("Minimal LinkedIn auth URL generated:", {
      redirectUri,
      state
    });
    
    // Return the URL
    return res.json({ url: authUrl });
  } catch (error) {
    console.error("Error generating LinkedIn auth URL:", error);
    return res.status(500).json({ error: "Failed to generate LinkedIn authorization URL" });
  }
};

// Handle the LinkedIn callback
export const handleMinimalCallback = async (req: Request, res: Response) => {
  try {
    // Log all parameters for debugging
    console.log("LinkedIn callback params:", req.query);
    
    // Check for errors from LinkedIn
    if (req.query.error) {
      console.error("LinkedIn error:", req.query.error, req.query.error_description);
      return res.redirect(`/auth?error=linkedin&message=${encodeURIComponent(req.query.error_description as string || '')}`);
    }
    
    // Validate required parameters
    const { code, state } = req.query;
    
    if (!code) {
      console.error("No authorization code received");
      return res.redirect('/auth?error=no_code');
    }
    
    // Validate state parameter
    const sessionState = req.session?.oauthState;
    if (!state || !sessionState || state !== sessionState) {
      console.error("Invalid state parameter", { receivedState: state, sessionState });
      return res.redirect('/auth?error=invalid_state');
    }
    
    // Get the redirect URI (must match the one used for authorization)
    const redirectUri = getRedirectUri(req);
    
    // Exchange authorization code for token
    const tokenResponse = await exchangeCodeForToken(code.toString(), redirectUri);
    console.log("Token exchange response status:", tokenResponse.status);
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return res.redirect('/auth?error=token_exchange');
    }
    
    const tokenData = await tokenResponse.json();
    console.log("Access token received:", !!tokenData.access_token);
    
    if (!tokenData.access_token) {
      console.error("No access token in response");
      return res.redirect('/auth?error=no_token');
    }
    
    // Get user profile
    const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    console.log("Profile response status:", profileResponse.status);
    
    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error("Profile fetch error:", errorText);
      return res.redirect('/auth?error=profile_fetch');
    }
    
    const profileData = await profileResponse.json();
    console.log("Profile data received:", {
      id: profileData.id,
      firstName: profileData.localizedFirstName,
      lastName: profileData.localizedLastName
    });
    
    // Get email (optional)
    let email = null;
    try {
      const emailResponse = await fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });
      
      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        if (emailData?.elements?.[0]?.['handle~']?.emailAddress) {
          email = emailData.elements[0]['handle~'].emailAddress;
          console.log("Email found:", email);
        }
      }
    } catch (emailError) {
      console.error("Error fetching email:", emailError);
      // Continue without email
    }
    
    // Check if user exists
    let user = await db.query.users.findFirst({
      where: eq(users.linkedinId, profileData.id)
    });
    
    if (user) {
      console.log("Existing user found:", user.id);
      
      // Update last login
      await db.update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));
    } else {
      console.log("Creating new user for LinkedIn profile");
      
      // Create unique username
      const baseUsername = email ? email.split('@')[0] : profileData.localizedFirstName.toLowerCase();
      let username = baseUsername;
      let usernameExists = await db.query.users.findFirst({
        where: eq(users.username, username)
      });
      
      // Add random suffix if username exists
      if (usernameExists) {
        username = `${baseUsername}${Math.floor(Math.random() * 1000)}`;
      }
      
      // Create new user
      const newUser = await db.insert(users).values({
        username,
        linkedinId: profileData.id,
        firstName: profileData.localizedFirstName,
        lastName: profileData.localizedLastName,
        email: email || '',
        displayName: `${profileData.localizedFirstName} ${profileData.localizedLastName}`,
        linkedinProfileUrl: `https://www.linkedin.com/in/${profileData.id}`,
        createdAt: new Date(),
        lastLoginAt: new Date()
      }).returning();
      
      user = newUser[0];
      console.log("New user created:", user.id);
    }
    
    // Set user in session
    req.session.userId = user.id;
    console.log("User ID set in session:", user.id);
    
    // Redirect to home page
    return res.redirect('/');
  } catch (error) {
    console.error("Error handling LinkedIn callback:", error);
    return res.redirect('/auth?error=unexpected');
  }
};

// Exchange the authorization code for an access token
async function exchangeCodeForToken(code: string, redirectUri: string) {
  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
    throw new Error("LinkedIn client credentials not configured");
  }
  
  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('redirect_uri', redirectUri);
  params.append('client_id', process.env.LINKEDIN_CLIENT_ID);
  params.append('client_secret', process.env.LINKEDIN_CLIENT_SECRET);
  
  console.log("Token exchange params:", {
    code: code.substring(0, 5) + '...',
    redirectUri,
    clientId: process.env.LINKEDIN_CLIENT_ID.substring(0, 5) + '...'
  });
  
  return fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });
}