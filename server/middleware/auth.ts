import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionUser = (req.session as any)?.user;
  
  if (!sessionUser?.claims?.sub) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // Allow both authenticated and unauthenticated access
  next();
}
