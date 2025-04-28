import { Request, Response } from "express";

/**
 * Get detailed diagnostics for LinkedIn OAuth configuration
 */
export const getLinkedInDiagnostics = (req: Request, res: Response) => {
  const envVars = {
    REPL_SLUG: process.env.REPL_SLUG || null,
    REPL_OWNER: process.env.REPL_OWNER || null,
    REDIRECT_URI: process.env.REDIRECT_URI || null,
    NODE_ENV: process.env.NODE_ENV || null,
    LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID ? "****" + process.env.LINKEDIN_CLIENT_ID.slice(-6) : null,
    LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET ? "****" : null,
  };
  
  // Determine which redirect URI would be used
  let actualRedirectUri: string;
  
  if (process.env.REDIRECT_URI) {
    actualRedirectUri = process.env.REDIRECT_URI;
  } else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    actualRedirectUri = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/api/auth/linkedin/callback`;
  } else {
    actualRedirectUri = 'http://localhost:5000/api/auth/linkedin/callback';
  }
  
  // Various alternative URIs that might be needed
  const alternativeUris = [
    actualRedirectUri,
    // Without /api prefix
    actualRedirectUri.replace('/api/auth/linkedin/callback', '/auth/linkedin/callback'),
    // With www prefix if not present
    actualRedirectUri.includes('//www.') ? null : actualRedirectUri.replace('//', '//www.'),
    // Without www prefix if present
    actualRedirectUri.includes('//www.') ? actualRedirectUri.replace('//www.', '//') : null,
    // With https
    actualRedirectUri.replace('http:', 'https:'),
    // With http
    actualRedirectUri.replace('https:', 'http:'),
  ].filter(Boolean);
  
  // Get request info for debugging
  const requestInfo = {
    host: req.headers.host,
    referer: req.headers.referer,
    userAgent: req.headers['user-agent'],
    xForwardedFor: req.headers['x-forwarded-for'],
    xForwardedHost: req.headers['x-forwarded-host'],
    xForwardedProto: req.headers['x-forwarded-proto'],
  };
  
  // Build full diagnostics package
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: envVars,
    actualRedirectUri,
    alternativeUris,
    recommendations: [
      "Ensure the exact redirect URI is registered in LinkedIn Developer Console",
      "Check if your LinkedIn App has the correct permissions (r_liteprofile, r_emailaddress)",
      "Verify that your LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET are correct",
      "Try each of the alternative URIs in the LinkedIn Developer Console"
    ],
    requestInfo
  };
  
  return res.json(diagnostics);
};