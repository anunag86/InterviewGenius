import { Request, Response } from "express";

/**
 * Set a value in the session for testing session persistence
 */
export const setSessionValue = (req: Request, res: Response) => {
  const { key, value } = req.query;
  
  if (!key || !value) {
    return res.status(400).json({
      success: false,
      error: "Missing key or value parameters"
    });
  }
  
  // Set the value in the session
  if (req.session) {
    // Add a type assertion to handle dynamic property assignment
    (req.session as any)[key.toString()] = value.toString();
    
    return res.json({
      success: true,
      key: key.toString(),
      value: value.toString(),
      session_id: req.session.id
    });
  } else {
    return res.status(500).json({
      success: false,
      error: "Session not available"
    });
  }
};

/**
 * Get a value from the session to test persistence
 */
export const getSessionValue = (req: Request, res: Response) => {
  const { key } = req.query;
  
  if (!key) {
    return res.status(400).json({
      success: false,
      error: "Missing key parameter"
    });
  }
  
  if (req.session) {
    const value = (req.session as any)[key.toString()];
    
    return res.json({
      success: true,
      key: key.toString(),
      value,
      sessionId: req.session.id
    });
  } else {
    return res.status(500).json({
      success: false,
      error: "Session not available"
    });
  }
};