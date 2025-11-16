import type { IStorage } from "../storage";
import type { InsertNotification, Prop, NotificationPreferences } from "@shared/schema";

export class NotificationService {
  constructor(private storage: IStorage) {}

  async notifyNewProps(props: Prop[]): Promise<void> {
    if (!props || props.length === 0) return;

    try {
      const userPreferences = await this.getAllActiveUserPreferences();

      for (const prefs of userPreferences) {
        const relevantProps = this.filterPropsForUser(props, prefs);
        
        if (relevantProps.length > 0) {
          await this.createNewPropsNotification(prefs.userId, relevantProps);
        }
      }
    } catch (error) {
      console.error("Error sending new props notifications:", error);
    }
  }

  async notifyHighConfidenceProp(prop: Prop): Promise<void> {
    try {
      const userPreferences = await this.getAllActiveUserPreferences();

      for (const prefs of userPreferences) {
        if (!prefs.highConfidenceOnly) continue;
        
        if (prop.confidence >= prefs.minConfidence) {
          const shouldNotify = this.shouldNotifyForProp(prop, prefs);
          
          if (shouldNotify) {
            await this.createHighConfidenceNotification(prefs.userId, prop);
          }
        }
      }
    } catch (error) {
      console.error("Error sending high confidence notifications:", error);
    }
  }

  async notifyBetSettled(userId: string, betResult: { player: string; stat: string; outcome: string; profit: string }): Promise<void> {
    try {
      const notification: InsertNotification = {
        userId,
        type: "bet_settled",
        title: betResult.outcome === "won" ? "Bet Won! 🎉" : betResult.outcome === "lost" ? "Bet Settled" : "Bet Pushed",
        message: `${betResult.player} ${betResult.stat} has settled. ${betResult.outcome === "won" ? `Profit: $${betResult.profit}` : betResult.outcome === "lost" ? `Loss: $${betResult.profit}` : "Stake returned"}`,
        isRead: false,
      };

      await this.storage.createNotification(notification);
    } catch (error) {
      console.error("Error sending bet settled notification:", error);
    }
  }

  async notifyPerformanceAlert(userId: string, alert: { type: string; message: string }): Promise<void> {
    try {
      const notification: InsertNotification = {
        userId,
        type: "performance_alert",
        title: `Performance Alert: ${alert.type}`,
        message: alert.message,
        isRead: false,
      };

      await this.storage.createNotification(notification);
    } catch (error) {
      console.error("Error sending performance alert:", error);
    }
  }

  private async getAllActiveUserPreferences(): Promise<NotificationPreferences[]> {
    const allPrefs = await this.storage.getAllNotificationPreferences();
    return allPrefs.filter(pref => pref.newPropsEnabled || pref.highConfidenceOnly);
  }

  private filterPropsForUser(props: Prop[], prefs: NotificationPreferences): Prop[] {
    const allowedSports = prefs.sports as string[];
    const allowedPlatforms = prefs.platforms as string[];

    return props.filter(prop => {
      if (!prefs.newPropsEnabled) return false;
      
      if (!allowedSports.includes(prop.sport)) return false;
      
      if (!allowedPlatforms.includes(prop.platform)) return false;
      
      if (prefs.highConfidenceOnly && prop.confidence < prefs.minConfidence) {
        return false;
      }

      return true;
    });
  }

  private shouldNotifyForProp(prop: Prop, prefs: NotificationPreferences): boolean {
    const allowedSports = prefs.sports as string[];
    const allowedPlatforms = prefs.platforms as string[];

    if (!allowedSports.includes(prop.sport)) return false;
    if (!allowedPlatforms.includes(prop.platform)) return false;

    return true;
  }

  private async createNewPropsNotification(userId: string, props: Prop[]): Promise<void> {
    const sportCounts = props.reduce((acc, prop) => {
      acc[prop.sport] = (acc[prop.sport] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sportSummary = Object.entries(sportCounts)
      .map(([sport, count]) => `${count} ${sport}`)
      .join(", ");

    const highestConfidence = Math.max(...props.map(p => p.confidence));

    const notification: InsertNotification = {
      userId,
      type: "new_props",
      title: `${props.length} New Props Available`,
      message: `Fresh props added: ${sportSummary}. Highest confidence: ${highestConfidence}%`,
      propIds: props.map(p => p.id),
      isRead: false,
    };

    await this.storage.createNotification(notification);
  }

  private async createHighConfidenceNotification(userId: string, prop: Prop): Promise<void> {
    const notification: InsertNotification = {
      userId,
      type: "high_confidence_prop",
      title: `High Confidence Prop: ${prop.confidence}%`,
      message: `${prop.player} ${prop.stat} ${prop.direction} ${prop.line} (${prop.sport})`,
      propIds: [prop.id],
      isRead: false,
    };

    await this.storage.createNotification(notification);
  }

  async getUserNotifications(userId: string, limit: number = 50) {
    return await this.storage.getUserNotifications(userId, limit);
  }

  async markAsRead(notificationId: number): Promise<void> {
    await this.storage.markNotificationAsRead(notificationId);
  }

  async getOrCreatePreferences(userId: string): Promise<NotificationPreferences> {
    const existing = await this.storage.getNotificationPreferences(userId);
    
    if (existing) {
      return existing;
    }

    return await this.storage.createNotificationPreferences({
      userId,
      emailEnabled: false,
      newPropsEnabled: true,
      highConfidenceOnly: false,
      minConfidence: 65,
      sports: ["NHL", "NBA", "NFL", "MLB"],
      platforms: ["PrizePicks", "Underdog"],
    });
  }

  async updatePreferences(userId: string, updates: any): Promise<NotificationPreferences> {
    return await this.storage.updateNotificationPreferences(userId, updates);
  }
}
