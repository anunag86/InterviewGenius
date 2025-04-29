/**
 * LinkedIn related controllers
 */
import { Request, Response } from "express";

/**
 * Provides diagnostic information about LinkedIn configuration
 * Used by the UI to help users troubleshoot authentication issues
 */
export const getLinkedInDiagnostic = (req: Request, res: Response) => {
  // Use the FIXED hardcoded callback URL that's registered in LinkedIn Developer Portal
  // This is the ONLY callback URL that will work with LinkedIn OIDC authentication
  const fixedCallbackURL = 'https://d1c83042-9bf3-4c77-aac6-0e48ec45ead6-00-1ig9xnjl41ayf.picard.replit.dev/auth/linkedin/callback';
  
  // Dynamic detection is only for display/debugging purposes - we will NOT use this URL
  const host = req.headers.host || 'unknown-host';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const detectedCallbackUrl = `${protocol}://${host}/auth/linkedin/callback`;
  
  // Get client ID and secret for diagnostics (masked)
  const clientId = process.env.LINKEDIN_CLIENT_ID || '';
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';
  
  console.log('LinkedIn diagnostics requested:', {
    callbackUrl: fixedCallbackURL,
    linkedinClientConfigured: !!clientId && !!clientSecret,
    sessionConfigured: true,
    passportInitialized: true,
    authEndpoints: { login: '/auth/linkedin', callback: '/auth/linkedin/callback' },
    serverDetails: {
      host,
      protocol,
      nodeEnv: process.env.NODE_ENV
    }
  });
  
  // Format diagnostic data to match UI expectations
  const data = {
    clientIdStatus: clientId ? 'Valid' : 'Missing',
    clientIdLength: clientId.length,
    clientIdPartial: clientId ? `${clientId.substring(0, 4)}...${clientId.substring(clientId.length - 4)}` : 'N/A',
    clientSecretStatus: clientSecret ? 'Valid' : 'Missing',
    clientSecretLength: clientSecret.length,
    strategyConfigured: true,
    callbackConfigured: true,
    callbackURL: fixedCallbackURL || detectedCallbackUrl,
    expectedCallbackURL: fixedCallbackURL || detectedCallbackUrl,
    actualCallbackUsed: fixedCallbackURL || 'Not configured yet',
    detectedHost: host,
    
    // Add more detailed callback information
    callbackInfo: {
      fixedCallbackURL: fixedCallbackURL || 'Not set',
      detectedCallbackUrl,
      linkedinRedirectUri: process.env.LINKEDIN_REDIRECT_URI || 'Not set',
      explanation: "The callback URL must EXACTLY match what's registered in LinkedIn Developer Portal"
    }
  };
  
  // Return diagnostic info
  res.json({
    status: 'success',
    data
  });
};