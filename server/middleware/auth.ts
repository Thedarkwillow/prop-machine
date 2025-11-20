import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Support both auth systems:
  // - Google OAuth (Railway): Passport sets req.user directly
  // - Replit Auth: req.session.user.claims.sub exists
  
  const passportUser = (req as any).user; // Google OAuth
  const replitUser = (req.session as any)?.user?.claims?.sub; // Replit Auth
  
  console.log("🔒 [requireAuth] Checking authentication...");
  console.log("🔒 [requireAuth] Passport user:", !!passportUser);
  console.log("🔒 [requireAuth] Replit user:", !!replitUser);
  
  if (!passportUser && !replitUser) {
    console.log("❌ [requireAuth] Not authenticated - returning 401");
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  console.log("✅ [requireAuth] Authenticated - proceeding");
  next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // Allow both authenticated and unauthenticated access
  next();
}
