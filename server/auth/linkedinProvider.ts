import { Request, Response, NextFunction } from "express";
import fetch from "node-fetch";
import { detectDomain, logDomainInfo, getPrioritizedRedirectUris } from "../utils/domainDetector";

/**
 * LinkedIn OAuth configuration
 */
export interface LinkedInOAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackPath: string;
  scope: string;
  state?: string;
  handleError?: (error: LinkedInOAuthError, req: Request, res: Response) => void;
}

/**
 * LinkedIn OAuth error
 */
export interface LinkedInOAuthError {
  stage: "authorization" | "callback" | "token_exchange" | "profile";
  message: string;
  originalError?: any;
  details?: any;
  timestamp: string;
}

/**
 * LinkedIn OAuth state
 */
export interface LinkedInOAuthState {
  startTime: number;
  redirectUri: string;
  fallbackUris: string[];
  state: string;
  attemptCount: number;
}

/**
 * LinkedIn profile information
 */
export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  profilePicture?: string;
  fullResponse?: any;
}

/**
 * Default error handler that redirects to a fallback URL with descriptive error
 */
export function defaultErrorHandler(error: LinkedInOAuthError, req: Request, res: Response): void {
  console.error('LinkedIn OAuth Error:', error);
  
  // Redirect to a fallback URL with error information
  res.redirect(`/auth?error=${encodeURIComponent(error.message)}&stage=${error.stage}`);
}

/**
 * LinkedIn OAuth Provider with robust error handling, retry logic, and fallbacks
 */
export class LinkedInProvider {
  private config: LinkedInOAuthConfig;
  
  constructor(config: LinkedInOAuthConfig) {
    // Validate required configuration
    if (!config.clientId) throw new Error("LinkedIn client ID is required");
    if (!config.clientSecret) throw new Error("LinkedIn client secret is required");
    
    // Set defaults with the spread first to avoid overriding
    this.config = {
      ...config,
      callbackPath: config.callbackPath || '/api/auth/linkedin/callback',
      scope: config.scope || 'r_liteprofile r_emailaddress',
      handleError: config.handleError || defaultErrorHandler
    };
  }
  
