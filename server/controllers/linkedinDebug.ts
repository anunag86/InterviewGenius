import { Request, Response } from "express";
import fetch from "node-fetch";

// LinkedIn OAuth configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

// LinkedIn API endpoints
const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_PROFILE_URL = "https://api.linkedin.com/v2/me";
const LINKEDIN_EMAIL_URL = "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))";

/**
 * Step 1: Test LinkedIn SDK connection with minimal parameters
 */
export const testLinkedInConnection = async (req: Request, res: Response) => {
  try {
    // Only required parameters for LinkedIn OAuth
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: LINKEDIN_CLIENT_ID || 'missing-client-id',
      redirect_uri: encodeURIComponent('https://www.example.com/callback'),
      state: 'debug-test'
    });

    // Don't actually redirect, just build and return the URL
    const authUrl = `${LINKEDIN_AUTH_URL}?${params.toString()}`;
    
    try {
      // Test if LinkedIn endpoint is accessible
      const response = await fetch(LINKEDIN_AUTH_URL, {
        method: 'HEAD'
      });
      
      return res.json({
        step: 'connection_test',
        canReachLinkedIn: response.ok,
        status: response.status,
        statusText: response.statusText,
        authUrlForTesting: authUrl,
        clientIdPresent: !!LINKEDIN_CLIENT_ID,
        clientSecretPresent: !!LINKEDIN_CLIENT_SECRET
      });
    } catch (error) {
      const netError = error as Error;
      return res.json({
        step: 'connection_test',
        canReachLinkedIn: false,
        error: netError.message,
        authUrlForTesting: authUrl,
        clientIdPresent: !!LINKEDIN_CLIENT_ID,
        clientSecretPresent: !!LINKEDIN_CLIENT_SECRET
      });
    }
  } catch (error) {
    console.error("Error in LinkedIn connection test:", error);
    return res.status(500).json({ error: "Connection test failed" });
  }
};

/**
 * Step 2: Verify client credentials by attempting to get an access token
 * Note: This is for diagnostic only and uses the client credentials flow
 */
export const testLinkedInCredentials = async (req: Request, res: Response) => {
  try {
    if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
      return res.status(400).json({ 
        error: "LinkedIn credentials missing",
        clientIdPresent: !!LINKEDIN_CLIENT_ID,
        clientSecretPresent: !!LINKEDIN_CLIENT_SECRET
      });
    }
    
    // Try to get token using client credentials flow for diagnosis
    // This won't give us user info, but checks if credentials are valid
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET
    });
    
    try {
      const response = await fetch(LINKEDIN_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });
      
      const responseBody = await response.text();
      let parsedBody;
      try {
        parsedBody = JSON.parse(responseBody);
      } catch {
        parsedBody = responseBody;
      }
      
      return res.json({
        step: 'credentials_test',
        status: response.status,
        statusText: response.statusText,
        response: parsedBody,
        credentialsValid: response.status < 400
      });
    } catch (error) {
      const netError = error as Error;
      return res.json({
        step: 'credentials_test',
        error: netError.message,
        credentialsValid: false
      });
    }
  } catch (error) {
    console.error("Error in LinkedIn credentials test:", error);
    return res.status(500).json({ error: "Credentials test failed" });
  }
};

/**
 * Step 3: Test redirect URI with a HEAD request
 */
export const testRedirectUri = async (req: Request, res: Response) => {
  try {
    const { uri } = req.query;
    
    if (!uri) {
      return res.status(400).json({ error: "No redirect URI provided" });
    }
    
    const redirectUri = decodeURIComponent(uri as string);
    
    // Parse into components for analysis
    let url;
    try {
      url = new URL(redirectUri);
    } catch (error) {
      const urlError = error as Error;
      return res.json({
        step: 'redirect_uri_test',
        validUrl: false,
        error: urlError.message,
        uri: redirectUri
      });
    }
    
    // Suggest variations to try
    const variations = [
      redirectUri,
      redirectUri.replace('http:', 'https:'),
      redirectUri.replace('https:', 'http:'),
      redirectUri.replace('/api', ''),
      url.origin + '/callback',
      url.origin + '/api/callback',
      url.origin + '/auth/linkedin/callback'
    ];
    
    return res.json({
      step: 'redirect_uri_test',
      validUrl: true,
      protocol: url.protocol,
      host: url.host,
      pathname: url.pathname,
      origin: url.origin,
      suggestedVariations: variations
    });
  } catch (error) {
    console.error("Error in redirect URI test:", error);
    return res.status(500).json({ error: "Redirect URI test failed" });
  }
};

/**
 * Step 4: Comprehensive environment check
 */
export const checkOAuthEnvironment = (req: Request, res: Response) => {
  // Get information about the environment
  const environment = {
    nodeEnv: process.env.NODE_ENV,
    platformInfo: {
      platform: process.platform,
      nodeVersion: process.version
    },
    sessionConfig: {
      isEnabled: !!req.session,
      hasState: !!req.session?.oauthState
    },
    requestInfo: {
      host: req.headers.host,
      referer: req.headers.referer,
      userAgent: req.headers['user-agent']
    },
    replitInfo: {
      isReplit: !!(process.env.REPL_SLUG && process.env.REPL_OWNER),
      replSlug: process.env.REPL_SLUG,
      replOwner: process.env.REPL_OWNER
    },
    linkedinConfig: {
      clientIdPresent: !!LINKEDIN_CLIENT_ID,
      clientSecretPresent: !!LINKEDIN_CLIENT_SECRET,
      clientIdFirstChars: LINKEDIN_CLIENT_ID ? `${LINKEDIN_CLIENT_ID.substring(0, 4)}...` : 'missing'
    }
  };
  
  return res.json({
    step: 'environment_check',
    environment
  });
};

/**
 * Step 5: Output all possible redirect URIs to try
 */
export const generateAllPossibleRedirectUris = (req: Request, res: Response) => {
  // Base domain
  let domain = req.headers.host || '';
  
  // Detect if we're in Replit
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    domain = `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }
  
  // Generate all combinations
  const protocols = ['https', 'http'];
  const paths = [
    '/callback',
    '/auth/callback',
    '/auth/linkedin/callback',
    '/api/callback',
    '/api/auth/callback',
    '/api/auth/linkedin/callback',
    '/linkedin/callback'
  ];
  
  const allUris = [];
  
  for (const protocol of protocols) {
    for (const path of paths) {
      allUris.push(`${protocol}://${domain}${path}`);
    }
  }
  
  return res.json({
    step: 'redirect_uri_generator',
    currentDomain: domain,
    allPossibleRedirectUris: allUris
  });
};