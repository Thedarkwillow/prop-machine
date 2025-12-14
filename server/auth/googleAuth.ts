import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import type { Express } from "express";
import { storage } from "../storage.js";
import { generateToken, verifyToken, getTokenFromRequest } from "../utils/jwt.js";

dotenv.config();

// Use environment variable or construct based on environment
const getCallbackURL = () => {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  // For Railway production
  if (process.env.NODE_ENV === "production") {
    return "https://prop-machine-production.up.railway.app/api/auth/google/callback";
  }
  // For local development
  return "http://localhost:5000/api/auth/google/callback";
};

export async function setupGoogleAuth(app: Express) {
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session()); // Required for OAuth state parameter

  // Configure Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: getCallbackURL(),
        state: true, // ✅ Enable state parameter for CSRF protection
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log("🔐 Google OAuth strategy callback:", {
            profileId: profile.id,
            hasEmail: !!profile.emails?.[0]?.value,
            displayName: profile.displayName,
          });

          // Validate email exists
          const email = profile.emails?.[0]?.value;
          if (!email) {
            console.error("❌ Google OAuth error: No email provided");
            return done(new Error("Google account must have an email address"));
          }

          const firstName = profile.name?.givenName || null;
          const lastName = profile.name?.familyName || null;
          const profileImageUrl = profile.photos?.[0]?.value || null;

          // Find or create user
          let user = await storage.getUserByEmail(email);
          console.log("👤 User lookup result:", { found: !!user, email });

          if (!user) {
            console.log("➕ Creating new user:", { email, firstName, lastName });
            user = await storage.createUser({
              email,
              firstName,
              lastName,
              profileImageUrl,
              bankroll: "1000.00",
              initialBankroll: "1000.00",
              kellySizing: "0.125",
              riskTolerance: "balanced",
              isAdmin: false,
            });
            console.log("✅ New user created:", { userId: user.id, email });
          } else {
            console.log("✅ Existing user found:", { userId: user.id, email });
          }

          return done(null, user);
        } catch (error) {
          console.error("❌ Google OAuth strategy error:", error);
          if (error instanceof Error) {
            console.error("   Error message:", error.message);
            console.error("   Error stack:", error.stack);
          }
          return done(error as Error);
        }
      }
    )
  );

  // Serialize user to session (required for passport.session())
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session (required for passport.session())
  passport.deserializeUser(async (id: any, done) => {
    try {
      if (!id) {
        return done(null, false);
      }
      
      const userId = String(id);
      const user = await storage.getUser(userId);
      if (!user) {
        return done(null, false);
      }
      
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(null, false);
    }
  });

  // Routes
  app.get("/api/login", (req, res) => {
    res.redirect("/api/auth/google");
  });

  // Initiate Google OAuth
  app.get(
    "/api/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
    })
  );

  // Google OAuth callback
  app.get(
    "/api/auth/google/callback",
    (req, res, next) => {
      // Log callback attempt for debugging
      console.log("🔐 Google OAuth callback received:", {
        hasCode: !!req.query.code,
        hasState: !!req.query.state,
        hasError: !!req.query.error,
        error: req.query.error,
        errorDescription: req.query.error_description,
      });
      next();
    },
    (req, res, next) => {
      passport.authenticate("google", (err: any, user: any, info: any) => {
        if (err) {
          console.error("❌ Passport authentication error:", err);
          console.error("   Error details:", {
            message: err.message,
            stack: err.stack,
          });
          return res.redirect("/?auth_error=authentication_failed");
        }
        if (!user) {
          console.error("❌ Passport authentication failed - no user:", info);
          return res.redirect("/?auth_error=no_user");
        }
        
        // Generate JWT token
        const token = generateToken({
          userId: user.id,
          email: user.email || "",
        });
        
        // Set JWT as httpOnly cookie
        res.cookie("auth_token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        
        console.log("✅ Google OAuth successful, JWT set:", {
          userId: user.id,
          email: user.email,
        });
        
        res.redirect("/");
      })(req, res, next);
    }
  );

  // Get current user from JWT (used by useAuth hook)
  app.get("/auth/me", async (req, res) => {
    try {
      const token = getTokenFromRequest(req);
      
      if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const payload = verifyToken(token);
      if (!payload) {
        return res.status(401).json({ error: "Invalid token" });
      }
      
      const fullUser = await storage.getUser(payload.userId);
      if (!fullUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Return format matching AuthUser interface
      res.json({
        id: fullUser.id,
        email: fullUser.email,
        firstName: fullUser.firstName || "",
        lastName: fullUser.lastName || "",
        profileImageUrl: fullUser.profileImageUrl || undefined,
        isAdmin: fullUser.isAdmin,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Logout (GET endpoint) - clear JWT cookie
  app.get("/api/logout", (req, res) => {
    res.clearCookie("auth_token");
    res.redirect("/");
  });

  // Logout (POST endpoint for API clients) - clear JWT cookie
  app.post("/api/logout", (req, res) => {
    res.clearCookie("auth_token");
    res.json({ success: true });
  });
}
