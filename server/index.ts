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

if (process.env.GOOGLE_CLIENT_ID && process.env.NODE_ENV === "production") {
  console.log("🔐 Using Google OAuth (Railway production)");
  setupGoogleAuth(app);
} else {
  console.log("🔐 Using Replit Auth (default)");
  setupAuth(app);
}

// Middleware to set req.user from session for compatibility with notification routes
app.use((req: any, res, next) => {
  if (req.session?.user) {
    req.user = req.session.user;
  }
  next();
});

app.use("/api/admin", adminRoutes());
app.use("/api/analytics", createAnalyticsRoutes(storage));
app.use("/api/notifications", createNotificationRoutes(storage));
app.use("/api", router);

// Production: serve static files BEFORE starting server
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(process.cwd(), "dist", "public");
  
  if (!fs.existsSync(distPath)) {
    console.error(`❌ Build directory not found: ${distPath}`);
    console.error("Make sure to run 'npm run build' before starting in production mode");
    process.exit(1);
  }
  
  console.log(`📦 Serving static files from: ${distPath}`);
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

seedDatabase().catch((error) => {
  console.error("Error seeding database:", error);
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`[express] serving on port ${PORT}`);
  
  // Start automatic prop refresh scheduler (every 15 minutes)
  // Can be disabled with DISABLE_PROP_SCHEDULER=true
  if (process.env.DISABLE_PROP_SCHEDULER === 'true') {
    console.log('⏸️  Prop scheduler disabled (DISABLE_PROP_SCHEDULER=true)');
  } else {
    propSchedulerService.start(15);
  }
});

// Development: setup Vite dev server AFTER server starts
if (process.env.NODE_ENV !== "production") {
  const { setupVite } = await import("./vite.js");
  setupVite(app, server);
}
