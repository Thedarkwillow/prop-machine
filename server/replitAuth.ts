import session from "express-session";
import type { Express, RequestHandler } from "express";
import createMemoryStore from "memorystore";
import { storage } from "./storage.js";
import { webcrypto } from "crypto";

const ISSUER_URL = process.env.ISSUER_URL ?? "https://replit.com/oidc";
const CLIENT_ID = process.env.REPL_ID!;

/* ------------------------- PKCE UTIL ------------------------- */

async function generatePKCE() {
  const verifier = base64URLEncode(webcrypto.getRandomValues(new Uint8Array(32)));
  const challenge = await createChallenge(verifier);
  return { verifier, challenge };
}

function base64URLEncode(buffer: Uint8Array): string {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function createChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hash = await webcrypto.subtle.digest("SHA-256", data);
  return base64URLEncode(new Uint8Array(hash));
}

/* ------------------------- SESSION INIT ------------------------- */

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const MemoryStore = createMemoryStore(session);

  return session({
    secret: process.env.SESSION_SECRET!,
    store: new MemoryStore({ checkPeriod: sessionTtl }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

/* ------------------------- MAIN AUTH SETUP ------------------------- */

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  /* ------------------------- LOGIN ------------------------- */

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
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).send("Login failed");
    }
  });

  /* ------------------------- CALLBACK ------------------------- */

  app.get("/api/callback", async (req, res) => {
    try {
      const { code } = req.query;
      const code_verifier = req.session!.code_verifier;
      if (!code || !code_verifier) return res.status(400).send("Invalid callback");

      const redirectUri = `https://${req.hostname}/api/callback`;

      const tokenResponse = await fetch(`${ISSUER_URL}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: redirectUri,
          client_id: CLIENT_ID,
          code_verifier,
        }),
      });

      if (!tokenResponse.ok) {
        console.error("Token exchange failed:", await tokenResponse.text());
        return res.status(500).send("Authentication failed");
      }

      const tokens = await tokenResponse.json();
      const idToken = tokens.id_token;
      const claims = JSON.parse(Buffer.from(idToken.split(".")[1], "base64").toString());

      /* ------------------------- DB USER ------------------------- */

      let user = await storage.getUserByEmail(claims.email);
      if (!user) {
        user = await storage.createUser({
          email: claims.email ?? "",
          username: `${claims.first_name ?? ""} ${claims.last_name ?? ""}`,
          bankroll: 1000,
          kellySizing: "full",
          riskTolerance: "moderate",
          isAdmin: false,
        });
      }

      /* ------------------------- NORMALIZED SESSION ------------------------- */

      req.session.userId = user.id;
      req.session.user = {
        id: user.id,
        email: user.email,
        name: user.username,
        picture: claims.profile_image_url ?? null,
        provider: "replit",
      };

      delete req.session.code_verifier;

      res.redirect("/");
    } catch (err) {
      console.error("Callback error:", err);
      res.status(500).send("Authentication failed");
    }
  });

  /* ------------------------- USER ------------------------- */

  app.get("/api/auth/user", async (req: any, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(req.session.userId);
    res.json({ user });
  });

  /* ------------------------- LOGOUT ------------------------- */

  app.get("/api/logout", (req, res) => {
    req.session?.destroy(() => res.redirect("/"));
  });
}

/* ------------------------- MIDDLEWARE ------------------------- */

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
  return next();
};
