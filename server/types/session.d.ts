import { LinkedInOAuthState } from "../auth/linkedinProvider";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    oauthState?: string;
    linkedinOAuth?: LinkedInOAuthState;
  }
}