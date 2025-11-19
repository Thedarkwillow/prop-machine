import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    access_token?: string;
    codeVerifier?: string;
    state?: string;
  }
}
