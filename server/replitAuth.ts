import session from "express-session";
import type { Express, RequestHandler } from "express";
import createMemoryStore from "memorystore";
import { storage } from "./storage.js";
import { webcrypto } from "crypto";

const ISSUER_URL = process.env.ISSUER_URL ?? "https://replit.com/oidc";
const CLIENT_ID = process.env.REPL_ID!;

// Generate PKCE verifier and challenge
async function generatePKCE() {
  const verifier = base64URLEncode(webcrypto.getRandomValues(new Uint8Array(32)));
  const challenge = await createChallenge(verifier);
  return { verifier, challenge };
}

function base64URLEncode(buffer: Uint8Array): string {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function createChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await webcrypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
}

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
      const { verifier, challenge } = await generatePKCE();
      req.session!.code_verifier = verifier;

      const redirectUri = `https://${req.hostname}/api/callback`;
      const authUrl = new URL(`${ISSUER_URL}/auth`);
      authUrl.searchParams.set("client_id", CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "openid email profile offline_access");
      authUrl.searchParams.set("code_challenge", challenge);
      authUrl.searchParams.set("code_challenge_method", "S256");

      res.redirect(authUrl.toString());
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).send("Login failed");
    }
  });

  app.get("/api/callback", async (req, res) => {
    try {
      const { code } = req.query;
      const code_verifier = req.session!.code_verifier;

      if (!code || !code_verifier) {
        return res.status(400).send("Invalid callback");
      }

      const redirectUri = `https://${req.hostname}/api/callback`;
      const tokenUrl = `${ISSUER_URL}/token`;

      const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: redirectUri,
          client_id: CLIENT_ID,
          code_verifier,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Token exchange failed:", errorText);
        return res.status(500).send("Authentication failed");
      }

      const tokens = await tokenResponse.json();

      // Decode ID token to get claims
      const idToken = tokens.id_token;
      const claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());

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
    const tokenUrl = `${ISSUER_URL}/token`;
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
      }),
    });

    if (!tokenResponse.ok) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const tokens = await tokenResponse.json();
    const idToken = tokens.id_token;
    const claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());

    // Update session with refreshed tokens
    req.session!.user = {
      claims,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken,
      expires_at: claims.exp,
    };

    return next();
  } catch (error) {
    console.error("Token refresh failed:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
