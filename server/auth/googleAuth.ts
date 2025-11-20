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
      console.log("📥 Callback received:", { code: !!req.query.code, state: !!req.query.state });
      
      const { code, state } = req.query;
      
      if (!code || !state) {
        console.error("❌ Missing code or state in query params");
        return res.status(400).send("Missing authorization code or state");
      }
      
      const client = await getGoogleClient();
      console.log("✅ Google client initialized");
      
      const codeVerifier = codeVerifiers.get(state as string);
      if (!codeVerifier) {
        console.error("❌ Invalid state parameter - no matching code verifier found");
        return res.status(400).send("Invalid state parameter");
      }
      codeVerifiers.delete(state as string);
      console.log("✅ Code verifier retrieved");
      
      console.log("🔄 Exchanging code for tokens...");
      const tokenSet = await client.callback(
        redirectUri,
        { code: code as string, state: state as string },
        { code_verifier: codeVerifier }
      );
      console.log("✅ Tokens received");

      console.log("🔄 Fetching user info...");
      const userinfo = await client.userinfo(tokenSet.access_token!);
      console.log("✅ User info received:", { email: userinfo.email });
      
      let user = await storage.getUserByEmail(userinfo.email as string);
      
      if (!user) {
        console.log("🔄 Creating new user...");
        user = await storage.createUser({
          email: userinfo.email as string,
          firstName: userinfo.given_name as string,
          lastName: userinfo.family_name as string,
          profileImageUrl: userinfo.picture as string,
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

      req.session!.userId = user.id;
      await new Promise<void>((resolve, reject) => {
        req.session!.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log("✅ Session saved, redirecting to /");
      
      res.redirect("/");
    } catch (error: any) {
      console.error("❌ Google callback error:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      res.status(500).send(`Authentication callback failed: ${error.message}`);
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
