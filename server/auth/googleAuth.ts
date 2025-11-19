// server/auth/googleAuth.ts
import passport from "passport";
import { Strategy as GoogleStrategy, VerifyCallback } from "passport-google-oauth20";
import session from "express-session";
import createMemoryStore from "memorystore";
import type { Express } from "express";
import { storage } from "../storage.js";
import dotenv from "dotenv";

dotenv.config();

const MemoryStore = createMemoryStore(session);

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const CALLBACK_PATH = "/auth/google/callback"; // must match Google console
const CALLBACK_FULL =
  process.env.GOOGLE_REDIRECT_URI ||
  `${process.env.APP_BASE_URL || "https://prop-machine-production.up.railway.app"}${CALLBACK_PATH}`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn("Google OAuth client id/secret not configured. Google login will not work.");
}

/**
 * Normalized user shape stored in session
 * {
 *   id: string,
 *   email: string | null,
 *   name: string | null,
 *   picture: string | null,
 *   provider: "google"
 * }
 */

export function getSessionMiddleware() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  return session({
    secret: process.env.SESSION_SECRET || "replace-me-with-long-random-secret",
    store: new MemoryStore({ checkPeriod: sessionTtl }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

function buildNormalizedUserFromProfile(profile: any, tokens: { accessToken?: string; refreshToken?: string } = {}) {
  return {
    id: profile.id,
    email: profile.emails?.[0]?.value || null,
    name: profile.displayName || null,
    picture: profile.photos?.[0]?.value || null,
    provider: "google" as const,
    // optional token fields kept in session.userTokens (not in normalized user)
  };
}

export async function setupGoogleAuth(app: Express) {
  // Required when behind Railway / proxies so secure cookies work
  app.set("trust proxy", 1);

  // Session middleware (ensure it's mounted before passport.session())
  app.use(getSessionMiddleware());

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport serialize/deserialize: store minimal user in session (we'll store normalized object)
  passport.serializeUser((user: any, done) => {
    // user should already be normalized
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });

  // Configure strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        callbackURL: CALLBACK_FULL,
        passReqToCallback: false,
      },
      // verify callback
      async (accessToken: string, refreshToken: string | undefined, profile: any, done: VerifyCallback) => {
        try {
          // Find or create DB user
          const email = profile.emails?.[0]?.value;
          let user = null;
          if (email) {
            user = await storage.getUserByEmail(email);
          }
          if (!user) {
            // Create with normalized fields similar to your other flows
            user = await storage.createUser({
              email: email || "",
              username: profile.displayName || profile.username || "unknown",
              bankroll: 1000,
              kellySizing: "full",
              riskTolerance: "moderate",
              isAdmin: false,
            });
          } else {
            // optionally update user profile fields if you want
            // await storage.updateUserProfile(user.id, { username: profile.displayName, profileImageUrl: profile.photos?.[0]?.value })
          }

          const normalized = buildNormalizedUserFromProfile(profile, { accessToken, refreshToken });

          // Attach DB id as string to normalized
          normalized.id = user.id.toString();

          // Return normalized + tokens (tokens saved to session separately)
          return done(null, { normalized, tokens: { accessToken, refreshToken } });
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );

  // Wrap passport authenticate callback to persist normalized shape cleanly
  app.get("/api/login", (req, res, next) => {
    // alias the frontend's expected login URL
    // this will start the passport flow
    passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" })(req, res, next);
  });

  app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" })
  );

  app.get(
    "/auth/google/callback",
    // passport middleware handles the exchange and calls our verify callback
    (req, res, next) => {
      passport.authenticate("google", (err: any, result: any) => {
        if (err) {
          console.error("Passport authenticate error:", err);
          return res.status(500).send("Authentication failed");
        }
        if (!result) {
          // no user/result returned
          return res.status(401).send("Authentication failed");
        }

        // result is { normalized, tokens }
        const { normalized, tokens } = result as { normalized: any; tokens: { accessToken?: string; refreshToken?: string } };

        // Persist normalized user object into req.session.user (flat shape)
        req.session.user = {
          id: normalized.id,
          email: normalized.email,
          name: normalized.name,
          picture: normalized.picture,
          provider: "google",
        };

        // Save tokens in session for possible refresh flows (kept separate)
        req.session.userTokens = {
          accessToken: tokens.accessToken || null,
          refreshToken: tokens.refreshToken || null,
        };

        // mark userId also for compatibility
        req.session.userId = normalized.id;

        // finish login
        req.logIn(req.session.user, (loginErr) => {
          if (loginErr) {
            console.error("req.logIn error:", loginErr);
            return res.status(500).send("Authentication failed");
          }
          // redirect to home (or where you want)
          return res.redirect("/");
        });
      })(req, res, next);
    }
  );

  // Return current user (normalized)
  app.get("/api/user", async (req: any, res) => {
    if (!req.session?.userId || !req.session?.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const dbUser = await storage.getUser(Number(req.session.userId));
      return res.json({ session: req.session.user, db: dbUser });
    } catch (err) {
      console.error("Error fetching user for /api/user:", err);
      return res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Logout (destroy session)
  app.post("/api/logout", (req: any, res) => {
    req.session?.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  console.log("✅ Google OAuth (Passport) configured. Callback URL:", CALLBACK_FULL);
}
