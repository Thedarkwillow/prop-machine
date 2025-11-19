import * as client from "openid-client";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import createMemoryStore from "memorystore";
import { storage } from "./storage.js";

const getOidcConfig = memoize(
  async () => {
    const issuerUrl = new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc");
    const config = await client.discovery(issuerUrl, process.env.REPL_ID!);
    return config;
  },
  { maxAge: 3600 * 1000 }
);

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

  app.get("/api/login", async (req, res) => {
    try {
      const config = await getOidcConfig();
      const code_verifier = client.randomPKCECodeVerifier();
      const code_challenge = await client.calculatePKCECodeChallenge(code_verifier);

      req.session!.code_verifier = code_verifier;

      const redirectUri = `https://${req.hostname}/api/callback`;
      const parameters: Record<string, string> = {
        redirect_uri: redirectUri,
        scope: 'openid email profile offline_access',
        code_challenge,
        code_challenge_method: 'S256',
      };

      const authUrl = client.buildAuthorizationUrl(config, parameters);
      res.redirect(authUrl.href);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).send("Login failed");
    }
  });

  app.get("/api/callback", async (req, res) => {
    try {
      const config = await getOidcConfig();
      const code_verifier = req.session!.code_verifier;

      if (!code_verifier) {
        return res.status(400).send("Invalid session");
      }

      const currentUrl = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);
      const redirectUri = `https://${req.hostname}/api/callback`;

      const tokens = await client.authorizationCodeGrant(config, currentUrl, {
        pkceCodeVerifier: code_verifier,
        expectedRedirectUri: redirectUri,
      });

      const claims = tokens.claims();

      // Save user to database
      await storage.upsertUser({
        id: claims.sub,
        email: claims.email || "",
        firstName: claims.first_name || "",
        lastName: claims.last_name || "",
        profileImageUrl: claims.profile_image_url || "",
      });

      // Save user info to session
      req.session!.user = {
        claims,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: claims.exp,
      };

      delete req.session!.code_verifier;
      res.redirect("/");
    } catch (error) {
      console.error("Callback error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/logout", async (req, res) => {
    const session = req.session!;
    req.session?.destroy(() => {
      res.redirect("/");
    });
  });

  app.get("/api/auth/user", async (req: any, res) => {
    try {
      const userId = req.session?.user?.claims?.sub;
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
  const sessionUser = req.session?.user;

  if (!sessionUser?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if token is expired
  const now = Math.floor(Date.now() / 1000);
  if (sessionUser.expires_at && now <= sessionUser.expires_at) {
    return next();
  }

  // Try to refresh token if expired
  const refreshToken = sessionUser.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const config = await getOidcConfig();
    const tokens = await client.refreshTokenGrant(config, refreshToken);
    const claims = tokens.claims();
    
    // Update session with refreshed tokens
    req.session!.user = {
      claims,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: claims.exp,
    };
    
    return next();
  } catch (error) {
    console.error("Token refresh failed:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
