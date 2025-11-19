import { Issuer, generators } from "openid-client";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import createMemoryStore from "memorystore";
import { storage } from "./storage.js";

let replitClient: any = null;

async function getReplitClient() {
  if (replitClient) return replitClient;
  
  const issuerUrl = process.env.ISSUER_URL ?? "https://replit.com/oidc";
  const ReplitIssuer = await Issuer.discover(issuerUrl);
  
  replitClient = new ReplitIssuer.Client({
    client_id: process.env.REPL_ID!,
    redirect_uris: [`https://${process.env.REPLIT_DOMAINS || "localhost"}/api/callback`],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  });
  
  // Disable strict issuer validation for Replit OIDC
  replitClient[Symbol.for('openid-client.custom.expect_iss')] = false;
  
  return replitClient;
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  const MemoryStore = createMemoryStore(session);
  const sessionStore = new MemoryStore({
    checkPeriod: sessionTtl,
  });
  console.log("Using in-memory session store (sessions will be lost on restart)");
  
  return session({
    secret: process.env.SESSION_SECRET || "replit-secret-key",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.get("/api/login", async (req, res) => {
    try {
      const client = await getReplitClient();
      const codeVerifier = generators.codeVerifier();
      const codeChallenge = generators.codeChallenge(codeVerifier);
      const state = generators.state();
      
      req.session!.codeVerifier = codeVerifier;
      req.session!.state = state;
      
      // Get the correct hostname including port for local dev
      const redirectUri = `${req.protocol}://${req.get('host')}/api/callback`;
      
      const authUrl = client.authorizationUrl({
        scope: "openid email profile",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state,
        redirect_uri: redirectUri,
      });
      
      res.redirect(authUrl);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      const codeVerifier = req.session!.codeVerifier;
      const sessionState = req.session!.state;
      const client = await getReplitClient();
      
      if (!code || !codeVerifier || !state || !sessionState) {
        return res.status(400).send("Invalid callback request");
      }
      
      if (state !== sessionState) {
        return res.status(400).send("State mismatch - possible CSRF attack");
      }
      
      const redirectUri = `${req.protocol}://${req.get('host')}/api/callback`;
      const params = client.callbackParams(req);
      const tokenSet = await client.callback(
        redirectUri,
        params,
        { 
          code_verifier: codeVerifier, 
          state: sessionState,
        }
      ).catch((err) => {
        console.error("Token exchange error:", err);
        throw err;
      });
      
      const userinfo = await client.userinfo(tokenSet.access_token!);
      
      try {
        await storage.upsertUser({
          id: userinfo.sub as string,
          email: userinfo.email as string,
          firstName: userinfo.first_name as string,
          lastName: userinfo.last_name as string,
          profileImageUrl: userinfo.profile_image_url as string,
        });
      } catch (error) {
        console.warn("Failed to upsert user:", error);
      }
      
      req.session!.userId = userinfo.sub as string;
      req.session!.access_token = tokenSet.access_token;
      
      delete req.session!.codeVerifier;
      delete req.session!.state;
      
      res.redirect("/");
    } catch (error) {
      console.error("Callback error:", error);
      res.status(500).send("Authentication failed");
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

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};
