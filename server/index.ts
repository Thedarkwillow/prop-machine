import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import fs from "fs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { createIPv4Pool } from "./db.js";

import { setupAuth } from "./replitAuth.js";
import { setupGoogleAuth } from "./auth/googleAuth.js";

import router from "./routes.js";
import { adminRoutes } from "./adminRoutes.js";
import { createAnalyticsRoutes } from "./analyticsRoutes.js";
import { createNotificationRoutes } from "./notificationRoutes.js";

import { storage } from "./storage.js";
import { seedDatabase } from "./seed.js";
import { propSchedulerService } from "./services/propSchedulerService.js";
import { opticOddsStreamService } from "./services/opticOddsStreamService.js";
import { runPermissionFix } from "./fixDbPermissions.js";

dotenv.config();

/* ------------------------- STARTUP VALIDATION ------------------------- */
// Validate critical environment variables to prevent silent misconfigurations

const requiredEnvVars: { name: string; critical: boolean; description: string }[] = [
  { name: "SESSION_SECRET", critical: true, description: "Required for secure session management" },
  { name: "DATABASE_URL_IPV4", critical: true, description: "Required for IPv4 database connection" },
];

const recommendedEnvVars: { name: string; description: string }[] = [
  { name: "BALLDONTLIE_API_KEY", description: "Required for NBA player search functionality" },
  { name: "ODDS_API_KEY", description: "Required for odds data and prop ingestion" },
];

// Check critical environment variables (production only)
if (process.env.NODE_ENV === "production") {
  const missingCritical = requiredEnvVars.filter(v => v.critical && !process.env[v.name]);
  
  if (missingCritical.length > 0) {
    console.error("\n❌ CRITICAL: Missing required environment variables:");
    missingCritical.forEach(v => {
      console.error(`  - ${v.name}: ${v.description}`);
    });
    console.error("\nServer cannot start. Please set these variables and redeploy.\n");
    process.exit(1);
  }
}

// Warn about missing recommended environment variables
const missingRecommended = recommendedEnvVars.filter(v => !process.env[v.name]);
if (missingRecommended.length > 0) {
  console.warn("\n⚠️  WARNING: Missing recommended environment variables:");
  missingRecommended.forEach(v => {
    console.warn(`  - ${v.name}: ${v.description}`);
  });
  console.warn("Some features may not work correctly.\n");
}

const app = express();

// Trust Railway's proxy for secure cookies
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(cors());
app.use(express.json());

