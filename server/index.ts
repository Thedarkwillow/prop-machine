import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import fs from "fs";

import { setupGoogleAuth } from "./auth/googleAuth.js";

import router from "./routes.js";
import { adminRoutes } from "./adminRoutes.js";
import { createAnalyticsRoutes } from "./analyticsRoutes.js";
import { createNotificationRoutes } from "./notificationRoutes.js";

import { storage } from "./storage.js";
import { seedDatabase } from "./seed.js";
import { propSchedulerService } from "./services/propSchedulerService.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

/* ------------------------- AUTH SETUP ------------------------- */

// ALWAYS use Google Auth now
console.log("🔐 Using Google OAuth");
setupGoogleAuth(app);

/* Make req.user available */
app.use((req: any, _res, next) => {
  if (req.session?.user) req.user = req.session.user;
  next();
});

/* ------------------------- API ROUTES ------------------------- */

app.use("/api/admin", adminRoutes());
app.use("/api/analytics", createAnalyticsRoutes(storage));
app.use("/api/notifications", createNotificationRoutes(storage));
app.use("/api", router);

/* ------------------------- FIXED LOGIN ROUTE ------------------------- */
app.get("/api/login", (_req, res) => {
  res.redirect("/auth/google");
});

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

  // OAuth routes MUST be checked before SPA fallback
  app.get("*", (req, res) => {
    if (req.path.startsWith("/auth/") || req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "Not found" });
    }

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

  if (process.env.DISABLE_PROP_SCHEDULER === "true") {
    console.log("⏸️ Scheduler disabled");
  } else {
    propSchedulerService.start(15);
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
  const { setupVite } = await import("./vite.js");
  setupVite(app, server);
}
