import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { setupReplitAuth } from "./replitAuth.js";
import { setupGoogleAuth } from "./auth/googleAuth.js";
import router from "./routes.js";
import adminRoutes from "./adminRoutes.js";
import analyticsRoutes from "./analyticsRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import { setupVite, log } from "./vite.js";
import { seedDatabase } from "./seed.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

if (process.env.GOOGLE_CLIENT_ID && process.env.NODE_ENV === "production") {
  log("🔐 Using Google OAuth (Railway production)");
  await setupGoogleAuth(app);
} else {
  log("🔐 Using Replit Auth (default)");
  await setupReplitAuth(app);
}

app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api", router);

try {
  await seedDatabase();
} catch (error) {
  console.error("Error seeding database:", error);
}

const server = app.listen(5000, "0.0.0.0", () => {
  log(`serving on port 5000`);
});

await setupVite(app, server);
