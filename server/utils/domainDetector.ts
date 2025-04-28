import { Request } from "express";

/**
 * Domain detection types for different environments
 */
export enum DomainEnvironment {
  REPLIT_EDITOR = 'replit_editor',
  REPLIT_DEPLOYMENT = 'replit_deployment',
  LOCALHOST = 'localhost',
  UNKNOWN = 'unknown'
}

/**
 * Detected domain information with comprehensive details
 */
export interface DetectedDomain {
  environment: DomainEnvironment;
  fullDomain: string;
  protocol: string;
  baseUrl: string;
  source: string;
}

/**
 * Generate a set of possible redirect URIs covering all scenarios
 * This helps with both the LinkedIn developer console setup and fallback options
 */
export function generateAllPossibleRedirectUris(callbackPath: string = '/api/auth/linkedin/callback'): string[] {
  const uris: string[] = [];
  
  // 1. From environment variables (Replit deployment)
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    uris.push(`https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co${callbackPath}`);
  }
  
  // 2. Common Replit editor domains
  uris.push(`https://*.picard.replit.dev${callbackPath}`);
  uris.push(`https://*.replit.dev${callbackPath}`);
  
  // 3. Generic development options
  uris.push(`http://localhost:5000${callbackPath}`);
  uris.push(`http://localhost:3000${callbackPath}`);
  
  // 4. Custom domain if set
  if (process.env.CUSTOM_DOMAIN) {
    uris.push(`https://${process.env.CUSTOM_DOMAIN}${callbackPath}`);
  }

  return uris;
}

/**
 * Comprehensive domain detection function that handles all possible scenarios
 * and provides detailed information for debugging
 */
export function detectDomain(req: Request, callbackPath: string = '/api/auth/linkedin/callback'): DetectedDomain {
  const host = req.headers.host;
  const protocol = req.secure || (req.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
  
  // 1. Try to detect from request headers (most reliable)
  if (host) {
    // Check if we're in the Replit editor
    if (host.includes('picard.replit.dev') || host.includes('.replit.dev')) {
      return {
        environment: DomainEnvironment.REPLIT_EDITOR,
        fullDomain: `${protocol}://${host}${callbackPath}`,
        protocol,
        baseUrl: `${protocol}://${host}`,
        source: 'request_headers'
      };
    }
    
    // Check if we're in a custom domain or the regular Replit deployment
    return {
      environment: host.includes('localhost') ? DomainEnvironment.LOCALHOST : DomainEnvironment.REPLIT_DEPLOYMENT,
      fullDomain: `${protocol}://${host}${callbackPath}`,
      protocol,
      baseUrl: `${protocol}://${host}`,
      source: 'request_headers'
    };
  }
  
  // 2. Fallback to environment variables (for server-side operations)
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return {
      environment: DomainEnvironment.REPLIT_DEPLOYMENT,
      fullDomain: `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co${callbackPath}`,
      protocol: 'https',
      baseUrl: `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`,
      source: 'environment_vars'
    };
  }
  
  // 3. Ultimate fallback to localhost
  return {
    environment: DomainEnvironment.LOCALHOST,
    fullDomain: `http://localhost:5000${callbackPath}`,
    protocol: 'http',
    baseUrl: 'http://localhost:5000',
    source: 'fallback'
  };
}

/**
 * Get multiple redirect URIs in priority order for robust fallback
 */
export function getPrioritizedRedirectUris(req: Request, callbackPath: string = '/api/auth/linkedin/callback'): string[] {
  const primary = detectDomain(req, callbackPath);
  const alternates: string[] = [];
  
  // Add the primary detected domain first
  const redirectUris = [primary.fullDomain];
  
  // Then add environment-specific alternatives
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    const replitDomain = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co${callbackPath}`;
    if (replitDomain !== primary.fullDomain) {
      alternates.push(replitDomain);
    }
  }
  
  // Add localhost options as final fallbacks
  alternates.push(`http://localhost:5000${callbackPath}`);
  alternates.push(`http://localhost:3000${callbackPath}`);
  
  // Filter out duplicates and add to main list
  alternates.forEach(uri => {
    if (!redirectUris.includes(uri)) {
      redirectUris.push(uri);
    }
  });
  
  return redirectUris;
}

/**
 * Log domain detection information for debugging
 */
export function logDomainInfo(req: Request, callbackPath: string = '/api/auth/linkedin/callback'): void {
  const detected = detectDomain(req, callbackPath);
  console.log('Domain Detection:', {
    environment: detected.environment,
    fullDomain: detected.fullDomain,
    protocol: detected.protocol,
    baseUrl: detected.baseUrl,
    source: detected.source,
    headers: {
      host: req.headers.host,
      forwardedProto: req.headers['x-forwarded-proto'],
      referer: req.headers.referer
    },
    env: {
      REPL_SLUG: process.env.REPL_SLUG,
      REPL_OWNER: process.env.REPL_OWNER
    }
  });
}