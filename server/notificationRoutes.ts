import { Router } from "express";
import type { IStorage } from "./storage";
import { NotificationService } from "./services/notificationService";
import { updateNotificationPreferencesSchema } from "./validation";
import { getUserId } from "./middleware/auth";

export function createNotificationRoutes(storage: IStorage): Router {
  const router = Router();
  const notificationService = new NotificationService(storage);

  router.get("/preferences", async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Return default preferences for now (authenticated users only)
      // TODO: Implement database-backed per-user preferences using notificationPreferences table
      res.json({
        emailEnabled: true,
        newPropsEnabled: true,
        highConfidenceOnly: false,
        minConfidence: 70,
        sports: ["NHL", "NBA", "NFL", "MLB"],
        platforms: ["PrizePicks", "Underdog"],
      });
    } catch (error) {
      console.error("Error getting notification preferences:", error);
      res.status(500).json({ error: "Failed to get preferences" });
    }
  });

  router.patch("/preferences", async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Validate request body using Zod schema
      const validatedData = updateNotificationPreferencesSchema.parse(req.body);
      
      // Acknowledge the update (authenticated users only)
      // TODO: Store preferences in database per-user using notificationPreferences table
      res.json({ success: true, preferences: validatedData });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  router.get("/", async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await notificationService.getUserNotifications(userId, limit);
      res.json(notifications);
    } catch (error) {
      console.error("Error getting notifications:", error);
      res.status(500).json({ error: "Failed to get notifications" });
    }
  });

  router.patch("/:id/read", async (req: any, res) => {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const notificationId = parseInt(req.params.id);
      
      // Verify notification belongs to user
      const notification = await storage.getNotification(notificationId);
      if (!notification || notification.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      await notificationService.markAsRead(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  return router;
}
