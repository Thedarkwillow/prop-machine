import { Issuer, generators } from "openid-client";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import type { Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { storage } from "../storage.js";

dotenv.config();

const MemoryStore = createMemoryStore(session);

const redirectUri =
  process.env.GOOGLE_REDIRECT_URI ||
  "https://your-railway-domain.up.railway.app/auth/google/callback";

let googleClient: any = null;
const codeVerifiers = new Map<string, string>();

export async function getGoogleClient() {
  if (googleClient) return googleClient;

  const GoogleIssuer = await Issuer.discover("https://accounts.google.com");

  googleClient = new GoogleIssuer.Client({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uris: [redirectUri],
    response_types: ["code"],
  });

  return googleClient;
}

export async function setupGoogleAuth(app: Express) {
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "your-secret-key",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({
        checkPeriod: 86400000,
      }),
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    })
  );

  // Alias /api/login to /auth/google for compatibility with Landing page
  app.get("/api/login", async (req, res) => {
    res.redirect("/auth/google");
  });

  app.get("/auth/google", async (req, res) => {
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
    } catch (error) {
      console.error("Google auth error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/auth/google/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      const client = await getGoogleClient();
      
      const codeVerifier = codeVerifiers.get(state as string);
      if (!codeVerifier) {
        throw new Error("Invalid state parameter");
      }
      codeVerifiers.delete(state as string);
      
      const tokenSet = await client.callback(
        redirectUri,
        { code: code as string, state: state as string },
        { code_verifier: codeVerifier }
      );

      const userinfo = await client.userinfo(tokenSet.access_token!);
      
      let user = await storage.getUserByEmail(userinfo.email as string);
      
      if (!user) {
        user = await storage.createUser({
          email: userinfo.email as string,
          username: userinfo.name as string,
          bankroll: 1000,
          kellySizing: "full",
          riskTolerance: "moderate",
          isAdmin: false,
        });
      }

      req.session!.userId = user.id;
      res.redirect("/");
    } catch (error) {
      console.error("Google callback error:", error);
      res.status(500).send("Authentication callback failed");
    }
  });

  app.get("/api/user", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });
}
