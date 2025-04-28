import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    linkedinId?: string;
    linkedinProfileUrl?: string;
    oauthState?: string;
  }
}