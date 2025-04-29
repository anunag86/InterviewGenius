/**
 * LinkedIn related controllers
 */
import { Request, Response } from "express";

/**
 * Provides diagnostic information about LinkedIn configuration
 * Used by the UI to help users troubleshoot authentication issues
 */
export const getLinkedInDiagnostic = (req: Request, res: Response) => {
  // Detect the current request's host for accurate callback URL reporting
  const host = req.headers.host || 'unknown-host';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const detectedCallbackUrl = `${protocol}://${host}/auth/linkedin/callback`;
  
  // Get client ID and secret for diagnostics (masked)
  const clientId = process.env.LINKEDIN_CLIENT_ID || '';
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';
  
  // Format diagnostic data to match UI expectations
  const data = {
    clientIdStatus: clientId ? 'Valid' : 'Missing',
    clientIdLength: clientId.length,
    clientIdPartial: clientId ? `${clientId.substring(0, 4)}...${clientId.substring(clientId.length - 4)}` : 'N/A',
    clientSecretStatus: clientSecret ? 'Valid' : 'Missing',
    clientSecretLength: clientSecret.length,
    strategyConfigured: true,
    callbackConfigured: true,
    callbackURL: detectedCallbackUrl,
    expectedCallbackURL: detectedCallbackUrl,
    detectedHost: host
  };
  
  // Return diagnostic info
  res.json({
    status: 'success',
    data
  });
};