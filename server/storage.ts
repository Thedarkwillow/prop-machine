import type {
  User, InsertUser, UpsertUser,
  Prop, InsertProp,
  Slip, InsertSlip,
  Bet, InsertBet,
  PerformanceSnapshot, InsertPerformanceSnapshot,
  DataFeed, InsertDataFeed,
  GameEvent, InsertGameEvent,
  ProviderLimit, InsertProviderLimit,
  Model, InsertModel,
  WeatherData, InsertWeatherData,
  NotificationPreferences, InsertNotificationPreferences,
  Notification, InsertNotification,
  AnalyticsSnapshot, InsertAnalyticsSnapshot,
  LineMovement, InsertLineMovement,
  DiscordSettings, InsertDiscordSettings
} from "@shared/schema";

/**
 * Helper to convert PostgreSQL DECIMAL columns (returned as strings by Drizzle) to numbers
 * This ensures the frontend can use .toFixed() and numeric operations without errors
 */
function normalizeDecimals<T extends Record<string, any>>(
  record: T | undefined,
  decimalFields: (keyof T)[]
): T | undefined {
  if (!record) return undefined;
  
  const normalized = { ...record };
  for (const field of decimalFields) {
    const value = normalized[field];
    if (value !== null && value !== undefined) {
      normalized[field] = typeof value === 'string' ? parseFloat(value) : value;
    }
  }
  return normalized as T;
}

/**
 * Normalize arrays of records with decimal fields
 */
function normalizeDecimalsArray<T extends Record<string, any>>(
  records: T[],
  decimalFields: (keyof T)[]
): T[] {
  return records.map(record => normalizeDecimals(record, decimalFields)!);
}

// Extended prop type with line movement data
export type PropWithLineMovement = Prop & {
  latestLineMovement?: {
    oldLine: string;
    newLine: string;
    movement: string;
    timestamp: Date;
  } | null;
};

export interface IStorage {
  // User management (required for Replit Auth)
  getUser(userId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: InsertUser): Promise<User>;
  updateBankroll(userId: string, newBankroll: string): Promise<User>;
  
  // Props
  getActiveProps(sport?: string): Promise<Prop[]>;
  getActivePropsWithLineMovement(sport?: string, limit?: number, offset?: number): Promise<PropWithLineMovement[]>;
  getAllActiveProps(): Promise<Prop[]>;
  getActivePropIdsBySportAndPlatform(sport: string, platform: string): Promise<number[]>;
  createProp(prop: InsertProp): Promise<Prop>;
  upsertProp(prop: InsertProp): Promise<Prop>; // Upsert: create or update existing prop
  deactivateProp(propId: number): Promise<void>;
  deactivatePropsBySportAndPlatform(sport: string, platform: string): Promise<number>;
  deactivateSpecificProps(propIds: number[]): Promise<number>;
  
  // Slips
  getSlip(slipId: number): Promise<Slip | undefined>;
  getSlipsByUser(userId: string): Promise<Slip[]>;
  getPendingSlips(userId: string): Promise<Slip[]>;
  createSlip(slip: InsertSlip): Promise<Slip>;
  updateSlipStatus(slipId: number, status: string): Promise<Slip>;
  
  // Bets
  getBet(betId: number): Promise<Bet | undefined>;
  getBetsByUser(userId: string): Promise<Bet[]>;
  getBetsByPropId(propId: number): Promise<Bet[]>;
  getBetsWithProps(userId: string): Promise<(Bet & { prop?: Prop; slip?: Slip })[]>;
  createBet(bet: InsertBet): Promise<Bet>;
  placeBetWithBankrollCheck(bet: InsertBet): Promise<{ success: true; bet: Bet } | { success: false; error: string }>;
  settleBetWithBankrollUpdate(betId: number, outcome: 'won' | 'lost' | 'pushed', closingLine?: string, clv?: string): Promise<{ success: true; bet: Bet; bankrollChange: number } | { success: false; error: string }>;
  updateBetStatus(betId: number, status: string, closingLine?: string, clv?: string): Promise<Bet>;
  getWeek1Bets(userId: string): Promise<Bet[]>;
  
  // Performance
  getLatestSnapshot(userId: string): Promise<PerformanceSnapshot | undefined>;
  createSnapshot(snapshot: InsertPerformanceSnapshot): Promise<PerformanceSnapshot>;
  getSnapshotHistory(userId: string, days: number): Promise<PerformanceSnapshot[]>;
  
  // Data feeds
  createDataFeed(feed: InsertDataFeed): Promise<DataFeed>;
  getDataFeeds(provider: string, endpoint: string): Promise<DataFeed[]>;
  
  // Game events
  createGameEvent(event: InsertGameEvent): Promise<GameEvent>;
  updateGameEvent(gameId: string, event: Partial<InsertGameEvent>): Promise<GameEvent>;
  getGameEvent(gameId: string): Promise<GameEvent | undefined>;
  getPendingGames(sport?: string): Promise<GameEvent[]>;
  
  // Provider limits
  createProviderLimit(limit: InsertProviderLimit): Promise<ProviderLimit>;
  updateProviderLimit(provider: string, updates: Partial<Omit<ProviderLimit, 'id' | 'provider'>>): Promise<ProviderLimit>;
  getProviderLimit(provider: string): Promise<ProviderLimit | undefined>;
  
  // Models
  createModel(model: InsertModel): Promise<Model>;
  getActiveModel(sport: string): Promise<Model | undefined>;
  getAllModels(): Promise<Model[]>;
  
  // Weather data
  createWeatherData(weather: InsertWeatherData): Promise<WeatherData>;
  getWeatherDataByGameId(gameId: string): Promise<WeatherData | undefined>;
  
  // Notifications
  createNotificationPreferences(prefs: InsertNotificationPreferences): Promise<NotificationPreferences>;
  getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined>;
  getAllNotificationPreferences(): Promise<NotificationPreferences[]>;
  updateNotificationPreferences(userId: string, prefs: Partial<InsertNotificationPreferences>): Promise<NotificationPreferences>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotification(notificationId: number): Promise<Notification | undefined>;
  getUserNotifications(userId: string, limit?: number): Promise<Notification[]>;
  markNotificationAsRead(notificationId: number): Promise<void>;
  
  // Analytics
  createAnalyticsSnapshot(snapshot: InsertAnalyticsSnapshot): Promise<AnalyticsSnapshot>;
  getLatestAnalytics(userId: string): Promise<AnalyticsSnapshot | undefined>;
  getAnalyticsHistory(userId: string, days: number): Promise<AnalyticsSnapshot[]>;
  
  // Line movements
  createLineMovement(movement: InsertLineMovement): Promise<LineMovement>;
  getLineMovements(propId: number): Promise<LineMovement[]>;
  getRecentLineMovements(minutes: number): Promise<LineMovement[]>;
  
