import { Request, Response, NextFunction } from "express";
import path from "path";
import { LinkedInProvider, LinkedInProfile, LinkedInOAuthError } from "../auth/linkedinProvider";
import { storage } from "../storage";

// Create LinkedIn provider instance with error handling
const linkedInProvider = new LinkedInProvider({
  clientId: process.env.LINKEDIN_CLIENT_ID || "",
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
  handleError: linkedInErrorHandler
});

// Error handler for LinkedIn OAuth
function linkedInErrorHandler(error: LinkedInOAuthError, req: Request, res: Response): void {
  console.error("LinkedIn OAuth error:", error);
  
  // Store error in session for display
  if (req.session) {
    req.session.linkedinOAuth = {
      ...req.session.linkedinOAuth,
      error: {
        message: error.message,
        stage: error.stage,
        timestamp: error.timestamp || new Date().toISOString()
      }
    };
  }
  
  // Redirect to error page
  res.redirect('/auth?error=linkedin');
}

/**
 * User profile handler - creates or retrieves user account
 */
async function handleUserProfile(profile: LinkedInProfile, req: Request, res: Response, next: NextFunction) {
  try {
    if (!profile || !profile.id) {
      return res.redirect('/auth?error=profile');
    }
    
    // Check if user exists
    let user = await storage.getUserByLinkedInId(profile.id);
    
    if (!user) {
      // Create new user
      // Generate username from first part of email or first name + random
      const emailUsername = profile.email ? profile.email.split('@')[0] : '';
      const username = emailUsername || profile.firstName.toLowerCase() || 'user' + Math.floor(Math.random() * 10000);
      
      user = await storage.createUserFromLinkedIn({
        linkedinId: profile.id,
        username: username,
        email: profile.email || '',
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        profilePictureUrl: '', // LinkedIn doesn't provide this in basic profile
        linkedinProfileUrl: `https://www.linkedin.com/in/${profile.id}`
      });
    } else {
      // Update last login time
      await storage.updateLastLogin(user.id);
    }
    
    // Set user ID in session
    if (req.session) {
      req.session.userId = user.id;
    }
    
    // Redirect to home page
    res.redirect('/');
    
  } catch (error) {
    console.error("Error handling user profile:", error);
    next(error);
  }
}

/**
 * Get LinkedIn authorization URL
 */
export const getLinkedInRobustAuthUrl = (req: Request, res: Response) => {
  try {
    const authUrl = linkedInProvider.generateAuthUrl(req);
    res.json({ url: authUrl });
  } catch (error) {
    console.error("Error generating LinkedIn auth URL:", error);
    res.status(500).json({ 
      error: "Failed to generate LinkedIn authorization URL", 
      details: process.env.NODE_ENV === 'development' ? error : undefined 
    });
  }
};

/**
 * Handle LinkedIn OAuth callback
 */
export const handleLinkedInRobustCallback = linkedInProvider.handleCallback(handleUserProfile);

/**
 * Custom login page renderer
 */
export const renderAuthPage = (req: Request, res: Response) => {
  const errorParam = req.query.error;
  let errorMessage = '';
  
  if (errorParam === 'linkedin') {
    errorMessage = 'LinkedIn authentication failed. Please try again or use the manual login option.';
  } else if (errorParam === 'profile') {
    errorMessage = 'Could not retrieve your LinkedIn profile. Please try again or use the manual login option.';
  }
  
  // Send the auth page
  res.sendFile('auth-page.html', { 
    root: path.join(process.cwd(), 'client/public')
  });
};

/**
 * Logout user
 */
export const logout = (req: Request, res: Response) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.clearCookie('connect.sid');
      res.status(200).json({ message: "Logged out successfully" });
    });
  } else {
    res.status(200).json({ message: "No active session to logout" });
  }
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  try {
    const user = await storage.getUser(req.session.userId);
    
    if (!user) {
      req.session.destroy(err => {
        if (err) console.error("Error destroying invalid session:", err);
      });
      return res.status(401).json({ error: "User not found" });
    }
    
    // Don't send password hash
    const { password, ...userData } = user;
    res.json(userData);
  } catch (error) {
    console.error("Error getting current user:", error);
    res.status(500).json({ error: "Failed to retrieve user profile" });
  }
};