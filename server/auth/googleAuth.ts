// server/auth/googleAuth.ts
import { Issuer, generators, Client } from "openid-client";
import dotenv from "dotenv";
import type { Express, RequestHandler } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { storage } from "../storage.js";

dotenv.config();

const MemoryStore = createMemoryStore(session);

// MUST match the redirect URI in Google Cloud Console exactly
const redirectUri =
  process.env.GOOGLE_REDIRECT_URI ||
  "https://prop-machine-production.up.railway.app/auth/google/callback";

const clientId = process.env.GOOGLE_CLIENT_ID!;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

if (!clientId || !clientSecret) {
  console.warn("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set. Google login will not work.");
}

let googleClient: Client | null = null;

/**
 * Initialize and cache the OpenID Connect client
 */
export async function getGoogleClient(): Promise<Client> {
  if (googleClient) return googleClient;

  const issuer = await Issuer.discover("https://accounts.google.com");
  googleClient = new issuer.Client({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: [redirectUri],
    response_types: ["code"],
  });

  return googleClient;
}

/**
 * Normalized user shape saved into session:
 * {
 *   id: string,
 *   email: string | null,
 *   name: string | null,
 *   picture: string | null,
 *   provider: "google"
 * }
 */
type NormalizedSessionUser = {
  id: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  provider: "google";
};

/**
 * Setup Google auth routes & session middleware.
 * Call this from server/index.ts early (before mounting API routes).
 */
export function setupGoogleAuth(app: Express) {
  // Trust the proxy (Railway) so secure cookies work
  app.set("trust proxy", 1);

  // Session middleware (must be registered before any routes that use session)
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 7 days
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "replace-with-secure-secret",
      store: new MemoryStore({ checkPeriod: sessionTtl }),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: sessionTtl,
      },
    })
  );

  // Alias expected by frontend: /api/login -> starts Google flow
  app.get("/api/login", (_req, res) => {
    // Redirect to the route that starts the OpenID flow
    res.redirect("/auth/google");
  });

  // Start the authorization flow (creates code_verifier and state in session)
  app.get("/auth/google", async (req: any, res) => {
    try {
      const client = await getGoogleClient();

      const codeVerifier = generators.codeVerifier();
      const codeChallenge = generators.codeChallenge(codeVerifier);
      const state = generators.state();

      // Persist verifier+state in session (survives restarts & multi-instance)
      req.session.oauth = {
        codeVerifier,
        state,
      };

      const url = client.authorizationUrl({
        scope: "openid email profile",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        redirect_uri: redirectUri,
        state,
        // optionally: prompt: "select_account"
      });

      return res.redirect(url);
    } catch (err) {
      console.error("Google auth start error:", err);
      return res.status(500).send("Authentication failed");
    }
  });

  // Callback that Google will call with ?code=...&state=...
  app.get("/auth/google/callback", async (req: any, res) => {
    try {
      const { code, state } = req.query as { code?: string; state?: string };
      if (!code || !state) {
        console.error("Missing code or state on callback", { code, state });
        return res.status(400).send("Invalid callback");
      }

      // Load stored verifier/state from session
      const oauth = req.session?.oauth;
      if (!oauth) {
        console.error("No oauth state in session (session cleared or missing)");
        return res.status(400).send("Invalid callback (no session)");
      }

      if (oauth.state !== state) {
        console.error("State mismatch", { expected: oauth.state, got: state });
        return res.status(400).send("Invalid state parameter");
      }

      const client = await getGoogleClient();

      // Exchange code for tokens using the stored code_verifier
      const tokenSet = await client.callback(
        redirectUri,
        { code, state },
        { code_verifier: oauth.codeVerifier }
      );

      // tokenSet contains access_token, id_token, refresh_token (maybe)
      const userinfo = await client.userinfo(tokenSet.access_token as string);

      // Upsert/find user in DB
      let user = null;
      if (userinfo.email) {
        user = await storage.getUserByEmail(userinfo.email);
      }

      if (!user) {
        // create user if not present
        user = await storage.createUser({
          email: userinfo.email ?? "",
          username: (userinfo.name as string) ?? "google-user",
          bankroll: 1000,
          kellySizing: "full",
          riskTolerance: "moderate",
          isAdmin: false,
        });
      }

      // Normalize session user
      const normalized: NormalizedSessionUser = {
        id: String(user.id),
        email: (userinfo.email as string) ?? null,
        name: (userinfo.name as string) ?? null,
        picture: (userinfo.picture as string) ?? null,
        provider: "google",
      };

      // Save normalized user + tokens into session
      req.session.user = normalized;
      req.session.userId = normalized.id;
      req.session.tokens = {
        accessToken: tokenSet.access_token ?? null,
        refreshToken: tokenSet.refresh_token ?? null,
        expiresAt:
          // tokenSet.expires_at may be a number; otherwise compute from expires_in
          (typeof tokenSet.expires_at === "number"
            ? tokenSet.expires_at
            : tokenSet.expires_in
            ? Math.floor(Date.now() / 1000) + Number(tokenSet.expires_in)
            : null) ?? null,
      };

      // Clean up oauth temp fields
      delete req.session.oauth;

      // Redirect to home (or any post-login page)
      return res.redirect("/");
    } catch (err) {
      console.error("Google callback error:", err);
      // keep message concise for users, full details in logs
      return res.status(500).send("Authentication callback failed");
    }
  });

  // Return current session user and DB row (if any)
  app.get("/api/user", async (req: any, res) => {
    try {
      if (!req.session?.userId) return res.status(401).json({ error: "Not authenticated" });

      const dbUser = await storage.getUser(Number(req.session.userId));
      return res.json({ session: req.session.user, db: dbUser });
    } catch (err) {
      console.error("Error in /api/user:", err);
      return res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Logout: destroy session
  app.post("/api/logout", (req: any, res) => {
    req.session?.destroy((err: any) => {
      if (err) {
        console.error("Logout destroy error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  console.log("✅ Google OpenID auth configured. Callback:", redirectUri);
}

/**
 * Optional helper middleware to require authentication in routes.
 * Use: app.use('/api/protected', requireAuth, protectedRouter)
 */
export const requireAuth: RequestHandler = (req: any, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};
