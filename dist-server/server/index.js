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
import { propSchedulerService } from "./services/propSchedulerService.js";
dotenv.config();
var app = express();
app.use(cors());
app.use(express.json());
if (process.env.GOOGLE_CLIENT_ID && process.env.NODE_ENV === "production") {
    log("🔐 Using Google OAuth (Railway production)");
    setupGoogleAuth(app);
}
else {
    log("🔐 Using Replit Auth (default)");
    setupAuth(app);
}
// Middleware to set req.user from session for compatibility with notification routes
app.use(function (req, res, next) {
    var _a;
    if ((_a = req.session) === null || _a === void 0 ? void 0 : _a.user) {
        req.user = req.session.user;
    }
    next();
});
app.use("/api/admin", adminRoutes());
app.use("/api/analytics", createAnalyticsRoutes(storage));
app.use("/api/notifications", createNotificationRoutes(storage));
app.use("/api", router);
seedDatabase().catch(function (error) {
    console.error("Error seeding database:", error);
});
var server = app.listen(5000, "0.0.0.0", function () {
    log("serving on port 5000");
    // Start automatic prop refresh scheduler (every 15 minutes)
    propSchedulerService.start(15);
});
setupVite(app, server);
