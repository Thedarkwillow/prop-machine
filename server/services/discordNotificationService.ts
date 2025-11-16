import { storage } from "../storage";
import type { Prop, Bet } from "@shared/schema";

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
  footer?: { text: string };
}

export class DiscordNotificationService {
  /**
   * Send a notification to Discord webhook
   */
  private async sendWebhook(webhookUrl: string, embeds: DiscordEmbed[]): Promise<void> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds }),
      });

      if (!response.ok) {
        console.error('[Discord] Webhook failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('[Discord] Failed to send webhook:', error);
    }
  }

  /**
   * Notify user about new high-confidence props
   */
  async notifyNewProps(userId: string, props: Prop[]): Promise<void> {
    const settings = await storage.getDiscordSettings(userId);
    
    if (!settings || !settings.enabled || !settings.notifyNewProps) {
      return;
    }

    // Filter by min confidence
    const qualifyingProps = props.filter(p => p.confidence >= settings.minConfidence);
    
    if (qualifyingProps.length === 0) return;

    const embeds: DiscordEmbed[] = qualifyingProps.slice(0, 10).map(prop => ({
      title: `New ${prop.sport} Prop`,
      color: this.getColorByConfidence(prop.confidence),
      fields: [
        { name: 'Player', value: prop.player, inline: true },
        { name: 'Matchup', value: `${prop.team} vs ${prop.opponent}`, inline: true },
        { name: 'Prop', value: `${prop.stat} ${prop.direction} ${prop.line}`, inline: false },
        { name: 'Confidence', value: `${prop.confidence}%`, inline: true },
        { name: 'EV', value: `${prop.ev}%`, inline: true },
        { name: 'Platform', value: prop.platform, inline: true },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: `Prop Machine • ${prop.sport}` },
    }));

    await this.sendWebhook(settings.webhookUrl, embeds);
  }

  /**
   * Notify about line movements
   */
  async notifyLineMovement(userId: string, prop: Prop, oldLine: number, newLine: number): Promise<void> {
    const settings = await storage.getDiscordSettings(userId);
    
    if (!settings || !settings.enabled || !settings.notifyLineMovements) {
      return;
    }

    const movement = newLine - oldLine;
    const isSteamMove = Math.abs(movement) >= 1.0;

    if (!isSteamMove) return; // Only notify on significant moves

    const embed: DiscordEmbed = {
      title: `${isSteamMove ? 'STEAM MOVE' : 'Line Movement'}`,
      description: `${prop.player} - ${prop.stat}`,
      color: movement > 0 ? 0x00ff00 : 0xff0000, // Green up, red down
      fields: [
        { name: 'Sport', value: prop.sport, inline: true },
        { name: 'Platform', value: prop.platform, inline: true },
        { name: 'Matchup', value: `${prop.team} vs ${prop.opponent}`, inline: false },
        { name: 'Line Movement', value: `${oldLine} → ${newLine} (${movement > 0 ? '+' : ''}${movement})`, inline: false },
        { name: 'Confidence', value: `${prop.confidence}%`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };

    await this.sendWebhook(settings.webhookUrl, [embed]);
  }

  /**
   * Notify about bet settlement
   */
  async notifyBetSettlement(userId: string, bet: Bet, outcome: 'won' | 'lost' | 'pushed', profitLoss: number): Promise<void> {
    const settings = await storage.getDiscordSettings(userId);
    
    if (!settings || !settings.enabled || !settings.notifyBetSettlement) {
      return;
    }

    const color = outcome === 'won' ? 0x00ff00 : outcome === 'lost' ? 0xff0000 : 0xffa500;

    const embed: DiscordEmbed = {
      title: `Bet ${outcome.toUpperCase()}`,
      color,
      fields: [
        { name: 'Amount', value: `$${parseFloat(bet.amount).toFixed(2)}`, inline: true },
        { name: 'Result', value: outcome === 'won' ? `+$${profitLoss.toFixed(2)}` : outcome === 'lost' ? `-$${Math.abs(profitLoss).toFixed(2)}` : 'Push', inline: true },
        { name: 'Odds', value: bet.odds.toString(), inline: true },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'Prop Machine' },
    };

    await this.sendWebhook(settings.webhookUrl, [embed]);
  }

  /**
   * Get embed color based on confidence
   */
  private getColorByConfidence(confidence: number): number {
    if (confidence >= 80) return 0x00ff00; // Green
    if (confidence >= 70) return 0xffa500; // Orange
    return 0xff0000; // Red
  }
}

export const discordNotificationService = new DiscordNotificationService();
