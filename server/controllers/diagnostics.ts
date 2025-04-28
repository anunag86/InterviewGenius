import { Request, Response } from "express";

/**
 * Get detailed diagnostics for LinkedIn OAuth configuration
 */
export const getLinkedInDiagnostics = (req: Request, res: Response) => {
  try {
    const diagnostics = {
      REPL_SLUG: process.env.REPL_SLUG || null,
      REPL_OWNER: process.env.REPL_OWNER || null,
      REDIRECT_URI: process.env.REDIRECT_URI || null,
      NODE_ENV: process.env.NODE_ENV || null,
      CLIENT_ID_PREFIX: process.env.LINKEDIN_CLIENT_ID ? process.env.LINKEDIN_CLIENT_ID.substring(0, 4) : null,
      CLIENT_SECRET_PREFIX: process.env.LINKEDIN_CLIENT_SECRET ? process.env.LINKEDIN_CLIENT_SECRET.substring(0, 4) : null,
      IS_PRODUCTION: process.env.NODE_ENV === 'production',
      TIMESTAMP: new Date().toISOString()
    };
    
    res.json(diagnostics);
  } catch (error) {
    console.error('Error getting LinkedIn diagnostics:', error);
    res.status(500).json({ error: 'Failed to get diagnostics' });
  }
};