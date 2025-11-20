import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import type { Express } from "express";
import { storage } from "../storage.js";

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
  // Session middleware is configured in server/index.ts (shared with Replit Auth)
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

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
          // Validate email exists
          const email = profile.emails?.[0]?.value;
          if (!email) {
            console.error("Google OAuth error: No email provided");
            return done(new Error("Google account must have an email address"));
          }

          const firstName = profile.name?.givenName || null;
          const lastName = profile.name?.familyName || null;
          const profileImageUrl = profile.photos?.[0]?.value || null;

          // Find or create user
          let user = await storage.getUserByEmail(email);

          if (!user) {
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
          }

          return done(null, user);
        } catch (error) {
          console.error("Google OAuth error:", error);
          return done(error as Error);
        }
      }
    )
  );

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: any, done) => {
    try {
      if (!id) {
        return done(new Error("Invalid session ID"));
      }
      const user = await storage.getUser(String(id));
      done(null, user);
    } catch (error) {
      done(error);
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
    passport.authenticate("google", {
      failureRedirect: "/",
      failureMessage: true,
    }),
    (req, res) => {
      res.redirect("/");
    }
  );

  // Get current user (used by useAuth hook)
  app.get("/api/auth/user", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = (req.user as any).id;
      const fullUser = await storage.getUser(userId);
      
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

  // Logout
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });
}
