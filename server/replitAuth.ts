import session from "express-session";
import type { Express, RequestHandler } from "express";
import createMemoryStore from "memorystore";
import { storage } from "./storage.js";
import { nanoid } from "nanoid";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Use in-memory store (sessions lost on restart, but login works)
  const MemoryStore = createMemoryStore(session);
  const sessionStore = new MemoryStore({
    checkPeriod: sessionTtl,
  });
  
  console.log("Using in-memory session store (sessions will be lost on restart)");
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  const issuerUrl = process.env.ISSUER_URL ?? "https://replit.com/oidc";
  const clientId = process.env.REPL_ID!;

  app.get("/api/login", async (req, res) => {
    const state = nanoid();
    const codeVerifier = nanoid(64);
    
    // Create SHA-256 hash of code verifier for PKCE
    const crypto = await import("crypto");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    req.session!.state = state;
    req.session!.codeVerifier = codeVerifier;

    const redirectUri = `${req.protocol}://${req.get("host")}/api/callback`;

    const authUrl = new URL(`${issuerUrl}/auth`);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    res.redirect(authUrl.toString());
  });

  app.get("/api/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      const savedState = req.session!.state;
      const codeVerifier = req.session!.codeVerifier;

      if (!code || !state || state !== savedState) {
        return res.status(400).send("Invalid callback");
      }

      const redirectUri = `${req.protocol}://${req.get("host")}/api/callback`;
      const tokenUrl = `${issuerUrl}/token`;

      const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: redirectUri,
          client_id: clientId,
          code_verifier: codeVerifier,
        }),
      });

      if (!tokenResponse.ok) {
        console.error("Token exchange failed:", await tokenResponse.text());
        return res.status(500).send("Authentication failed");
      }

      const tokens = await tokenResponse.json();
      const accessToken = tokens.access_token;

      // Get user info
      const userinfoResponse = await fetch(`${issuerUrl}/userinfo`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!userinfoResponse.ok) {
        console.error("Userinfo failed:", await userinfoResponse.text());
        return res.status(500).send("Authentication failed");
      }

      const userinfo = await userinfoResponse.json();

      await storage.upsertUser({
        id: userinfo.sub,
        email: userinfo.email || "",
        firstName: userinfo.first_name || "",
        lastName: userinfo.last_name || "",
        profileImageUrl: userinfo.profile_image_url || "",
      });

      req.session!.userId = userinfo.sub;
      delete req.session!.state;
      delete req.session!.codeVerifier;

      res.redirect("/");
    } catch (error) {
      console.error("Callback error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/logout", (req, res) => {
    req.session?.destroy(() => {
      res.redirect("/");
    });
  });

  app.get("/api/auth/user", async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
