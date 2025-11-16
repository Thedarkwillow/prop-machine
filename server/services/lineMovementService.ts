import { storage } from "../storage";
import type { Prop, InsertLineMovement } from "@shared/schema";

export class LineMovementService {
  /**
   * Track line movement for a prop
   */
  async trackLineChange(prop: Prop, newLine: number): Promise<void> {
    const currentLine = parseFloat(prop.currentLine || prop.line);
    
    if (currentLine !== newLine) {
      const movement: InsertLineMovement = {
        propId: prop.id,
        platform: prop.platform,
        oldLine: currentLine.toString(),
        newLine: newLine.toString(),
        movement: (newLine - currentLine).toString(),
      };
      
      await storage.createLineMovement(movement);
      
      const movementValue = parseFloat(movement.movement);
      console.log(`[Line Movement] ${prop.player} ${prop.stat} ${prop.direction}: ${currentLine} → ${newLine} (${movementValue > 0 ? '+' : ''}${movementValue.toFixed(1)})`);
    }
  }

  /**
   * Get all line movements for a prop
   */
  async getPropLineHistory(propId: number) {
    return await storage.getLineMovements(propId);
  }

  /**
   * Get recent line movements across all props
   */
  async getRecentMovements(minutes: number = 60) {
    return await storage.getRecentLineMovements(minutes);
  }

  /**
   * Analyze line movement patterns
   */
  async analyzeMovement(propId: number) {
    const movements = await this.getPropLineHistory(propId);
    
    if (movements.length === 0) {
      return {
        totalMovement: 0,
        movementCount: 0,
        direction: 'stable',
        isSteamMove: false,
      };
    }

    const totalMovement = movements.reduce(
      (sum, m) => sum + parseFloat(m.movement),
      0
    );

    // Steam move detection: 1+ point movement in 15 minutes
    const recentMoves = movements.filter(m => {
      const age = Date.now() - m.timestamp.getTime();
      return age < 15 * 60 * 1000; // 15 minutes
    });

    const recentMovement = recentMoves.reduce(
      (sum, m) => sum + Math.abs(parseFloat(m.movement)),
      0
    );

    return {
      totalMovement,
      movementCount: movements.length,
      direction: totalMovement > 0 ? 'up' : totalMovement < 0 ? 'down' : 'stable',
      isSteamMove: recentMovement >= 1.0,
      recentMovement,
    };
  }
}

export const lineMovementService = new LineMovementService();
