import { Request } from "express";

/**
 * Comprehensive domain detection utility
 * This handles all the edge cases of Replit's various domain patterns
 */
export function detectDomain(req: Request): string {
  // First priority: If we have a host header, that's most reliable
  if (req.headers.host) {
    // Handle picard.replit.dev development domain pattern
    if (req.headers.host.includes('picard.replit.dev')) {
      console.log(`Domain detection: Using picard.replit.dev from host header: ${req.headers.host}`);
      return `https://${req.headers.host}`;
    }
    
    // Handle repl.co production domain pattern
    if (req.headers.host.includes('.repl.co')) {
      console.log(`Domain detection: Using repl.co from host header: ${req.headers.host}`);
      return `https://${req.headers.host}`;
    }
    
    // Handle localhost
    if (req.headers.host.includes('localhost') || req.headers.host.match(/\d+\.\d+\.\d+\.\d+/)) {
      const protocol = req.secure ? 'https' : 'http';
      console.log(`Domain detection: Using localhost from host header: ${protocol}://${req.headers.host}`);
      return `${protocol}://${req.headers.host}`;
    }
    
    // Any other domain pattern
    console.log(`Domain detection: Using unknown domain pattern from host header: ${req.headers.host}`);
    return `https://${req.headers.host}`;
  }
  
  // Second priority: If we have REPL_SLUG and REPL_OWNER, construct the repl.co URL
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    const replUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    console.log(`Domain detection: Constructed URL from env vars: ${replUrl}`);
    return replUrl;
  }
  
  // Fallback: If we have no way to detect the domain, use localhost
  console.log('Domain detection: Falling back to localhost:5000');
  return 'http://localhost:5000';
}

/**
 * Generate a fully qualified redirect URI for OAuth callbacks
 */
export function generateRedirectUri(req: Request, path: string): string {
  const baseDomain = detectDomain(req);
  // Ensure the path starts with a slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const redirectUri = `${baseDomain}${normalizedPath}`;
  
  console.log(`Generated redirect URI: ${redirectUri}`);
  return redirectUri;
}

/**
 * Generates OAuth state parameter and stores it in session
 */
export function generateOAuthState(req: Request): string {
  const state = Math.random().toString(36).substring(2, 15);
  if (req.session) {
    req.session.oauthState = state;
  }
  return state;
}