  /**
   * Generate LinkedIn authorization URL
   */
  generateAuthUrl(req: Request): string {
    logDomainInfo(req, this.config.callbackPath);
    
    // Get domain information
    const redirectUris = getPrioritizedRedirectUris(req, this.config.callbackPath);
    const primaryRedirectUri = redirectUris[0];
    
    // Generate state parameter
    const state = this.config.state || Math.random().toString(36).substring(2, 15);
    
    // Store state and redirect information in session
    if (req.session) {
      req.session.linkedinOAuth = {
        startTime: Date.now(),
        redirectUri: primaryRedirectUri,
        fallbackUris: redirectUris.slice(1), // Store fallback URIs for retry
        state,
        attemptCount: 0
      } as LinkedInOAuthState;
    }
    
    // Build authorization parameters
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: primaryRedirectUri,
      state,
      scope: this.config.scope
    });
    
    // Log for debugging
    console.log('LinkedIn Authorization URL generated:', {
      redirectUri: primaryRedirectUri,
      state,
      fallbacks: redirectUris.slice(1),
      timestamp: new Date().toISOString()
    });
    
    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }
  
  /**
   * Middleware to initiate LinkedIn authorization
   */
  authorize() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const authUrl = this.generateAuthUrl(req);
        res.redirect(authUrl);
      } catch (error) {
        const oauthError: LinkedInOAuthError = {
          stage: "authorization",
          message: "Failed to generate LinkedIn authorization URL",
          originalError: error,
          timestamp: new Date().toISOString()
        };
        
        if (this.config.handleError) {
          this.config.handleError(oauthError, req, res);
        } else {
          next(error);
        }
      }
    };
  }
  
  /**
   * Middleware to handle LinkedIn OAuth callback
   */
  handleCallback(successCallback: (profile: LinkedInProfile, req: Request, res: Response, next: NextFunction) => void) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const { code, state, error, error_description } = req.query;
      
      // Get OAuth state from session
      const oauthState = req.session?.linkedinOAuth as LinkedInOAuthState | undefined;
      
      // Check for LinkedIn error
      if (error) {
        const oauthError: LinkedInOAuthError = {
          stage: "callback",
          message: `LinkedIn returned an error: ${error} - ${error_description || 'No description'}`,
          details: { error, error_description },
          timestamp: new Date().toISOString()
        };
        
        if (this.config.handleError) {
          return this.config.handleError(oauthError, req, res);
        } else {
          return next(oauthError);
        }
      }
      
      // Validate state parameter
      if (!state || !oauthState || oauthState.state !== state) {
        const oauthError: LinkedInOAuthError = {
          stage: "callback",
          message: "Invalid OAuth state parameter",
          details: {
            receivedState: state,
            expectedState: oauthState?.state,
            hasOAuthState: !!oauthState
          },
          timestamp: new Date().toISOString()
        };
        
        if (this.config.handleError) {
          return this.config.handleError(oauthError, req, res);
        } else {
          return next(oauthError);
        }
      }
      
      // Validate authorization code
      if (!code) {
        const oauthError: LinkedInOAuthError = {
          stage: "callback",
          message: "No authorization code received from LinkedIn",
          timestamp: new Date().toISOString()
        };
        
        if (this.config.handleError) {
          return this.config.handleError(oauthError, req, res);
        } else {
          return next(oauthError);
        }
      }
      
      try {
        // Track attempt count
        if (oauthState) {
          oauthState.attemptCount++;
          req.session.linkedinOAuth = oauthState;
        }
        
        // Exchange authorization code for token
        const tokenResponse = await this.exchangeCodeForToken(code.toString(), oauthState?.redirectUri);
        const accessToken = tokenResponse.access_token;
        
        if (!accessToken) {
          throw new Error("No access token received from LinkedIn");
        }
        
        // Get user profile
        const profile = await this.getUserProfile(accessToken);
        
        // Call success callback
        successCallback(profile, req, res, next);
      } catch (error: any) {
        // Check if we can retry with a fallback URI
        if (oauthState && oauthState.fallbackUris.length > 0 && oauthState.attemptCount <= 3) {
          console.log(`Retrying with fallback URI, attempt ${oauthState.attemptCount}`, {
            nextFallback: oauthState.fallbackUris[0],
            remainingFallbacks: oauthState.fallbackUris.length
          });
          
          // Update OAuth state with next fallback
          oauthState.redirectUri = oauthState.fallbackUris.shift() as string;
          req.session.linkedinOAuth = oauthState;
          
          // Regenerate auth URL with new redirect URI
          const authUrl = this.generateAuthUrl(req);
          return res.redirect(authUrl);
        }
        
        // No more fallbacks, report error
        const oauthError: LinkedInOAuthError = {
          stage: error.stage || "token_exchange",
          message: error.message || "Failed to complete LinkedIn authentication",
          originalError: error,
          details: error.details || {},
          timestamp: new Date().toISOString()
        };
        
        if (this.config.handleError) {
          return this.config.handleError(oauthError, req, res);
        } else {
          return next(oauthError);
        }
      }
    };
  }
  
  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(code: string, redirectUri?: string): Promise<any> {
    if (!redirectUri) {
      throw new Error("No redirect URI available for token exchange");
    }
    
    // Build parameters for token request
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });
    
    // Exchange code for token
    try {
      const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      
      const data = await response.json();
      
      // Check for errors in response
      if (data.error) {
        throw {
          stage: "token_exchange",
          message: `LinkedIn token exchange failed: ${data.error} - ${data.error_description || 'No description'}`,
          details: data
        };
      }
      
      return data;
    } catch (error) {
      // Enhance error with stage information if it's not already there
      if (error.stage) {
        throw error;
      } else {
        throw {
          stage: "token_exchange",
          message: "Failed to exchange authorization code for token",
          originalError: error
        };
      }
    }
  }
  
  /**
   * Get user profile from LinkedIn
   */
  private async getUserProfile(accessToken: string): Promise<LinkedInProfile> {
    try {
      // Get basic profile
      const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'cache-control': 'no-cache',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });
      
      const profileData = await profileResponse.json();
      
      if (profileData.status && profileData.status >= 400) {
        throw {
          stage: "profile",
          message: "Failed to retrieve LinkedIn profile",
          details: profileData
        };
      }
      
      // Get email address
      const emailResponse = await fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'cache-control': 'no-cache',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });
      
      const emailData = await emailResponse.json();
      let email = undefined;
      
      if (emailData?.elements?.[0]?.['handle~']?.emailAddress) {
        email = emailData.elements[0]['handle~'].emailAddress;
      }
      
      // Return profile information
      return {
        id: profileData.id,
        firstName: profileData.localizedFirstName,
        lastName: profileData.localizedLastName,
        email,
        fullResponse: {
          profile: profileData,
          email: emailData
        }
      };
    } catch (error) {
      // Enhance error with stage information if it's not already there
      if (error.stage) {
        throw error;
      } else {
        throw {
          stage: "profile",
          message: "Failed to retrieve LinkedIn profile",
          originalError: error
        };
      }
    }
  }
}