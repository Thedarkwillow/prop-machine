import { Issuer, generators } from "openid-client";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import createMemoryStore from "memorystore";
import { storage } from "./storage.js";

let replitClient: any = null;

async function getReplitClient() {
  if (replitClient) return replitClient;
  
  const ReplitIssuer = await Issuer.discover(process.env.ISSUER_URL ?? "https://replit.com/oidc");
  
  replitClient = new ReplitIssuer.Client({
    client_id: process.env.REPL_ID!,
    redirect_uris: [`https://${process.env.REPLIT_DOMAINS || "localhost"}/api/callback`],
    response_types: ["code"],
  });
  
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
      
      req.session!.codeVerifier = codeVerifier;
      
      const authUrl = client.authorizationUrl({
        scope: "openid email profile",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        redirect_uri: `https://${req.hostname}/api/callback`,
      });
      
      res.redirect(authUrl);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/callback", async (req, res) => {
    try {
      const { code } = req.query;
      const codeVerifier = req.session!.codeVerifier;
      const client = await getReplitClient();
      
      if (!code || !codeVerifier) {
        return res.status(400).send("Invalid callback request");
      }
      
      const tokenSet = await client.callback(
        `https://${req.hostname}/api/callback`,
        { code: code as string },
        { code_verifier: codeVerifier }
      );
      
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
