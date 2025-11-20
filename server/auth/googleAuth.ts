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
          console.log("✅ Google profile received:", { 
            email: profile.emails?.[0]?.value,
            id: profile.id 
          });

          // Validate email exists
          const email = profile.emails?.[0]?.value;
          if (!email) {
            console.error("❌ Google did not provide email");
            return done(new Error("Google account must have an email address"));
          }

          const firstName = profile.name?.givenName || null;
          const lastName = profile.name?.familyName || null;
          const profileImageUrl = profile.photos?.[0]?.value || null;

          // Find or create user
          let user = await storage.getUserByEmail(email);

          if (!user) {
            console.log("🔄 Creating new user...");
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
            console.log("✅ New user created:", user.id);
          } else {
            console.log("✅ Existing user found:", user.id);
          }

          return done(null, user);
        } catch (error) {
          console.error("❌ Google Strategy error:", error);
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
      console.log("🔍 [CALLBACK] Started");
      console.log("🔍 [CALLBACK] Old sessionID:", req.sessionID);
      
      const user = req.user as any;
      console.log("🔍 [CALLBACK] User data:", { id: user?.id, email: user?.email });
      
      // ✅ CRITICAL: Regenerate session to get new cookie (fixes cookie conflict)
      req.session.regenerate((err) => {
        if (err) {
          console.error("❌ [CALLBACK] Session regenerate error:", err);
          return res.status(500).send("Session regeneration failed");
        }
        
        console.log("🔍 [CALLBACK] New sessionID:", req.sessionID);
        
        // Set user in the NEW session
        req.session.user = {
          id: user.id,
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        };
        
        console.log("🔍 [CALLBACK] req.session.user set:", req.session.user);
        
        // Save the new session
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("❌ [CALLBACK] Session save error:", saveErr);
            return res.status(500).send("Session save failed");
          }
          console.log("✅ [CALLBACK] Session saved successfully");
          console.log("✅ [CALLBACK] Redirecting to / with new cookie");
          res.redirect("/");
        });
      });
    }
  );

  // Get current user (used by useAuth hook)
  app.get("/api/auth/user", async (req, res) => {
    console.log("🔍 [/api/auth/user] Request received");
    console.log("🔍 [/api/auth/user] req.user exists:", !!req.user);
    console.log("🔍 [/api/auth/user] req.sessionID:", req.sessionID);
    console.log("🔍 [/api/auth/user] Cookie header:", req.headers.cookie);
    
    if (!req.user) {
      console.log("❌ [/api/auth/user] No req.user - returning 401");
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const fullUser = await storage.getUser((req.user as any).id);
      console.log("✅ [/api/auth/user] User found:", { id: fullUser.id, email: fullUser.email });
      
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
      console.error("❌ [/api/auth/user] Error fetching user:", error);
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
