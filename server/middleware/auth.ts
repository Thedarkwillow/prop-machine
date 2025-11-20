import { Request, Response, NextFunction } from "express";

/**
 * Extract user ID from request, supporting both auth systems:
 * - Google OAuth (Railway): req.user.id
 * - Replit Auth (Development): req.user.claims.sub (after bridging middleware)
 */
export function getUserId(req: Request): string | null {
  const user = (req as any).user;
  
  if (!user) {
    return null;
  }
  
  // Google OAuth: user ID is in req.user.id
  if (user.id) {
    return user.id;
  }
  
  // Replit Auth: user ID is in req.user.claims.sub (after bridging)
  if (user.claims?.sub) {
    return user.claims.sub;
  }
  
  return null;
}

/**
 * Middleware to require authentication from either system
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = getUserId(req);
  
  if (process.env.NODE_ENV === 'development') {
    console.log("🔒 [requireAuth] User ID:", userId ? "✅" : "❌");
  }
  
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // Allow both authenticated and unauthenticated access
  next();
}
