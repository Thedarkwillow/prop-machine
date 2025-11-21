import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import fs from "fs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db.js";

import { setupAuth } from "./replitAuth.js";
import { setupGoogleAuth } from "./auth/googleAuth.js";

import router from "./routes.js";
import { adminRoutes } from "./adminRoutes.js";
import { createAnalyticsRoutes } from "./analyticsRoutes.js";
import { createNotificationRoutes } from "./notificationRoutes.js";

import { storage } from "./storage.js";
import { seedDatabase } from "./seed.js";
import { propSchedulerService } from "./services/propSchedulerService.js";
import { OpticOddsStreamService } from "./services/opticOddsStreamService.js";

dotenv.config();

/* ------------------------- STARTUP VALIDATION ------------------------- */
// Validate critical environment variables to prevent silent misconfigurations

const requiredEnvVars: { name: string; critical: boolean; description: string }[] = [
  { name: "SESSION_SECRET", critical: true, description: "Required for secure session management" },
  { name: "DATABASE_URL", critical: true, description: "Required for database connection" },
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
// PostgreSQL-backed sessions for Railway multi-instance support
// In development, Replit Auth uses this session store too
const PgStore = connectPgSimple(session);

app.use(
  session({
    store: new PgStore({
      pool,
      tableName: "sessions", // Use existing sessions table
      createTableIfMissing: false, // Managed by Drizzle schema
    }),
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Only secure in production (HTTPS)
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // "none" required for Railway OAuth
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

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
  const distPath = path.join(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    console.error(`❌ Build directory not found: ${distPath}`);
    console.error("Run `npm run build` before deploying.");
    process.exit(1);
  }

  console.log(`📦 Serving static files from: ${distPath}`);

  app.use(express.static(distPath));

  // SPA fallback
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

/* ------------------------- DATABASE SEED ------------------------- */

seedDatabase().catch((err) => {
  console.error("❌ Error seeding database:", err);
});

/* ------------------------- SERVER START ------------------------- */

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Listening on 0.0.0.0:${PORT}`);

  // Scheduler
  if (process.env.DISABLE_PROP_SCHEDULER === "true") {
    console.log("⏸️ Scheduler disabled (DISABLE_PROP_SCHEDULER=true)");
  } else {
    propSchedulerService.start(15);
  }
  
  // Auto-start OpticOdds streaming for PrizePicks/Underdog
  if (process.env.OPTICODDS_API_KEY && process.env.ENABLE_STREAMING !== "false") {
    const streamService = new OpticOddsStreamService();
    
    console.log("📡 Auto-starting OpticOdds streaming for DFS platforms...");
    
    // Start streams for NBA, NFL, NHL
    const sports = ['basketball_nba', 'americanfootball_nfl', 'icehockey_nhl'];
    const sportsbooks = ['PrizePicks', 'Underdog'];
    
    sports.forEach(sport => {
      try {
        const streamId = streamService.startOddsStream({
          sport,
          sportsbooks,
        });
        console.log(`✅ Started ${sport} stream: ${streamId}`);
      } catch (error) {
        console.error(`❌ Failed to start ${sport} stream:`, error);
      }
    });
  } else if (!process.env.OPTICODDS_API_KEY) {
    console.log("⚠️  OpticOdds streaming disabled: No API key configured");
  } else {
    console.log("⏸️  OpticOdds streaming disabled: ENABLE_STREAMING=false");
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
