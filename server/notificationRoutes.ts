import { Router } from "express";
import type { IStorage } from "./storage";
import { NotificationService } from "./services/notificationService";
import { updateNotificationPreferencesSchema } from "./validation";

export function createNotificationRoutes(storage: IStorage): Router {
  const router = Router();
  const notificationService = new NotificationService(storage);

  router.get("/preferences", async (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = req.user.claims.sub;
      const preferences = await notificationService.getOrCreatePreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Error getting notification preferences:", error);
      res.status(500).json({ error: "Failed to get preferences" });
    }
  });

  router.patch("/preferences", async (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = req.user.claims.sub;
      const validatedData = updateNotificationPreferencesSchema.parse(req.body);
      const updated = await notificationService.updatePreferences(userId, validatedData);
      res.json(updated);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  router.get("/", async (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await notificationService.getUserNotifications(userId, limit);
      res.json(notifications);
    } catch (error) {
      console.error("Error getting notifications:", error);
      res.status(500).json({ error: "Failed to get notifications" });
    }
  });

  router.patch("/:id/read", async (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const notificationId = parseInt(req.params.id);
      await notificationService.markAsRead(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  return router;
}