  // Discord settings
  createDiscordSettings(settings: InsertDiscordSettings): Promise<DiscordSettings>;
  getDiscordSettings(userId: string): Promise<DiscordSettings | undefined>;
  updateDiscordSettings(userId: string, settings: Partial<InsertDiscordSettings>): Promise<DiscordSettings>;
  deleteDiscordSettings(userId: string): Promise<void>;
}

// In-memory storage implementation
class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private props: Map<number, Prop> = new Map();
  private slips: Map<number, Slip> = new Map();
  private bets: Map<number, Bet> = new Map();
  private snapshots: Map<number, PerformanceSnapshot> = new Map();
  private dataFeeds: Map<number, DataFeed> = new Map();
  private gameEvents: Map<number, GameEvent> = new Map();
  private gameEventsByGameId: Map<string, GameEvent> = new Map();
  private providerLimits: Map<string, ProviderLimit> = new Map();
  private models: Map<number, Model> = new Map();
  private weatherData: Map<number, WeatherData> = new Map();
  private weatherDataByGameId: Map<string, WeatherData> = new Map();
  private notificationPreferences: Map<string, NotificationPreferences> = new Map();
  private notifications: Map<number, Notification> = new Map();
  private analyticsSnapshots: Map<number, AnalyticsSnapshot> = new Map();
  
  private propIdCounter = 1;
  private slipIdCounter = 1;
  private betIdCounter = 1;
  private snapshotIdCounter = 1;
  private dataFeedIdCounter = 1;
  private gameEventIdCounter = 1;
  private providerLimitIdCounter = 1;
  private modelIdCounter = 1;
  private weatherDataIdCounter = 1;
  private notificationPreferencesIdCounter = 1;
  private notificationIdCounter = 1;
  private analyticsSnapshotIdCounter = 1;

  // Mutex for atomic bet placement per user
  private userLocks: Map<string, Promise<void>> = new Map();

  async getUser(userId: string): Promise<User | undefined> {
    return this.users.get(userId);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = userData.id ? this.users.get(userData.id) : undefined;
    const newUser: User = {
      id: userData.id || crypto.randomUUID(),
      email: userData.email ?? existingUser?.email ?? null,
      firstName: userData.firstName ?? existingUser?.firstName ?? null,
      lastName: userData.lastName ?? existingUser?.lastName ?? null,
      profileImageUrl: userData.profileImageUrl ?? existingUser?.profileImageUrl ?? null,
      bankroll: userData.bankroll ?? existingUser?.bankroll ?? "100.00",
      initialBankroll: userData.initialBankroll ?? existingUser?.initialBankroll ?? "100.00",
      kellySizing: userData.kellySizing ?? existingUser?.kellySizing ?? "0.125",
      riskTolerance: userData.riskTolerance ?? existingUser?.riskTolerance ?? "balanced",
      isAdmin: userData.isAdmin ?? existingUser?.isAdmin ?? false,
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: crypto.randomUUID(),
      email: user.email ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      profileImageUrl: user.profileImageUrl ?? null,
      bankroll: user.bankroll ?? "100.00",
      initialBankroll: user.initialBankroll ?? "100.00",
      kellySizing: user.kellySizing ?? "0.125",
      riskTolerance: user.riskTolerance ?? "balanced",
      isAdmin: user.isAdmin ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async updateBankroll(userId: string, newBankroll: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    user.bankroll = newBankroll;
    return user;
  }

  async getActiveProps(sport?: string): Promise<Prop[]> {
    const allProps = Array.from(this.props.values()).filter(p => p.isActive);
    if (sport) {
      return allProps.filter(p => p.sport === sport);
    }
    return allProps;
  }

  async getActivePropsWithLineMovement(sport?: string, limit?: number, offset?: number): Promise<PropWithLineMovement[]> {
    // MemStorage doesn't track line movements, so just return props without movement data
    let props = await this.getActiveProps(sport);
    
    // Apply pagination
    if (offset) props = props.slice(offset);
    if (limit) props = props.slice(0, limit);
    
    return props.map(prop => ({ ...prop, latestLineMovement: null }));
  }

  async getAllActiveProps(): Promise<Prop[]> {
    return Array.from(this.props.values()).filter(p => p.isActive);
  }

  async upsertProp(prop: InsertProp): Promise<Prop> {
    // Find existing prop by unique combination (including fixture_id for fixture-specific matching)
    const existing = Array.from(this.props.values()).find(p =>
      p.sport === prop.sport &&
      p.player === prop.player &&
      p.stat === prop.stat &&
      p.line === prop.line &&
      p.direction === prop.direction &&
      p.platform === prop.platform &&
      p.fixtureId === prop.fixtureId && // Match by fixture_id to prevent cross-fixture conflicts
      p.isActive
    );

    if (existing) {
      // Update existing prop with new odds/data
      existing.odds = prop.odds;
      existing.currentLine = prop.currentLine ?? null;
      existing.gameTime = prop.gameTime;
      existing.marketId = prop.marketId ?? null;
      return existing;
    }

    // Create new prop if none exists
    return this.createProp(prop);
  }

  async createProp(prop: InsertProp): Promise<Prop> {
    const newProp: Prop = {
      id: this.propIdCounter++,
      sport: prop.sport,
      player: prop.player,
      team: prop.team,
      opponent: prop.opponent,
      stat: prop.stat,
      line: prop.line,
      currentLine: prop.currentLine ?? null,
      direction: prop.direction,
      period: prop.period ?? "full_game",
      platform: prop.platform,
      fixtureId: prop.fixtureId ?? null,
      marketId: prop.marketId ?? null,
      confidence: prop.confidence,
      ev: prop.ev,
      modelProbability: prop.modelProbability,
      gameTime: prop.gameTime,
      isActive: prop.isActive ?? true,
      createdAt: new Date(),
    };
    this.props.set(newProp.id, newProp);
    return newProp;
  }

  async deactivateProp(propId: number): Promise<void> {
    const prop = this.props.get(propId);
    if (prop) {
      prop.isActive = false;
    }
  }

  async getActivePropIdsBySportAndPlatform(sport: string, platform: string): Promise<number[]> {
    const ids: number[] = [];
    for (const prop of this.props.values()) {
      if (prop.sport === sport && prop.platform === platform && prop.isActive) {
        ids.push(prop.id);
      }
    }
    return ids;
  }

  async deactivatePropsBySportAndPlatform(sport: string, platform: string): Promise<number> {
    let count = 0;
    for (const prop of this.props.values()) {
      if (prop.sport === sport && prop.platform === platform && prop.isActive) {
        prop.isActive = false;
        count++;
      }
    }
    return count;
  }

  async deactivateSpecificProps(propIds: number[]): Promise<number> {
    let count = 0;
    for (const id of propIds) {
      const prop = this.props.get(id);
      if (prop && prop.isActive) {
        prop.isActive = false;
        count++;
      }
    }
    return count;
  }

  async getSlip(slipId: number): Promise<Slip | undefined> {
    return this.slips.get(slipId);
  }

  async getSlipsByUser(userId: string): Promise<Slip[]> {
    return Array.from(this.slips.values()).filter(s => s.userId === userId);
  }

  async getPendingSlips(userId: string): Promise<Slip[]> {
    return Array.from(this.slips.values()).filter(
      s => s.userId === userId && s.status === "pending"
    );
  }

  async createSlip(slip: InsertSlip): Promise<Slip> {
    const newSlip: Slip = {
      id: this.slipIdCounter++,
      userId: slip.userId,
      type: slip.type,
      title: slip.title,
      picks: slip.picks,
      confidence: slip.confidence,
      suggestedBet: slip.suggestedBet,
      potentialReturn: slip.potentialReturn,
      platform: slip.platform,
      status: slip.status ?? "pending",
      createdAt: new Date(),
    };
    this.slips.set(newSlip.id, newSlip);
    return newSlip;
  }

  async updateSlipStatus(slipId: number, status: string): Promise<Slip> {
    const slip = this.slips.get(slipId);
    if (!slip) throw new Error("Slip not found");
    slip.status = status as any;
    return slip;
  }

  async getBet(betId: number): Promise<Bet | undefined> {
    return this.bets.get(betId);
  }

  async getBetsByUser(userId: string): Promise<Bet[]> {
    return Array.from(this.bets.values()).filter(b => b.userId === userId);
  }

  async getBetsByPropId(propId: number): Promise<Bet[]> {
    return Array.from(this.bets.values()).filter(b => b.propId === propId);
  }

  async getBetsWithProps(userId: string): Promise<(Bet & { prop?: Prop })[]> {
    const userBets = Array.from(this.bets.values()).filter(b => b.userId === userId);
    
    return userBets.map(bet => {
      const prop = bet.propId ? this.props.get(bet.propId) : undefined;
      return {
        ...bet,
        prop,
      };
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Most recent first
  }

  async createBet(bet: InsertBet): Promise<Bet> {
    const newBet: Bet = {
      id: this.betIdCounter++,
      userId: bet.userId,
      slipId: bet.slipId ?? null,
      propId: bet.propId ?? null,
      amount: bet.amount,
      odds: bet.odds,
      potentialReturn: bet.potentialReturn,
      status: bet.status ?? "pending",
      direction: bet.direction ?? null,
      openingLine: bet.openingLine ?? null,
      closingLine: bet.closingLine ?? null,
      clv: bet.clv ?? null,
      settledAt: bet.settledAt ?? null,
      createdAt: new Date(),
    };
    this.bets.set(newBet.id, newBet);
    return newBet;
  }

  async placeBetWithBankrollCheck(bet: InsertBet): Promise<{ success: true; bet: Bet } | { success: false; error: string }> {
    const userId = bet.userId;
    
    // Chain this operation onto any existing operation for this user
    const operation = async (): Promise<{ success: true; bet: Bet } | { success: false; error: string }> => {
      const user = this.users.get(userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      const currentBankroll = parseFloat(user.bankroll);
      const betAmount = parseFloat(bet.amount);

      if (betAmount <= 0) {
        return { success: false, error: "Bet amount must be greater than zero" };
      }

      if (betAmount > currentBankroll) {
        return { 
          success: false, 
          error: `Insufficient bankroll: bet amount $${betAmount.toFixed(2)} exceeds available $${currentBankroll.toFixed(2)}` 
        };
      }

      // Create bet and update bankroll atomically
      const newBet: Bet = {
        id: this.betIdCounter++,
        userId: bet.userId,
        slipId: bet.slipId ?? null,
        propId: bet.propId ?? null,
        amount: bet.amount,
        odds: bet.odds,
        potentialReturn: bet.potentialReturn,
        status: bet.status ?? "pending",
        direction: bet.direction ?? null,
        openingLine: bet.openingLine ?? null,
        closingLine: bet.closingLine ?? null,
        clv: bet.clv ?? null,
        settledAt: bet.settledAt ?? null,
        createdAt: new Date(),
      };
      this.bets.set(newBet.id, newBet);
      
      // Update bankroll using the existing method
      await this.updateBankroll(userId, (currentBankroll - betAmount).toFixed(2));
      
      return { success: true, bet: newBet };
    };

    // Get existing lock or create resolved promise
    const previousLock = this.userLocks.get(userId) || Promise.resolve();
    
    // Chain the new operation and store it
    const newLock = previousLock.then(operation).catch((error) => {
      // Convert any thrown errors to result format
      return { success: false, error: error.message || "Unknown error occurred" };
    });
    
    this.userLocks.set(userId, newLock as any);
    
    // Wait for our operation to complete
    const result = await newLock;
    
    // Clean up lock if this was the last operation
    if (this.userLocks.get(userId) === newLock) {
      this.userLocks.delete(userId);
    }
    
    return result;
  }

  async settleBetWithBankrollUpdate(
    betId: number, 
    outcome: 'won' | 'lost' | 'pushed',
    closingLine?: string,
    clv?: string
  ): Promise<{ success: true; bet: Bet; bankrollChange: number } | { success: false; error: string }> {
    const bet = this.bets.get(betId);
    if (!bet) {
      return { success: false, error: "Bet not found" };
    }

    const userId = bet.userId;
    
    // Chain this operation onto any existing operation for this user
    const operation = async (): Promise<{ success: true; bet: Bet; bankrollChange: number } | { success: false; error: string }> => {
      const user = this.users.get(userId);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      // Check if bet is already settled
      if (bet.status.toLowerCase() !== 'pending') {
        return { success: false, error: `Bet already settled with status: ${bet.status}` };
      }

      const currentBankroll = parseFloat(user.bankroll);
      const betAmount = parseFloat(bet.amount);
      const potentialReturn = parseFloat(bet.potentialReturn || '0');
      
      let bankrollChange = 0;
      let newBankroll = currentBankroll;

      // Calculate bankroll change based on outcome
      if (outcome === 'won') {
        // Add the full potential return (includes original stake)
        bankrollChange = potentialReturn;
        newBankroll = currentBankroll + potentialReturn;
      } else if (outcome === 'pushed') {
        // Refund the original bet amount
        bankrollChange = betAmount;
        newBankroll = currentBankroll + betAmount;
      }
      // For 'lost', bankroll stays the same (already deducted when placed)

      // Update bet status atomically with bankroll
      bet.status = outcome;
      if (closingLine) bet.closingLine = closingLine;
      if (clv) bet.clv = clv;
      bet.settledAt = new Date();
      
      // Update bankroll
      await this.updateBankroll(userId, newBankroll.toFixed(2));
      
      return { success: true, bet, bankrollChange };
    };

    // Get existing lock or create resolved promise
    const previousLock = this.userLocks.get(userId) || Promise.resolve();
    
    // Chain the new operation and store it
    const newLock = previousLock.then(operation).catch((error) => {
      return { success: false, error: error.message || "Unknown error occurred" };
    });
    
    this.userLocks.set(userId, newLock as any);
    
    // Wait for our operation to complete
    const result = await newLock;
    
    // Clean up lock if this was the last operation
    if (this.userLocks.get(userId) === newLock) {
      this.userLocks.delete(userId);
    }
    
    return result;
  }

  async updateBetStatus(
    betId: number,
    status: string,
    closingLine?: string,
    clv?: string
  ): Promise<Bet> {
    const bet = this.bets.get(betId);
    if (!bet) throw new Error("Bet not found");
    bet.status = status as any;
    if (closingLine) bet.closingLine = closingLine;
    if (clv) bet.clv = clv;
    bet.settledAt = new Date();
    return bet;
  }

  async getWeek1Bets(userId: string): Promise<Bet[]> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return Array.from(this.bets.values()).filter(
      b => b.userId === userId && b.createdAt >= oneWeekAgo
    );
  }

  async getLatestSnapshot(userId: string): Promise<PerformanceSnapshot | undefined> {
    const userSnapshots = Array.from(this.snapshots.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    return userSnapshots[0];
  }

  async createSnapshot(snapshot: InsertPerformanceSnapshot): Promise<PerformanceSnapshot> {
    const newSnapshot: PerformanceSnapshot = {
      id: this.snapshotIdCounter++,
      userId: snapshot.userId,
      date: snapshot.date,
      bankroll: snapshot.bankroll,
      totalBets: snapshot.totalBets,
      wins: snapshot.wins,
      losses: snapshot.losses,
      pushes: snapshot.pushes,
      winRate: snapshot.winRate,
      roi: snapshot.roi,
      avgClv: snapshot.avgClv ?? null,
      kellyCompliance: snapshot.kellyCompliance ?? null,
      createdAt: new Date(),
    };
    this.snapshots.set(newSnapshot.id, newSnapshot);
    return newSnapshot;
  }

  async getSnapshotHistory(userId: string, days: number): Promise<PerformanceSnapshot[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return Array.from(this.snapshots.values())
      .filter(s => s.userId === userId && s.date >= cutoffDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async createDataFeed(feed: InsertDataFeed): Promise<DataFeed> {
    const newFeed: DataFeed = {
      id: this.dataFeedIdCounter++,
      provider: feed.provider,
      endpoint: feed.endpoint,
      response: feed.response,
      etag: feed.etag ?? null,
      lastModified: feed.lastModified ?? null,
      createdAt: new Date(),
    };
    this.dataFeeds.set(newFeed.id, newFeed);
    return newFeed;
  }

  async getDataFeeds(provider: string, endpoint: string): Promise<DataFeed[]> {
    return Array.from(this.dataFeeds.values()).filter(
      f => f.provider === provider && f.endpoint === endpoint
    );
  }

  async createGameEvent(event: InsertGameEvent): Promise<GameEvent> {
    const newEvent: GameEvent = {
      id: this.gameEventIdCounter++,
      sport: event.sport,
      gameId: event.gameId,
      gameTime: event.gameTime,
      homeTeam: event.homeTeam,
      awayTeam: event.awayTeam,
      status: event.status ?? "scheduled",
      homeScore: event.homeScore ?? null,
      awayScore: event.awayScore ?? null,
      playerStats: event.playerStats ?? null,
      finalizedAt: event.finalizedAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.gameEvents.set(newEvent.id, newEvent);
    this.gameEventsByGameId.set(newEvent.gameId, newEvent);
    return newEvent;
  }

  async updateGameEvent(gameId: string, event: Partial<InsertGameEvent>): Promise<GameEvent> {
    const existingEvent = this.gameEventsByGameId.get(gameId);
    if (!existingEvent) throw new Error("Game event not found");
    
    const updatedEvent: GameEvent = {
      ...existingEvent,
      ...event,
      updatedAt: new Date(),
    };
    this.gameEvents.set(updatedEvent.id, updatedEvent);
    this.gameEventsByGameId.set(updatedEvent.gameId, updatedEvent);
    return updatedEvent;
  }

  async getGameEvent(gameId: string): Promise<GameEvent | undefined> {
    return this.gameEventsByGameId.get(gameId);
  }

  async getPendingGames(sport?: string): Promise<GameEvent[]> {
    const allEvents = Array.from(this.gameEvents.values()).filter(
      e => e.status === "scheduled" || e.status === "in_progress"
    );
    if (sport) {
      return allEvents.filter(e => e.sport === sport);
    }
    return allEvents;
  }

  async createProviderLimit(limit: InsertProviderLimit): Promise<ProviderLimit> {
    const newLimit: ProviderLimit = {
      id: this.providerLimitIdCounter++,
      provider: limit.provider,
      callsToday: limit.callsToday ?? 0,
      lastCallAt: limit.lastCallAt ?? null,
      dailyLimit: limit.dailyLimit ?? null,
      rateLimitPerMinute: limit.rateLimitPerMinute ?? null,
      resetAt: limit.resetAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.providerLimits.set(newLimit.provider, newLimit);
    return newLimit;
  }

  async updateProviderLimit(provider: string, updates: Partial<Omit<ProviderLimit, 'id' | 'provider'>>): Promise<ProviderLimit> {
    const existingLimit = this.providerLimits.get(provider);
    if (!existingLimit) throw new Error("Provider limit not found");
    
    const updatedLimit: ProviderLimit = {
      ...existingLimit,
      ...updates,
      updatedAt: new Date(),
    };
    this.providerLimits.set(provider, updatedLimit);
    return updatedLimit;
  }

  async getProviderLimit(provider: string): Promise<ProviderLimit | undefined> {
    return this.providerLimits.get(provider);
  }

  async createModel(model: InsertModel): Promise<Model> {
    const newModel: Model = {
      id: this.modelIdCounter++,
      sport: model.sport,
      version: model.version,
      modelType: model.modelType,
      trainedAt: model.trainedAt,
      isActive: model.isActive ?? true,
      artifact: model.artifact ?? null,
      performance: model.performance ?? null,
      createdAt: new Date(),
    };
    this.models.set(newModel.id, newModel);
    return newModel;
  }

  async getActiveModel(sport: string): Promise<Model | undefined> {
    return Array.from(this.models.values()).find(
      m => m.sport === sport && m.isActive
    );
  }

  async getAllModels(): Promise<Model[]> {
    return Array.from(this.models.values());
  }

  // Weather data
  async createWeatherData(weather: InsertWeatherData): Promise<WeatherData> {
    const newWeatherData: WeatherData = {
      id: this.weatherDataIdCounter++,
      gameId: weather.gameId,
      stadium: weather.stadium,
      latitude: weather.latitude,
      longitude: weather.longitude,
      forecastTime: weather.forecastTime,
      temperature: weather.temperature ?? null,
      windSpeed: weather.windSpeed ?? null,
      windGusts: weather.windGusts ?? null,
      precipitation: weather.precipitation ?? null,
      humidity: weather.humidity ?? null,
      visibility: weather.visibility ?? null,
      conditions: weather.conditions ?? null,
      isDome: weather.isDome ?? false,
      createdAt: new Date(),
    };
    this.weatherData.set(newWeatherData.id, newWeatherData);
    this.weatherDataByGameId.set(newWeatherData.gameId, newWeatherData);
    return newWeatherData;
  }

  async getWeatherDataByGameId(gameId: string): Promise<WeatherData | undefined> {
    return this.weatherDataByGameId.get(gameId);
  }

  // Notifications
  async createNotificationPreferences(prefs: InsertNotificationPreferences): Promise<NotificationPreferences> {
    const newPrefs: NotificationPreferences = {
      id: this.notificationPreferencesIdCounter++,
      userId: prefs.userId,
      emailEnabled: prefs.emailEnabled ?? true,
      newPropsEnabled: prefs.newPropsEnabled ?? true,
      highConfidenceOnly: prefs.highConfidenceOnly ?? false,
      minConfidence: prefs.minConfidence ?? 70,
      sports: prefs.sports ?? [],
      platforms: prefs.platforms ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.notificationPreferences.set(newPrefs.userId, newPrefs);
    return newPrefs;
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined> {
    return this.notificationPreferences.get(userId);
  }

  async getAllNotificationPreferences(): Promise<NotificationPreferences[]> {
    return Array.from(this.notificationPreferences.values());
  }

  async updateNotificationPreferences(userId: string, prefs: Partial<InsertNotificationPreferences>): Promise<NotificationPreferences> {
    const existingPrefs = this.notificationPreferences.get(userId);
    if (!existingPrefs) throw new Error("Notification preferences not found");
    
    const updatedPrefs: NotificationPreferences = {
      ...existingPrefs,
      ...prefs,
      updatedAt: new Date(),
    };
    this.notificationPreferences.set(userId, updatedPrefs);
    return updatedPrefs;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const newNotification: Notification = {
      id: this.notificationIdCounter++,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      propIds: notification.propIds ?? [],
      isRead: notification.isRead ?? false,
      createdAt: new Date(),
    };
    this.notifications.set(newNotification.id, newNotification);
    return newNotification;
  }

  async getNotification(notificationId: number): Promise<Notification | undefined> {
    return this.notifications.get(notificationId);
  }

  async getUserNotifications(userId: string, limit?: number): Promise<Notification[]> {
    const userNotifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (limit) {
      return userNotifications.slice(0, limit);
    }
    return userNotifications;
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.isRead = true;
    }
  }

  // Analytics
  async createAnalyticsSnapshot(snapshot: InsertAnalyticsSnapshot): Promise<AnalyticsSnapshot> {
    const newSnapshot: AnalyticsSnapshot = {
      id: this.analyticsSnapshotIdCounter++,
      userId: snapshot.userId,
      date: snapshot.date,
      platformStats: snapshot.platformStats ?? null,
      sportStats: snapshot.sportStats ?? null,
      confidenceBrackets: snapshot.confidenceBrackets ?? null,
      hotStreak: snapshot.hotStreak ?? 0,
      coldStreak: snapshot.coldStreak ?? 0,
      bestSport: snapshot.bestSport ?? null,
      bestPlatform: snapshot.bestPlatform ?? null,
      bestTimeOfWeek: snapshot.bestTimeOfWeek ?? null,
      avgBetSize: snapshot.avgBetSize ?? null,
      createdAt: new Date(),
    };
    this.analyticsSnapshots.set(newSnapshot.id, newSnapshot);
    return newSnapshot;
  }

  async getLatestAnalytics(userId: string): Promise<AnalyticsSnapshot | undefined> {
    const userSnapshots = Array.from(this.analyticsSnapshots.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    return userSnapshots[0];
  }

  async getAnalyticsHistory(userId: string, days: number): Promise<AnalyticsSnapshot[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return Array.from(this.analyticsSnapshots.values())
      .filter(s => s.userId === userId && s.date >= cutoffDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // Line movements (in-memory not used, stubs for interface)
  async createLineMovement(movement: InsertLineMovement): Promise<LineMovement> {
    throw new Error("Line movements not implemented in MemStorage");
  }

  async getLineMovements(propId: number): Promise<LineMovement[]> {
    return [];
  }

  async getRecentLineMovements(minutes: number): Promise<LineMovement[]> {
    return [];
  }

  // Discord settings (in-memory not used, stubs for interface)
  async createDiscordSettings(settings: InsertDiscordSettings): Promise<DiscordSettings> {
    throw new Error("Discord settings not implemented in MemStorage");
  }

  async getDiscordSettings(userId: string): Promise<DiscordSettings | undefined> {
    return undefined;
  }

  async updateDiscordSettings(userId: string, settings: Partial<InsertDiscordSettings>): Promise<DiscordSettings> {
    throw new Error("Discord settings not implemented in MemStorage");
  }

  async deleteDiscordSettings(userId: string): Promise<void> {
    return;
  }
}

// Database storage implementation using Drizzle ORM
import { db } from "./db";
import { users, props, slips, bets, performanceSnapshots, dataFeeds, gameEvents, providerLimits, models, weatherData, notificationPreferences, notifications, analyticsSnapshots, lineMovements, discordSettings } from "@shared/schema";
import { eq, and, desc, gte, sql, inArray, or } from "drizzle-orm";

class DbStorage implements IStorage {
  // User management
  async getUser(userId: string): Promise<User | undefined> {
    const userDecimalFields: (keyof User)[] = ['bankroll', 'initialBankroll', 'kellySizing'];
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return normalizeDecimals(result[0], userDecimalFields);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const userDecimalFields: (keyof User)[] = ['bankroll', 'initialBankroll', 'kellySizing'];
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return normalizeDecimals(result[0], userDecimalFields);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Try to find existing user by ID or email
    const existing = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.id, userData.id),
          userData.email ? eq(users.email, userData.email) : sql`false`
        )
      )
      .limit(1);
    
    if (existing.length > 0) {
      // User exists - update
      const [user] = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing[0].id))
        .returning();
      return user;
    }
    
    // User doesn't exist - insert new
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateBankroll(userId: string, newBankroll: string): Promise<User> {
    const result = await db
      .update(users)
      .set({ bankroll: newBankroll })
      .where(eq(users.id, userId))
      .returning();
    
    if (!result[0]) throw new Error("User not found");
    return result[0];
  }

  // Props
  async getActiveProps(sport?: string): Promise<Prop[]> {
    const propDecimalFields: (keyof Prop)[] = ['line', 'currentLine', 'ev', 'modelProbability'];
    
    let results: Prop[];
    if (sport) {
      results = await db
        .select()
        .from(props)
        .where(and(eq(props.isActive, true), eq(props.sport, sport)));
    } else {
      results = await db.select().from(props).where(eq(props.isActive, true));
    }
    
    return normalizeDecimalsArray(results, propDecimalFields);
  }

  async getActivePropsWithLineMovement(sport?: string, limit = 100, offset = 0): Promise<PropWithLineMovement[]> {
    const propDecimalFields: (keyof Prop)[] = ['line', 'currentLine', 'ev', 'modelProbability'];
    
    // PERFORMANCE OPTIMIZATION: Single query with LEFT JOIN instead of N+1 queries
    // This fetches props with their latest line movement in one database round-trip
    // Using window functions (ROW_NUMBER) to get only the most recent movement per prop
    
    const query = db
      .select({
        // All prop fields
        id: props.id,
        sport: props.sport,
        player: props.player,
        team: props.team,
        opponent: props.opponent,
        stat: props.stat,
        line: props.line,
        currentLine: props.currentLine,
        direction: props.direction,
        period: props.period,
        platform: props.platform,
        confidence: props.confidence,
        ev: props.ev,
        modelProbability: props.modelProbability,
        gameTime: props.gameTime,
        isActive: props.isActive,
        createdAt: props.createdAt,
        // Latest line movement fields (nullable)
        latestOldLine: lineMovements.oldLine,
        latestNewLine: lineMovements.newLine,
        latestMovement: lineMovements.movement,
        latestTimestamp: lineMovements.timestamp,
      })
      .from(props)
      .leftJoin(
        lineMovements,
        and(
          eq(props.id, lineMovements.propId),
          // Subquery to ensure we only get the most recent line movement
          eq(
            lineMovements.timestamp,
            db.select({ maxTimestamp: sql`MAX(${lineMovements.timestamp})` })
              .from(lineMovements)
              .where(eq(lineMovements.propId, props.id))
          )
        )
      )
      .where(
        sport
          ? and(eq(props.isActive, true), eq(props.sport, sport))
          : eq(props.isActive, true)
      )
      .orderBy(desc(props.createdAt))
      .limit(limit)
      .offset(offset);

    const results = await query;
    
    // Transform results into PropWithLineMovement format
    const propsWithMovement: PropWithLineMovement[] = results.map((row) => {
      const prop: Prop = {
        id: row.id,
        sport: row.sport,
        player: row.player,
        team: row.team,
        opponent: row.opponent,
        stat: row.stat,
        line: row.line,
        currentLine: row.currentLine,
        direction: row.direction,
        period: row.period,
        platform: row.platform,
        confidence: row.confidence,
        ev: row.ev,
        modelProbability: row.modelProbability,
        gameTime: row.gameTime,
        isActive: row.isActive,
        createdAt: row.createdAt,
      };
      
      // Normalize decimal fields
      const normalizedProp = normalizeDecimals(prop, propDecimalFields)!;
      
      // Add line movement if it exists
      const latestLineMovement = row.latestTimestamp
        ? {
            oldLine: row.latestOldLine!,
            newLine: row.latestNewLine!,
            movement: row.latestMovement!,
            timestamp: row.latestTimestamp,
          }
        : null;
      
      return {
        ...normalizedProp,
        latestLineMovement,
      };
    });
    
    return propsWithMovement;
  }

  async getAllActiveProps(): Promise<Prop[]> {
    const propDecimalFields: (keyof Prop)[] = ['line', 'currentLine', 'ev', 'modelProbability'];
    const results = await db.select().from(props).where(eq(props.isActive, true));
    return normalizeDecimalsArray(results, propDecimalFields);
  }

  async upsertProp(prop: InsertProp): Promise<Prop> {
    // Try to find existing active prop with same attributes (including fixture_id for fixture-specific matching)
    const conditions = [
      eq(props.sport, prop.sport),
      eq(props.player, prop.player),
      eq(props.stat, prop.stat),
      eq(props.line, prop.line),
      eq(props.direction, prop.direction),
      eq(props.platform, prop.platform),
      eq(props.isActive, true)
    ];

    // Include fixture_id in matching if provided (critical for preventing cross-fixture conflicts)
    if (prop.fixtureId) {
      conditions.push(eq(props.fixtureId, prop.fixtureId));
    }

    const existing = await db
      .select()
      .from(props)
      .where(and(...conditions))
      .limit(1);

    if (existing.length > 0) {
      // Update existing prop with new odds/data
      const updated = await db
        .update(props)
        .set({
          odds: prop.odds,
          currentLine: prop.currentLine ?? null,
          gameTime: prop.gameTime,
          marketId: prop.marketId ?? null,
        })
        .where(eq(props.id, existing[0].id))
        .returning();
      
      return updated[0];
    }

    // Create new prop if none exists
    const result = await db.insert(props).values(prop).returning();
    return result[0];
  }

  async createProp(prop: InsertProp): Promise<Prop> {
    const result = await db.insert(props).values(prop).returning();
    return result[0];
  }

  async deactivateProp(propId: number): Promise<void> {
    await db.update(props).set({ isActive: false }).where(eq(props.id, propId));
  }

  async getActivePropIdsBySportAndPlatform(sport: string, platform: string): Promise<number[]> {
    const result = await db
      .select({ id: props.id })
      .from(props)
      .where(and(
        eq(props.sport, sport),
        eq(props.platform, platform),
        eq(props.isActive, true)
      ));
    
    return result.map(r => r.id);
  }

  async deactivatePropsBySportAndPlatform(sport: string, platform: string): Promise<number> {
    const result = await db
      .update(props)
      .set({ isActive: false })
      .where(and(
        eq(props.sport, sport),
        eq(props.platform, platform),
        eq(props.isActive, true)
      ))
      .returning({ id: props.id });
    
    return result.length;
  }

  async deactivateSpecificProps(propIds: number[]): Promise<number> {
    if (propIds.length === 0) return 0;
    
    const result = await db
      .update(props)
      .set({ isActive: false })
      .where(and(
        inArray(props.id, propIds),
        eq(props.isActive, true)
      ))
      .returning({ id: props.id });
    
    return result.length;
  }

  // Slips
  async getSlip(slipId: number): Promise<Slip | undefined> {
    const result = await db.select().from(slips).where(eq(slips.id, slipId));
    return result[0];
  }

  async getSlipsByUser(userId: string): Promise<Slip[]> {
    return await db.select().from(slips).where(eq(slips.userId, userId));
  }

  async getPendingSlips(userId: string): Promise<Slip[]> {
    return await db
      .select()
      .from(slips)
      .where(and(eq(slips.userId, userId), eq(slips.status, "pending")));
  }

  async createSlip(slip: InsertSlip): Promise<Slip> {
    const result = await db.insert(slips).values(slip).returning();
    return result[0];
  }

  async updateSlipStatus(slipId: number, status: string): Promise<Slip> {
    const result = await db
      .update(slips)
      .set({ status: status as any })
      .where(eq(slips.id, slipId))
      .returning();
    
    if (!result[0]) throw new Error("Slip not found");
    return result[0];
  }

  // Bets
  async getBet(betId: number): Promise<Bet | undefined> {
    const result = await db.select().from(bets).where(eq(bets.id, betId)).limit(1);
    return result[0];
  }

  async getBetsByUser(userId: string): Promise<Bet[]> {
    return await db.select().from(bets).where(eq(bets.userId, userId));
  }

  async getBetsByPropId(propId: number): Promise<Bet[]> {
    return await db.select().from(bets).where(eq(bets.propId, propId));
  }

  async getBetsWithProps(userId: string): Promise<(Bet & { prop?: Prop; slip?: Slip })[]> {
    try {
      const userBets = await db
        .select()
        .from(bets)
        .where(eq(bets.userId, userId))
        .orderBy(desc(bets.createdAt));

      // Fetch all unique prop IDs
      const propIds = [...new Set(userBets.map(b => b.propId).filter((id): id is number => id !== null))];
      
      const propsMap = new Map<number, Prop>();
      if (propIds.length > 0) {
        const propsData = await db
          .select()
          .from(props)
          .where(inArray(props.id, propIds));
        
        propsData.forEach(p => propsMap.set(p.id, p));
      }

      // Fetch all unique slip IDs
      const slipIds = [...new Set(userBets.map(b => b.slipId).filter((id): id is number => id !== null))];
      
      const slipsMap = new Map<number, Slip>();
      if (slipIds.length > 0) {
        const slipsData = await db
          .select()
          .from(slips)
          .where(inArray(slips.id, slipIds));
        
        slipsData.forEach(s => slipsMap.set(s.id, s));
      }

      return userBets.map(bet => ({
        ...bet,
        prop: bet.propId ? propsMap.get(bet.propId) : undefined,
        slip: bet.slipId ? slipsMap.get(bet.slipId) : undefined,
      }));
    } catch (error) {
      console.error("Error fetching bets with props:", error);
      throw error;
    }
  }

  async createBet(bet: InsertBet): Promise<Bet> {
    const result = await db.insert(bets).values(bet).returning();
    return result[0];
  }

  async placeBetWithBankrollCheck(bet: InsertBet): Promise<{ success: true; bet: Bet } | { success: false; error: string }> {
    try {
      const result = await db.transaction(async (tx) => {
        // Get user and lock row
        const userResult = await tx
          .select()
          .from(users)
          .where(eq(users.id, bet.userId))
          .for('update')
          .limit(1);

        if (!userResult[0]) {
          return { success: false as const, error: "User not found" };
        }

        const user = userResult[0];
        const currentBankroll = parseFloat(user.bankroll);
        const betAmount = parseFloat(bet.amount);

        if (betAmount <= 0) {
          return { success: false as const, error: "Bet amount must be greater than zero" };
        }

        if (betAmount > currentBankroll) {
          return { 
            success: false as const, 
            error: `Insufficient bankroll: bet amount $${betAmount.toFixed(2)} exceeds available $${currentBankroll.toFixed(2)}` 
          };
        }

        // Create bet
        const newBet = await tx.insert(bets).values(bet).returning();

        // Update bankroll
        await tx
          .update(users)
          .set({ bankroll: (currentBankroll - betAmount).toFixed(2) })
          .where(eq(users.id, bet.userId));

        return { success: true as const, bet: newBet[0] };
      });

      return result;
    } catch (error: any) {
      return { success: false, error: error.message || "Unknown error occurred" };
    }
  }

  async updateBetStatus(
    betId: number,
    status: string,
    closingLine?: string,
    clv?: string
  ): Promise<Bet> {
    const updateData: any = {
      status: status as any,
      settledAt: new Date(),
    };
    
    if (closingLine) updateData.closingLine = closingLine;
    if (clv) updateData.clv = clv;

    const result = await db
      .update(bets)
      .set(updateData)
      .where(eq(bets.id, betId))
      .returning();
    
    if (!result[0]) throw new Error("Bet not found");
    return result[0];
  }

  async settleBetWithBankrollUpdate(
    betId: number,
    outcome: 'won' | 'lost' | 'pushed',
    closingLine?: string,
    clv?: string
  ): Promise<{ success: true; bet: Bet; bankrollChange: number } | { success: false; error: string }> {
    try {
      const result = await db.transaction(async (tx) => {
        // Fetch bet
        const betResult = await tx
          .select()
          .from(bets)
          .where(eq(bets.id, betId))
          .limit(1);
        
        const bet = betResult[0];
        if (!bet) {
          throw new Error("Bet not found");
        }

        // Check if already settled
        if (bet.status.toLowerCase() !== 'pending') {
          throw new Error(`Bet already settled with status: ${bet.status}`);
        }

        // Fetch user
        const userResult = await tx
          .select()
          .from(users)
          .where(eq(users.id, bet.userId))
          .limit(1);
        
        const user = userResult[0];
        if (!user) {
          throw new Error("User not found");
        }

        const currentBankroll = parseFloat(user.bankroll);
        const betAmount = parseFloat(bet.amount);
        const potentialReturn = parseFloat(bet.potentialReturn || '0');
        
        let bankrollChange = 0;
        let newBankroll = currentBankroll;

        // Calculate bankroll change based on outcome
        if (outcome === 'won') {
          bankrollChange = potentialReturn;
          newBankroll = currentBankroll + potentialReturn;
        } else if (outcome === 'pushed') {
          bankrollChange = betAmount;
          newBankroll = currentBankroll + betAmount;
        }
        // For 'lost', bankroll stays the same

        // Update bet status
        const updateData: any = {
          status: outcome,
          settledAt: new Date(),
        };
        
        if (closingLine) updateData.closingLine = closingLine;
        if (clv) updateData.clv = clv;

        const updatedBet = await tx
          .update(bets)
          .set(updateData)
          .where(eq(bets.id, betId))
          .returning();

        // Update bankroll
        await tx
          .update(users)
          .set({ bankroll: newBankroll.toFixed(2) })
          .where(eq(users.id, bet.userId));

        return { bet: updatedBet[0], bankrollChange };
      });

      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, error: error.message || "Unknown error occurred" };
    }
  }

  async getWeek1Bets(userId: string): Promise<Bet[]> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return await db
      .select()
      .from(bets)
      .where(and(eq(bets.userId, userId), gte(bets.createdAt, oneWeekAgo)));
  }

  // Performance
  async getLatestSnapshot(userId: string): Promise<PerformanceSnapshot | undefined> {
    const result = await db
      .select()
      .from(performanceSnapshots)
      .where(eq(performanceSnapshots.userId, userId))
      .orderBy(desc(performanceSnapshots.date))
      .limit(1);
    
    return result[0];
  }

  async createSnapshot(snapshot: InsertPerformanceSnapshot): Promise<PerformanceSnapshot> {
    const result = await db.insert(performanceSnapshots).values(snapshot).returning();
    return result[0];
  }

  async getSnapshotHistory(userId: string, days: number): Promise<PerformanceSnapshot[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await db
      .select()
      .from(performanceSnapshots)
      .where(and(
        eq(performanceSnapshots.userId, userId),
        gte(performanceSnapshots.date, cutoffDate)
      ))
      .orderBy(performanceSnapshots.date);
  }

  // Data feeds
  async createDataFeed(feed: InsertDataFeed): Promise<DataFeed> {
    const result = await db.insert(dataFeeds).values(feed).returning();
    return result[0];
  }

  async getDataFeeds(provider: string, endpoint: string): Promise<DataFeed[]> {
    return await db
      .select()
      .from(dataFeeds)
      .where(and(eq(dataFeeds.provider, provider), eq(dataFeeds.endpoint, endpoint)));
  }

  // Game events
  async createGameEvent(event: InsertGameEvent): Promise<GameEvent> {
    const result = await db.insert(gameEvents).values(event).returning();
    return result[0];
  }

  async updateGameEvent(gameId: string, event: Partial<InsertGameEvent>): Promise<GameEvent> {
    const result = await db
      .update(gameEvents)
      .set({
        ...event,
        updatedAt: new Date(),
      })
      .where(eq(gameEvents.gameId, gameId))
      .returning();
    
    if (!result[0]) throw new Error("Game event not found");
    return result[0];
  }

  async getGameEvent(gameId: string): Promise<GameEvent | undefined> {
    const result = await db
      .select()
      .from(gameEvents)
      .where(eq(gameEvents.gameId, gameId))
      .limit(1);
    
    return result[0];
  }

  async getPendingGames(sport?: string): Promise<GameEvent[]> {
    if (sport) {
      return await db
        .select()
        .from(gameEvents)
        .where(and(
          eq(gameEvents.sport, sport),
          or(eq(gameEvents.status, "scheduled"), eq(gameEvents.status, "in_progress"))
        ));
    }
    return await db
      .select()
      .from(gameEvents)
      .where(or(eq(gameEvents.status, "scheduled"), eq(gameEvents.status, "in_progress")));
  }

  // Provider limits
  async createProviderLimit(limit: InsertProviderLimit): Promise<ProviderLimit> {
    const result = await db.insert(providerLimits).values(limit).returning();
    return result[0];
  }

  async updateProviderLimit(provider: string, updates: Partial<Omit<ProviderLimit, 'id' | 'provider'>>): Promise<ProviderLimit> {
    const result = await db
      .update(providerLimits)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(providerLimits.provider, provider))
      .returning();
    
    if (!result[0]) throw new Error("Provider limit not found");
    return result[0];
  }

  async getProviderLimit(provider: string): Promise<ProviderLimit | undefined> {
    const result = await db
      .select()
      .from(providerLimits)
      .where(eq(providerLimits.provider, provider))
      .limit(1);
    
    return result[0];
  }

  // Models
  async createModel(model: InsertModel): Promise<Model> {
    const result = await db.insert(models).values(model).returning();
    return result[0];
  }

  async getActiveModel(sport: string): Promise<Model | undefined> {
    const result = await db
      .select()
      .from(models)
      .where(and(eq(models.sport, sport), eq(models.isActive, true)))
      .limit(1);
    
    return result[0];
  }

  async getAllModels(): Promise<Model[]> {
    return await db.select().from(models);
  }

  // Weather data
  async createWeatherData(weather: InsertWeatherData): Promise<WeatherData> {
    const result = await db.insert(weatherData).values(weather).returning();
    return result[0];
  }

  async getWeatherDataByGameId(gameId: string): Promise<WeatherData | undefined> {
    const result = await db
      .select()
      .from(weatherData)
      .where(eq(weatherData.gameId, gameId))
      .limit(1);
    
    return result[0];
  }

  // Notifications
  async createNotificationPreferences(prefs: InsertNotificationPreferences): Promise<NotificationPreferences> {
    const result = await db.insert(notificationPreferences).values(prefs).returning();
    return result[0];
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined> {
    const result = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);
    
    return result[0];
  }

  async getAllNotificationPreferences(): Promise<NotificationPreferences[]> {
    return await db.select().from(notificationPreferences);
  }

  async updateNotificationPreferences(userId: string, prefs: Partial<InsertNotificationPreferences>): Promise<NotificationPreferences> {
    const result = await db
      .update(notificationPreferences)
      .set({
        ...prefs,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferences.userId, userId))
      .returning();
    
    if (!result[0]) throw new Error("Notification preferences not found");
    return result[0];
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const result = await db.insert(notifications).values(notification).returning();
    return result[0];
  }

  async getNotification(notificationId: number): Promise<Notification | undefined> {
    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);
    return result[0];
  }

  async getUserNotifications(userId: string, limit?: number): Promise<Notification[]> {
    const query = db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
    
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));
  }

  // Analytics
  async createAnalyticsSnapshot(snapshot: InsertAnalyticsSnapshot): Promise<AnalyticsSnapshot> {
    const result = await db.insert(analyticsSnapshots).values(snapshot).returning();
    return result[0];
  }

  async getLatestAnalytics(userId: string): Promise<AnalyticsSnapshot | undefined> {
    const result = await db
      .select()
      .from(analyticsSnapshots)
      .where(eq(analyticsSnapshots.userId, userId))
      .orderBy(desc(analyticsSnapshots.date))
      .limit(1);
    
    return result[0];
  }

  async getAnalyticsHistory(userId: string, days: number): Promise<AnalyticsSnapshot[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await db
      .select()
      .from(analyticsSnapshots)
      .where(and(
        eq(analyticsSnapshots.userId, userId),
        gte(analyticsSnapshots.date, cutoffDate)
      ))
      .orderBy(analyticsSnapshots.date);
  }

  // Line movements
  async createLineMovement(movement: InsertLineMovement): Promise<LineMovement> {
    const result = await db.insert(lineMovements).values(movement).returning();
    return result[0];
  }

  async getLineMovements(propId: number): Promise<LineMovement[]> {
    return await db
      .select()
      .from(lineMovements)
      .where(eq(lineMovements.propId, propId))
      .orderBy(lineMovements.timestamp);
  }

  async getRecentLineMovements(minutes: number): Promise<LineMovement[]> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - minutes);
    
    return await db
      .select()
      .from(lineMovements)
      .where(gte(lineMovements.timestamp, cutoffTime))
      .orderBy(desc(lineMovements.timestamp));
  }

  // Discord settings
  async createDiscordSettings(settings: InsertDiscordSettings): Promise<DiscordSettings> {
    const result = await db.insert(discordSettings).values(settings).returning();
    return result[0];
  }

  async getDiscordSettings(userId: string): Promise<DiscordSettings | undefined> {
    const result = await db
      .select()
      .from(discordSettings)
      .where(eq(discordSettings.userId, userId))
      .limit(1);
    
    return result[0];
  }

  async updateDiscordSettings(userId: string, settings: Partial<InsertDiscordSettings>): Promise<DiscordSettings> {
    const result = await db
      .update(discordSettings)
      .set({
        ...settings,
        updatedAt: new Date(),
      })
      .where(eq(discordSettings.userId, userId))
      .returning();
    
    if (!result[0]) throw new Error("Discord settings not found");
    return result[0];
  }

  async deleteDiscordSettings(userId: string): Promise<void> {
    await db.delete(discordSettings).where(eq(discordSettings.userId, userId));
  }
}

// Database is now available - using persistent storage
export const storage = new DbStorage();
// export const storage = new MemStorage(); // Fallback to in-memory if DB unavailable

// Export flag to indicate if we have DATABASE_URL configured
// This doesn't guarantee the DB is accessible, just that it's configured
export const isDatabaseConfigured = !!process.env.DATABASE_URL;
