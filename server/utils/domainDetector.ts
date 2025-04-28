import { Request } from "express";

interface DomainInfo {
  protocol: string;
  domain: string;
  fullDomain: string;
  isReplit: boolean;
  isLocalhost: boolean;
}

/**
 * Get domain information from request headers
 * 
 * This function analyzes request headers to determine the current domain
 * and protocol, supporting both Replit and local development environments.
 */
export function getDomainInfo(req: Request): DomainInfo {
  // Get host from headers (prioritize X-Forwarded-Host for proxied requests)
  const host = req.get('X-Forwarded-Host') || 
               req.get('Host') || 
               'localhost:5000';
  
  // Determine protocol (prioritize X-Forwarded-Proto for proxied requests)
  const protocol = req.get('X-Forwarded-Proto') || 
                   req.protocol || 
                   'http';
  
  // Check if this is a Replit environment
  const isReplit = host.includes('.repl.co') || 
                   host.includes('.replit.dev') || 
                   host.includes('.replit.app');
  
  // Check if this is localhost
  const isLocalhost = host.includes('localhost') || 
                      host.includes('127.0.0.1');
  
  // Construct full domain
  const fullDomain = `${protocol}://${host}`;
  
  return {
    protocol,
    domain: host,
    fullDomain,
    isReplit,
    isLocalhost
  };
}

/**
 * Generate prioritized redirect URIs for OAuth callbacks
 * 
 * This function generates multiple possible redirect URIs based on the current domain,
 * with the most likely one first. This allows fallback attempts if the primary URI fails.
 */
export function getPrioritizedRedirectUris(req: Request, callbackPath: string): string[] {
  const domainInfo = getDomainInfo(req);
  const redirectUris: string[] = [];
  
  // First priority: Use the actual domain from the request
  redirectUris.push(`${domainInfo.fullDomain}${callbackPath}`);
  
  // For Replit environments, add additional possibilities
  if (domainInfo.isReplit) {
    // Extract Replit workspace and username
    const replitPattern = /^(.*?)\.(.*?)\.repl\.(co|dev|app)$/;
    const match = domainInfo.domain.match(replitPattern);
    
    if (match) {
      const workspace = match[1];
      const username = match[2];
      
      // Add variants with different domains (.repl.co, .replit.dev, etc)
      redirectUris.push(`https://${workspace}.${username}.repl.co${callbackPath}`);
      redirectUris.push(`https://${workspace}.${username}.replit.dev${callbackPath}`);
      redirectUris.push(`https://${workspace}.${username}.replit.app${callbackPath}`);
      
      // Add variant with Replit domain including www
      redirectUris.push(`https://www.${workspace}.${username}.repl.co${callbackPath}`);
    }
    
    // If environment variables are available, use them too
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
      redirectUris.push(`https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co${callbackPath}`);
      redirectUris.push(`https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev${callbackPath}`);
    }
  }
  
  // For localhost, add all variants
  if (domainInfo.isLocalhost) {
    redirectUris.push(`http://localhost:3000${callbackPath}`);
    redirectUris.push(`http://localhost:5000${callbackPath}`);
    redirectUris.push(`http://127.0.0.1:3000${callbackPath}`);
    redirectUris.push(`http://127.0.0.1:5000${callbackPath}`);
  }
  
  // Finally, if configured in env, add that too
  if (process.env.REDIRECT_URI) {
    redirectUris.push(process.env.REDIRECT_URI);
  }
  
  // Remove duplicates
  return Array.from(new Set(redirectUris));
}

/**
 * Log domain detection information
 */
export function logDomainInfo(req: Request, callbackPath: string): void {
  const domainInfo = getDomainInfo(req);
  const redirectUris = getPrioritizedRedirectUris(req, callbackPath);
  
  console.log("DEBUG LinkedIn OAuth - Environment variables:");
  console.log(`  REPL_SLUG: ${process.env.REPL_SLUG || 'not set'}`);
  console.log(`  REPL_OWNER: ${process.env.REPL_OWNER || 'not set'}`);
  console.log(`  REDIRECT_URI env var: ${process.env.REDIRECT_URI || 'not set'}`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  
  console.log(`Domain detection results:`, {
    protocol: domainInfo.protocol,
    domain: domainInfo.domain,
    fullDomain: domainInfo.fullDomain,
    isReplit: domainInfo.isReplit,
    isLocalhost: domainInfo.isLocalhost
  });
  
  console.log("Prioritized redirect URIs:");
  redirectUris.forEach((uri, i) => console.log(`  ${i+1}. ${uri}`));
  
  // Log the URI that will be used first
  if (redirectUris.length > 0) {
    console.log(`Using primary redirect URI: ${redirectUris[0]}`);
  } else {
    console.log("No redirect URIs could be generated");
  }
}