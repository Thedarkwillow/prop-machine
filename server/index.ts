import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import fs from "fs";

import { setupAuth } from "./replitAuth.js";
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

// ------------------- AUTH --------------------
if (process.env.GOOGLE_CLIENT_ID && process.env.NODE_ENV === "production") {
  console.log("🔐 Using Google OAuth (Railway production)");
  setupGoogleAuth(app);
} else {
  console.log("🔐 Using Replit Auth (default)");
  setupAuth(app);
}

// Restore user from session
app.use((req: any, _res, next) => {
  if (req.session?.user) req.user = req.session.user;
  next();
});

// ------------------- API ROUTES --------------------
app.use("/api/admin", adminRoutes());
app.use("/api/analytics", createAnalyticsRoutes(storage));
app.use("/api/notifications", createNotificationRoutes(storage));
app.use("/api", router);

// ------------------- STATIC BUILD (Railway) --------------------
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    console.error(`❌ Build directory not found: ${distPath}`);
    console.error("Make sure to run:  npm run build");
    process.exit(1);
  }

  console.log(`📦 Serving static files from: ${distPath}`);
  app.use(express.static(distPath));

  // SPA fallback
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// ------------------- DATABASE --------------------
seedDatabase().catch((error) => {
  console.error("❌ Error seeding database:", error);
});

// ------------------- SERVER START --------------------

// ❗ RAILWAY CRITICAL FIX — must use their assigned PORT
const PORT = Number(process.env.PORT) || 8080;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Listening on 0.0.0.0:${PORT}`);

  // Scheduler
  if (process.env.DISABLE_PROP_SCHEDULER === "true") {
    console.log("⏸️ Scheduler disabled (DISABLE_PROP_SCHEDULER=true)");
  } else {
    propSchedulerService.start(15);
  }
});

// ------------------- ERROR HANDLERS --------------------
server.on("error", (err: any) => {
  console.error("❌ Server error:", err);
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} already in use`);
  }
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

// ------------------- DEV ONLY (Vite) --------------------
if (process.env.NODE_ENV !== "production") {
  const { setupVite } = await import("./vite.js");
  setupVite(app, server);
}
