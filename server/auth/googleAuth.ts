import { Issuer, generators } from "openid-client";
import dotenv from "dotenv";
import type { Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { storage } from "../storage.js";

dotenv.config();

const MemoryStore = createMemoryStore(session);

const redirectUri =
  process.env.GOOGLE_REDIRECT_URI ||
  "https://prop-machine-production.up.railway.app/auth/google/callback";

let googleClient = null;
const codeVerifiers = new Map();

export async function getGoogleClient() {
  if (googleClient) return googleClient;

  const GoogleIssuer = await Issuer.discover("https://accounts.google.com");

  googleClient = new GoogleIssuer.Client({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uris: [redirectUri],
    response_types: ["code"],
  });

  return googleClient;
}

export async function setupGoogleAuth(app: Express) {
  /* ------------------------- SESSION ------------------------- */

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "your-secret-key",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({ checkPeriod: 86400000 }),
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    })
  );

  /* ------------------------- LOGIN ------------------------- */

  app.get("/api/login", (req, res) => {
    res.redirect("/auth/google");
  });

  /* ------------------------- START AUTH ------------------------- */

  app.get("/auth/google", async (_req, res) => {
    try {
      const client = await getGoogleClient();

      const codeVerifier = generators.codeVerifier();
      const codeChallenge = generators.codeChallenge(codeVerifier);
      const state = generators.state();

      codeVerifiers.set(state, codeVerifier);

      const url = client.authorizationUrl({
        scope: "openid email profile",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        redirect_uri: redirectUri,
        state,
      });

      res.redirect(url);
    } catch (err) {
      console.error("Google auth error:", err);
      res.status(500).send("Authentication failed");
    }
  });

  /* ------------------------- CALLBACK ------------------------- */

  app.get("/auth/google/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      const client = await getGoogleClient();

      const codeVerifier = codeVerifiers.get(state);
      if (!codeVerifier) throw new Error("Invalid state parameter");

      codeVerifiers.delete(state);

      const tokenSet = await client.callback(
        redirectUri,
        { code, state },
        { code_verifier: codeVerifier }
      );

      const userinfo = await client.userinfo(tokenSet.access_token);

      // Look up or create the user in your DB (unchanged)
      let user = await storage.getUserByEmail(userinfo.email);
      if (!user) {
        user = await storage.createUser({
          email: userinfo.email,
          username: userinfo.name,
          bankroll: 1000,
          kellySizing: "full",
          riskTolerance: "moderate",
          isAdmin: false,
        });
      }

      /* ------------------------- NORMALIZED SESSION ------------------------- */
      req.session.user = {
        id: user.id.toString(),
        email: userinfo.email || null,
        name: userinfo.name || null,
        picture: userinfo.picture || null,
        provider: "google",
      };

      res.redirect("/");
    } catch (err) {
      console.error("Google callback error:", err);
      res.status(500).send("Authentication callback failed");
    }
  });

  /* ------------------------- USER ENDPOINT ------------------------- */

  app.get("/api/user", async (req, res) => {
    if (!req.session?.user)
      return res.status(401).json({ error: "Not authenticated" });

    // Also return the DB row (optional)
    const dbUser = await storage.getUser(Number(req.session.user.id));
    res.json({ session: req.session.user, db: dbUser });
  });

  /* ------------------------- LOGOUT ------------------------- */

  app.post("/api/logout", (req, res) => {
    req.session?.destroy((err) => {
      if (err) return res.status(500).json({ error: "Logout failed" });
      res.json({ success: true });
    });
  });
}
