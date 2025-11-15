import { storage } from "./storage";

export async function seedDatabase() {
  try {
    // Check if user already exists
    const existingUser = await storage.getUser(1);
    if (existingUser) {
      console.log("Database already seeded");
      return;
    }

    // Create default user
    const user = await storage.createUser({
      bankroll: "127.50",
      initialBankroll: "100.00",
      kellySizing: "0.125", // 1/8 Kelly for micro bankroll
      riskTolerance: "balanced",
    });

    console.log("Created default user:", user.id);

    // Create sample props for NHL
    const props = await Promise.all([
      storage.createProp({
        sport: "NHL",
        player: "Connor McDavid",
        team: "EDM",
        opponent: "TOR",
        stat: "SOG",
        line: "3.5",
        direction: "over",
        platform: "PrizePicks",
        confidence: 87,
        ev: "8.2",
        modelProbability: "0.7234",
        gameTime: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
        isActive: true,
      }),
      storage.createProp({
        sport: "NHL",
        player: "Auston Matthews",
        team: "TOR",
        opponent: "EDM",
        stat: "Points",
        line: "1.5",
        direction: "over",
        platform: "Underdog",
        confidence: 78,
        ev: "6.1",
        modelProbability: "0.6812",
        gameTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
        isActive: true,
      }),
      storage.createProp({
        sport: "NHL",
        player: "Igor Shesterkin",
        team: "NYR",
        opponent: "BOS",
        stat: "Saves",
        line: "30.5",
        direction: "over",
        platform: "PrizePicks",
        confidence: 81,
        ev: "7.4",
        modelProbability: "0.6945",
        gameTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
        isActive: true,
      }),
      storage.createProp({
        sport: "NHL",
        player: "Nathan MacKinnon",
        team: "COL",
        opponent: "VGK",
        stat: "SOG",
        line: "4.5",
        direction: "over",
        platform: "Underdog",
        confidence: 65,
        ev: "3.2",
        modelProbability: "0.6234",
        gameTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
        isActive: true,
      }),
      storage.createProp({
        sport: "NHL",
        player: "Leon Draisaitl",
        team: "EDM",
        opponent: "TOR",
        stat: "Points",
        line: "1.5",
        direction: "over",
        platform: "PrizePicks",
        confidence: 72,
        ev: "4.8",
        modelProbability: "0.6523",
        gameTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
        isActive: true,
      }),
      storage.createProp({
        sport: "NHL",
        player: "Cale Makar",
        team: "COL",
        opponent: "VGK",
        stat: "Points",
        line: "1.5",
        direction: "over",
        platform: "Underdog",
        confidence: 74,
        ev: "5.3",
        modelProbability: "0.6678",
        gameTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
        isActive: true,
      }),
    ]);

    console.log(`Created ${props.length} sample props`);

    // Create sample slips
    const picks1 = [
      { propId: 1, player: "Connor McDavid", stat: "SOG", line: 3.5, direction: "over", confidence: 87 },
      { propId: 2, player: "Auston Matthews", stat: "Points", line: 1.5, direction: "over", confidence: 82 },
      { propId: 3, player: "Igor Shesterkin", stat: "Saves", line: 30.5, direction: "over", confidence: 78 },
    ];
    
    const picks2 = [
      { propId: 4, player: "Nathan MacKinnon", stat: "SOG", line: 4.5, direction: "over", confidence: 76 },
      { propId: 6, player: "Cale Makar", stat: "Points", line: 1.5, direction: "over", confidence: 72 },
      { propId: 1, player: "Connor McDavid", stat: "SOG", line: 3.5, direction: "over", confidence: 74 },
      { propId: 5, player: "Leon Draisaitl", stat: "Points", line: 1.5, direction: "over", confidence: 70 },
    ];
    
    const picks3 = [
      { propId: 5, player: "Leon Draisaitl", stat: "Points", line: 1.5, direction: "over", confidence: 65 },
      { propId: 2, player: "Auston Matthews", stat: "Points", line: 1.5, direction: "over", confidence: 62 },
      { propId: 4, player: "Nathan MacKinnon", stat: "SOG", line: 4.5, direction: "over", confidence: 58 },
      { propId: 6, player: "Cale Makar", stat: "Points", line: 1.5, direction: "over", confidence: 60 },
      { propId: 3, player: "Igor Shesterkin", stat: "Saves", line: 30.5, direction: "over", confidence: 63 },
    ];
    
    const slips = await Promise.all([
      storage.createSlip({
        userId: user.id,
        type: "conservative",
        title: "Safe Grind",
        picks: picks1 as any,
        confidence: 82,
        suggestedBet: "8.50",
        potentialReturn: "34.00",
        platform: "PrizePicks",
        status: "pending",
      }),
      storage.createSlip({
        userId: user.id,
        type: "balanced",
        title: "Value Play",
        picks: picks2 as any,
        confidence: 73,
        suggestedBet: "6.00",
        potentialReturn: "60.00",
        platform: "Underdog",
        status: "pending",
      }),
      storage.createSlip({
        userId: user.id,
        type: "aggressive",
        title: "Moonshot",
        picks: picks3 as any,
        confidence: 61,
        suggestedBet: "2.00",
        potentialReturn: "50.00",
        platform: "PrizePicks",
        status: "pending",
      }),
    ]);

    console.log(`Created ${slips.length} sample slips`);

    // Create some sample bets to show Week 1 progress
    const sampleBets = await Promise.all([
      storage.createBet({
        userId: user.id,
        propId: 1,
        slipId: null,
        amount: "5.00",
        odds: "1.90",
        potentialReturn: "9.50",
        status: "won",
        openingLine: "3.5",
        closingLine: "4.0",
        clv: "2.5",
      }),
      storage.createBet({
        userId: user.id,
        propId: 2,
        slipId: null,
        amount: "4.00",
        odds: "2.00",
        potentialReturn: "8.00",
        status: "won",
        openingLine: "1.5",
        closingLine: "1.5",
        clv: "0.0",
      }),
      storage.createBet({
        userId: user.id,
        propId: 3,
        slipId: null,
        amount: "3.50",
        odds: "1.85",
        potentialReturn: "6.48",
        status: "lost",
        openingLine: "30.5",
        closingLine: "29.5",
        clv: "-1.8",
      }),
      storage.createBet({
        userId: user.id,
        propId: 4,
        slipId: null,
        amount: "6.00",
        odds: "1.95",
        potentialReturn: "11.70",
        status: "won",
        openingLine: "4.5",
        closingLine: "5.0",
        clv: "3.2",
      }),
    ]);

    console.log(`Created ${sampleBets.length} sample bets`);

    // Create performance snapshot
    await storage.createSnapshot({
      userId: user.id,
      date: new Date(),
      bankroll: "127.50",
      totalBets: 12,
      wins: 7,
      losses: 4,
      pushes: 1,
      winRate: "58.33",
      roi: "7.4",
      avgClv: "2.8",
      kellyCompliance: "95.2",
    });

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