/* ------------------------- SHARED SESSION MIDDLEWARE ------------------------- */
if (process.env.SESSION_SECRET) {
  console.log("🟢 Sessions enabled for OAuth");

  const sessionPool = createIPv4Pool(); // forced IPv4-only pool

  const PgStore = connectPgSimple(session);

  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: new PgStore({
        pool: sessionPool,
        tableName: "sessions",
        createTableIfMissing: false, // We override this manually now
      }),
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      },
    })
  );

  // Fix DB permissions and ensure sessions table exists
  (async () => {
    // Fix permissions first
    await runPermissionFix();

    // Then create sessions table
    try {
      const result = await sessionPool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          sid varchar NOT NULL PRIMARY KEY,
          sess json NOT NULL,
          expire timestamp(6) NOT NULL
        );
      `);

      console.log("✅ sessions table verified/created");
    } catch (err) {
      console.error("❌ Failed to ensure sessions table exists:", err);
    }
  })();
} else {
  console.log("🚫 Sessions disabled (no SESSION_SECRET set)");
}

/* ------------------------- AUTH SETUP ------------------------- */

if (process.env.GOOGLE_CLIENT_ID && process.env.NODE_ENV === "production") {
  console.log("🔐 Using Google OAuth (Railway production)");
  setupGoogleAuth(app);
} else {
  console.log("🔐 Using Replit Auth (default)");
  setupAuth(app);
}

/* Make req.user available (only for Replit Auth - Passport handles it for Google OAuth) */
app.use((req: any, _res, next) => {
  // Google OAuth: Passport already sets req.user via deserializeUser - don't overwrite it!
  // Replit Auth: req.session.user exists, so bridge it to req.user
  
  // Only bridge if Passport hasn't already set req.user (i.e., Replit Auth)
  if (!req.user && req.session?.user) {
    req.user = req.session.user;
  }
  
  next();
});

/* ------------------------- API ROUTES ------------------------- */

app.use("/api/admin", adminRoutes());
app.use("/api/analytics", createAnalyticsRoutes(storage));
app.use("/api/notifications", createNotificationRoutes(storage));
app.use("/api", router);

/* ------------------------- PRODUCTION STATIC FILES ------------------------- */

if (process.env.NODE_ENV === "production") {
  // Vite builds client assets to /app/dist in Docker
  const staticPath = path.resolve(process.cwd(), "dist");

  if (!fs.existsSync(staticPath)) {
    console.error(`❌ Build directory not found: ${staticPath}`);
    console.error("Run `npm run build` before deploying.");
    process.exit(1);
  }

  console.log(`📦 Serving static files from: ${staticPath}`);

  app.use(express.static(staticPath));

  // SPA fallback
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });
}

/* ------------------------- DATABASE SEED ------------------------- */

/* ------------------------- SERVER START ------------------------- */

const PORT = parseInt(process.env.PORT || "5000", 10);

async function startOpticOddsStreaming() {
  console.log(`🔍 OPTICODDS_STREAM_DEBUG: Checking streaming prerequisites...`);
  console.log(`   - API Key present: ${!!process.env.OPTICODDS_API_KEY}`);
  console.log(`   - ENABLE_STREAMING: ${process.env.ENABLE_STREAMING || "not set (defaults to disabled in WEB mode)"}`);

  if (!process.env.OPTICODDS_API_KEY) {
    console.log("⚠️  OpticOdds streaming disabled: No API key configured");
    return;
  }

  // Start league-based streams for NBA, NFL, NHL
  const leagues = [
    { sport: "basketball", league: "NBA" },
    { sport: "football", league: "NFL" },
    { sport: "hockey", league: "NHL" },
  ];

  // Use exact sportsbook names (capitalized as shown in OpticOdds examples)
  const sportsbooks = ["PrizePicks", "Underdog Fantasy"];

  leagues.forEach(({ sport, league }) => {
    try {
      console.log(`🔍 OPTICODDS_STREAM_DEBUG: Attempting to start ${league} stream (sport: ${sport})...`);
      const streamId = opticOddsStreamService.startOddsStream({
        sport,
        sportsbooks,
        leagues: [league],
      });
      console.log(`✅ Started ${league} SSE stream: ${streamId}`);
      console.log(`🔍 OPTICODDS_STREAM_DEBUG: Stream ${streamId} should now be receiving live odds`);
    } catch (error) {
      console.error(`❌ Failed to start ${league} stream:`, error);
    }
  });
}

const server = app.listen(PORT, "0.0.0.0", async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Listening on 0.0.0.0:${PORT}`);

  // Database seed (non-production only)
  if (process.env.NODE_ENV !== "production") {
    await seedDatabase();
  } else {
    console.log("🌱 Skipping database seed on startup (production mode).");
  }

  // Scheduler (5-minute refresh for fast prop updates)
  if (process.env.DISABLE_PROP_SCHEDULER === "true") {
    console.log("⏸️ Scheduler disabled (DISABLE_PROP_SCHEDULER=true)");
  } else {
    propSchedulerService.start(5); // 5 minutes for frequent updates
  }

  // OpticOdds streaming: explicitly disabled in WEB mode unless ENABLE_STREAMING === "true"
  if (process.env.ENABLE_STREAMING !== "true") {
    console.log("⏸️ OpticOddsStreamService disabled (WEB mode)");
  } else {
    try {
      await startOpticOddsStreaming();
    } catch (error) {
      console.error("❌ Failed to start OpticOdds streaming:", error);
    }
  }
});

/* ------------------------- ERRORS ------------------------- */

server.on("error", (err: any) => {
  console.error("❌ Server error:", err);
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

/* ------------------------- DEV: VITE ------------------------- */

if (process.env.NODE_ENV !== "production") {
  (async () => {
    try {
      const { setupVite } = await import("./vite.js");
      await setupVite(app, server);
      console.log("✨ Vite dev server ready");
    } catch (error) {
      console.error("❌ Failed to setup Vite:", error);
      process.exit(1);
    }
  })();
}
