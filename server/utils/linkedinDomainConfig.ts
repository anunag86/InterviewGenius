import { Request } from "express";

/**
 * Get the actual full domain that should be used for LinkedIn authentication
 * This is a specialized version specifically for LinkedIn which has strict requirements
 */
export function getLinkedInRedirectUri(req: Request): string {
  // Check if we have a domain from Replit
  const replitDomain = process.env.REPL_SLUG && process.env.REPL_OWNER
    ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
    : null;
    
  // Check if we have a manual override
  const manualRedirectUri = process.env.LINKEDIN_REDIRECT_URI;
  if (manualRedirectUri) {
    console.log(`Using manual LinkedIn redirect URI: ${manualRedirectUri}`);
    return manualRedirectUri;
  }
  
  // Get the domain from the request
  const host = req.get('host');
  const protocol = req.protocol || 'https';
  
  // Start with a default domain assuming Replit
  let domain = replitDomain ? `${protocol}://${replitDomain}` : `${protocol}://${host}`;
  
  // Add the callback path - Using direct-callback path for better compatibility with LinkedIn
  const callbackPath = '/direct-callback';
  
  // Construct the full URI
  const redirectUri = `${domain}${callbackPath}`;
  
  console.log(`LinkedIn redirect URI: ${redirectUri}`);
  return redirectUri;
}