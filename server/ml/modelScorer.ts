interface PropFeatures {
  playerName: string;
  stat: string;
  line: number;
  direction: 'over' | 'under';
  sport: string;
  
  // Optional features for enhanced scoring
  recentAverage?: number;
  seasonAverage?: number;
  opponentRanking?: number; // 1-30 defensive ranking
  homeAway?: 'home' | 'away';
  lineMovement?: number; // Positive = line moved up, negative = moved down
  marketOdds?: number;
}

interface ModelScore {
  confidence: number; // 0-100
  expectedValue: number; // EV percentage
  modelProbability: number; // 0-1 probability
  kellyFraction: number; // Suggested Kelly bet size
  reasoning: string[];
}

export class ModelScorer {
  /**
   * Score a prop bet using statistical analysis
   */
  async scoreProp(features: PropFeatures): Promise<ModelScore> {
    const reasoning: string[] = [];
    let baseConfidence = 50; // Start at neutral
    
    // Factor 1: Player performance vs line (most important)
    if (features.recentAverage !== undefined) {
      const recentDiff = features.direction === 'over'
        ? features.recentAverage - features.line
        : features.line - features.recentAverage;
      
      const recentImpact = Math.min(Math.max(recentDiff * 5, -15), 15);
      baseConfidence += recentImpact;
      
      if (recentImpact > 0) {
        reasoning.push(`Recent avg (${features.recentAverage.toFixed(1)}) ${features.direction === 'over' ? 'above' : 'below'} line by ${Math.abs(recentDiff).toFixed(1)}`);
      }
    }
    
    // Factor 2: Season average consistency
    if (features.seasonAverage !== undefined && features.recentAverage !== undefined) {
      const consistency = 1 - Math.abs(features.seasonAverage - features.recentAverage) / features.line;
      const consistencyImpact = consistency * 8;
      baseConfidence += consistencyImpact;
      
      if (consistency > 0.9) {
        reasoning.push(`High consistency between recent and season performance`);
      }
    }
    
    // Factor 3: Opponent matchup
    if (features.opponentRanking !== undefined) {
      const matchupImpact = features.direction === 'over'
        ? (30 - features.opponentRanking) / 3 // Easier opponent = higher confidence for over
        : (features.opponentRanking - 15) / 3; // Harder opponent = higher confidence for under
      
      baseConfidence += matchupImpact;
      
      if (Math.abs(matchupImpact) > 3) {
        reasoning.push(`${features.opponentRanking <= 10 ? 'Strong' : features.opponentRanking >= 25 ? 'Weak' : 'Average'} opponent matchup`);
      }
    }
    
    // Factor 4: Line movement (sharp money indicator)
    if (features.lineMovement !== undefined) {
      const movementImpact = features.direction === 'over'
        ? Math.min(features.lineMovement * 2, 10) // Line moved up = good for over
        : Math.min(-features.lineMovement * 2, 10); // Line moved down = good for under
      
      baseConfidence += movementImpact;
      
      if (Math.abs(features.lineMovement) > 0.5) {
        reasoning.push(`Line moved ${features.lineMovement > 0 ? 'up' : 'down'} ${Math.abs(features.lineMovement).toFixed(1)} (${movementImpact > 0 ? 'favorable' : 'unfavorable'})`);
      }
    }
    
    // Factor 5: Home/away split (sport-specific)
    if (features.homeAway) {
      const homeBonus = features.homeAway === 'home' ? 3 : -2;
      baseConfidence += homeBonus;
      
      if (features.homeAway === 'home') {
        reasoning.push(`Home game advantage`);
      }
    }
    
    // Normalize confidence to 50-95 range (never claim 100% certainty)
    const confidence = Math.min(Math.max(baseConfidence, 50), 95);
    
    // Calculate model probability from confidence
    // Confidence of 50 = 0.50 probability, 95 = 0.75 probability
    const modelProbability = 0.45 + (confidence / 200);
    
    // Calculate expected value
    // Assuming standard -110 odds (1.909 decimal)
    const impliedOdds = 1 / 1.909;
    const expectedValue = ((modelProbability - impliedOdds) / impliedOdds) * 100;
    
    // Calculate Kelly fraction (conservative 1/4 Kelly)
    const kellyFraction = Math.max((modelProbability * 1.909 - 1) / (1.909 - 1), 0) * 0.25;
    
    // Add final summary
    if (confidence >= 80) {
      reasoning.push(`Strong ${features.direction} play with high confidence`);
    } else if (confidence >= 70) {
      reasoning.push(`Solid ${features.direction} play with good value`);
    } else if (confidence >= 60) {
      reasoning.push(`Moderate ${features.direction} play, proceed with caution`);
    } else {
      reasoning.push(`Weak play, consider passing`);
    }
    
    return {
      confidence: Math.round(confidence),
      expectedValue: parseFloat(expectedValue.toFixed(2)),
      modelProbability: parseFloat(modelProbability.toFixed(4)),
      kellyFraction: parseFloat(kellyFraction.toFixed(4)),
      reasoning,
    };
  }
  
  /**
   * Calculate suggested bet size using Kelly criterion
   */
  calculateBetSize(
    bankroll: number,
    kellyFraction: number,
    maxBetPercentage: number = 0.05 // Max 5% of bankroll per bet
  ): number {
    const kellySuggestion = bankroll * kellyFraction;
    const maxBet = bankroll * maxBetPercentage;
    return Math.min(kellySuggestion, maxBet);
  }
  
  /**
   * Evaluate parlay confidence (multiplicative probability)
   */
  evaluateParlay(individualScores: ModelScore[]): {
    combinedConfidence: number;
    combinedProbability: number;
    expectedValue: number;
    suggestedBet: number;
  } {
    // Multiply probabilities for parlay
    const combinedProbability = individualScores.reduce(
      (acc, score) => acc * score.modelProbability,
      1
    );
    
    // Average confidence (conservative approach)
    const avgConfidence = individualScores.reduce(
      (acc, score) => acc + score.confidence,
      0
    ) / individualScores.length;
    
    // Parlay confidence is lower than average (risk compounds)
    const combinedConfidence = Math.max(avgConfidence - (individualScores.length - 1) * 5, 50);
    
    // Calculate parlay odds (2-leg = 4x, 3-leg = 10x, 4-leg = 25x, 5-leg = 50x)
    const parlayOdds = Math.pow(2.5, individualScores.length);
    const impliedOdds = 1 / parlayOdds;
    const expectedValue = ((combinedProbability - impliedOdds) / impliedOdds) * 100;
    
    // Conservative Kelly for parlays (1/8 Kelly)
    const kellyFraction = Math.max((combinedProbability * parlayOdds - 1) / (parlayOdds - 1), 0) * 0.125;
    
    return {
      combinedConfidence: Math.round(combinedConfidence),
      combinedProbability: parseFloat(combinedProbability.toFixed(4)),
      expectedValue: parseFloat(expectedValue.toFixed(2)),
      suggestedBet: kellyFraction,
    };
  }
}

export const modelScorer = new ModelScorer();
