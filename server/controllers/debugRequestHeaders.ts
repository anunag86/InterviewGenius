import { Request, Response } from "express";

/**
 * Debug endpoint to see exactly what request headers the server receives
 */
export const debugRequestHeaders = (req: Request, res: Response) => {
  const headersInfo = {
    headers: req.headers,
    hostname: req.hostname,
    ip: req.ip,
    originalUrl: req.originalUrl,
    protocol: req.protocol,
    secure: req.secure,
    environment: {
      REPL_SLUG: process.env.REPL_SLUG || 'Not set',
      REPL_OWNER: process.env.REPL_OWNER || 'Not set',
      NODE_ENV: process.env.NODE_ENV || 'Not set'
    },
    picard: req.headers.host?.includes('picard.replit.dev'),
    replit: req.headers.host?.includes('repl.co') || req.headers.host?.includes('replit.dev'),
    generatedRedirectUris: {
      picard: req.headers.host?.includes('picard.replit.dev') ? 
        `https://${req.headers.host}/callback` : 'Not applicable',
      replit: process.env.REPL_SLUG && process.env.REPL_OWNER ? 
        `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/callback` : 'Not applicable',
      standard: `${req.protocol}://${req.headers.host}/callback`
    }
  };
  
  res.json(headersInfo);
};