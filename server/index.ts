import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import path from "path";
import fs from "fs";
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
import { verifyToken, getTokenFromRequest } from "./utils/jwt.js";
import { ingestAllProps } from './ingestion/propIngestion.js';

dotenv.config();

/* ------------------------- STARTUP VALIDATION ------------------------- */
// Validate critical environment variables to prevent silent misconfigurations

const requiredEnvVars: { name: string; critical: boolean; description: string }[] = [
  { name: "JWT_SECRET", critical: true, description: "Required for JWT token signing" },
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

app.use(cors({
  origin: true, // Allow all origins (or specify your frontend URL)
  credentials: true, // REQUIRED for cookies to work
}));
app.use(express.json());
app.use(cookieParser()); // Required for reading JWT from cookies

// Session middleware (required for Passport OAuth state)
const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
if (!sessionSecret) {
  console.warn("⚠️  WARNING: No SESSION_SECRET or JWT_SECRET found. Sessions may not work correctly.");
}

const sessionPool = createIPv4Pool();
const PgStore = connectPgSimple(session);

app.use(
  session({
    name: "prop-machine.sid",
    secret: sessionSecret || "fallback-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: new PgStore({
      pool: sessionPool,
      tableName: "sessions",
      createTableIfMissing: true, // Auto-create sessions table if missing
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

console.log("✅ Session middleware enabled (PostgreSQL-backed)");

// Fix DB permissions on startup
(async () => {
  await runPermissionFix();
})();

/* ------------------------- AUTH SETUP ------------------------- */

if (process.env.GOOGLE_CLIENT_ID && process.env.NODE_ENV === "production") {
  console.log("🔐 Using Google OAuth (Railway production)");
  setupGoogleAuth(app);
} else {
  console.log("🔐 Using Replit Auth (default)");
  setupAuth(app);
}

/* JWT Authentication Middleware - sets req.user from JWT cookie */
app.use(async (req: any, _res, next) => {
  // Try to get user from JWT cookie
  const token = getTokenFromRequest(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      // Load full user from database
      try {
        const user = await storage.getUser(payload.userId);
        if (user) {
          req.user = user;
        }
      } catch (error) {
        console.error("Error loading user from JWT:", error);
      }
    }
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

/* ------------------------- BOOTSTRAP PROP INGESTION ------------------------- */

async function maybeBootstrapProps() {
  console.log('\n[BOOTSTRAP] ========================================');
  console.log('[BOOTSTRAP] Checking bootstrap configuration...');
  console.log(`[BOOTSTRAP] ENABLE_PROP_BOOTSTRAP: ${process.env.ENABLE_PROP_BOOTSTRAP || 'not set'}`);
  
  if (process.env.ENABLE_PROP_BOOTSTRAP !== 'true') {
    console.log('[BOOTSTRAP] ⏸️  Bootstrap disabled (set ENABLE_PROP_BOOTSTRAP=true to enable)');
    console.log('[BOOTSTRAP] ========================================\n');
    return;
  }

  try {
    // Check if props table is empty
    const { db } = await import("./db.js");
    const { props } = await import("../shared/schema.js");
    const { sql } = await import("drizzle-orm");
    
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(props);
    const propsCount = Number(countResult[0]?.count || 0);
    
    console.log(`[BOOTSTRAP] 📊 Current props count in database: ${propsCount}`);
    
    if (propsCount === 0) {
      console.log('[BOOTSTRAP] ⚠️  Props table is EMPTY — running ingestion');
      console.log('[BOOTSTRAP] 🚀 Starting prop ingestion (this may take a while)...');
      console.log('[BOOTSTRAP] ========================================\n');
      
      const { ingestAllProps } = await import("./jobs/ingestAllProps.js");
      const results = await ingestAllProps();
      
      const totalInserted = Object.values(results).reduce((sum, r) => sum + r.inserted, 0);
      
      // Verify props were actually inserted
      const verifyCountResult = await db.select({ count: sql<number>`count(*)` }).from(props);
      const verifyCount = Number(verifyCountResult[0]?.count || 0);
      
      console.log('\n[BOOTSTRAP] ========================================');
      console.log(`[BOOTSTRAP] ✅ Ingestion completed`);
      console.log(`[BOOTSTRAP] 📊 Total props inserted: ${totalInserted}`);
      console.log(`[BOOTSTRAP] 📊 Total in DB now: ${verifyCount}`);
      
      for (const [platform, result] of Object.entries(results)) {
        console.log(`[BOOTSTRAP] 📊 ${platform}: ${result.inserted} inserted`);
        if (result.errors.length > 0) {
          console.log(`[BOOTSTRAP] ⚠️  ${platform} errors: ${result.errors.length}`);
        }
      }
      
      if (totalInserted === 0) {
        console.error('[BOOTSTRAP] ❌ WARNING: No props were inserted!');
        console.error('[BOOTSTRAP] This usually means:');
        console.error('[BOOTSTRAP]   1. Browser scrapers failed to find prop cards');
        console.error('[BOOTSTRAP]   2. Selectors need to be updated (sites may have changed)');
        console.error('[BOOTSTRAP]   3. Authentication failed (check storage state files)');
        console.error('[BOOTSTRAP]   4. All scrapers returned 0 props');
        console.error('[BOOTSTRAP] Solution: Check scraper logs above, then manually trigger:');
        console.error('[BOOTSTRAP]   POST /api/admin/ingest/props (requires admin auth)');
      } else if (verifyCount === 0) {
        console.error('[BOOTSTRAP] ❌ CRITICAL: Ingestion reported success but DB is still empty!');
        console.error('[BOOTSTRAP] This indicates a database insertion problem.');
      } else {
        console.log(`[BOOTSTRAP] ✅ Successfully inserted ${verifyCount} props into database`);
      }
      
      const allErrors = Object.values(results).flatMap(r => r.errors);
      if (allErrors.length > 0) {
        console.log(`[BOOTSTRAP] Error details:`, allErrors.slice(0, 5));
      }
      console.log('[BOOTSTRAP] ========================================\n');
    } else {
      console.log(`[BOOTSTRAP] ✅ Props table already has ${propsCount} rows, skipping bootstrap ingestion`);
      console.log('[BOOTSTRAP] ========================================\n');
    }
  } catch (err) {
    console.error('\n[BOOTSTRAP] ========================================');
    console.error('[BOOTSTRAP] ❌ Prop ingestion failed:', err);
    console.error('[BOOTSTRAP] ========================================\n');
  }
}

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

// Bootstrap props before server starts listening, then start server
(async () => {
  await maybeBootstrapProps();

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

    // OpticOdds streaming: DISABLED (no longer used)
    console.log("⏸️ OpticOdds streaming disabled (not in use)");
  });

  /* ------------------------- ERRORS ------------------------- */

  server.on("error", (err: any) => {
    console.error("❌ Server error:", err);
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use`);
    }
    process.exit(1);
  });

  /* ------------------------- DEV: VITE ------------------------- */

  if (process.env.NODE_ENV !== "production") {
    try {
      const { setupVite } = await import("./vite.js");
      await setupVite(app, server);
      console.log("✨ Vite dev server ready");
    } catch (error) {
      console.error("❌ Failed to setup Vite:", error);
      process.exit(1);
    }
  }
})();

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});
