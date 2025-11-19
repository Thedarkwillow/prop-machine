import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { setupAuth } from "./replitAuth.js";
import { setupGoogleAuth } from "./auth/googleAuth.js";
import router from "./routes.js";
import { adminRoutes } from "./adminRoutes.js";
import { createAnalyticsRoutes } from "./analyticsRoutes.js";
import { createNotificationRoutes } from "./notificationRoutes.js";
import { storage } from "./storage.js";
import { setupVite, log } from "./vite.js";
import { seedDatabase } from "./seed.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

if (process.env.GOOGLE_CLIENT_ID && process.env.NODE_ENV === "production") {
  log("🔐 Using Google OAuth (Railway production)");
  setupGoogleAuth(app);
} else {
  log("🔐 Using Replit Auth (default)");
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

seedDatabase().catch((error) => {
  console.error("Error seeding database:", error);
});

const server = app.listen(5000, "0.0.0.0", () => {
  log(`serving on port 5000`);
});

setupVite(app, server);
