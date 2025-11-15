import type {
  User, InsertUser,
  Prop, InsertProp,
  Slip, InsertSlip,
  Bet, InsertBet,
  PerformanceSnapshot, InsertPerformanceSnapshot
} from "@shared/schema";

export interface IStorage {
  // User management
  getUser(userId: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateBankroll(userId: number, newBankroll: string): Promise<User>;
  
  // Props
  getActiveProps(sport?: string): Promise<Prop[]>;
  createProp(prop: InsertProp): Promise<Prop>;
  deactivateProp(propId: number): Promise<void>;
  
  // Slips
  getSlipsByUser(userId: number): Promise<Slip[]>;
  getPendingSlips(userId: number): Promise<Slip[]>;
  createSlip(slip: InsertSlip): Promise<Slip>;
  updateSlipStatus(slipId: number, status: string): Promise<Slip>;
  
  // Bets
  getBetsByUser(userId: number): Promise<Bet[]>;
  createBet(bet: InsertBet): Promise<Bet>;
  placeBetWithBankrollCheck(bet: InsertBet): Promise<{ success: true; bet: Bet } | { success: false; error: string }>;
  updateBetStatus(betId: number, status: string, closingLine?: string, clv?: string): Promise<Bet>;
  getWeek1Bets(userId: number): Promise<Bet[]>;
  
  // Performance
  getLatestSnapshot(userId: number): Promise<PerformanceSnapshot | undefined>;
  createSnapshot(snapshot: InsertPerformanceSnapshot): Promise<PerformanceSnapshot>;
  getSnapshotHistory(userId: number, days: number): Promise<PerformanceSnapshot[]>;
}

// In-memory storage implementation
class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private props: Map<number, Prop> = new Map();
  private slips: Map<number, Slip> = new Map();
  private bets: Map<number, Bet> = new Map();
  private snapshots: Map<number, PerformanceSnapshot> = new Map();
  
  private userIdCounter = 1;
  private propIdCounter = 1;
  private slipIdCounter = 1;
  private betIdCounter = 1;
  private snapshotIdCounter = 1;

  // Mutex for atomic bet placement per user
  private userLocks: Map<number, Promise<void>> = new Map();

  async getUser(userId: number): Promise<User | undefined> {
    return this.users.get(userId);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: this.userIdCounter++,
      ...user,
      createdAt: new Date(),
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async updateBankroll(userId: number, newBankroll: string): Promise<User> {
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

  async createProp(prop: InsertProp): Promise<Prop> {
    const newProp: Prop = {
      id: this.propIdCounter++,
      ...prop,
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

  async getSlipsByUser(userId: number): Promise<Slip[]> {
    return Array.from(this.slips.values()).filter(s => s.userId === userId);
  }

  async getPendingSlips(userId: number): Promise<Slip[]> {
    return Array.from(this.slips.values()).filter(
      s => s.userId === userId && s.status === "pending"
    );
  }

  async createSlip(slip: InsertSlip): Promise<Slip> {
    const newSlip: Slip = {
      id: this.slipIdCounter++,
      ...slip,
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

  async getBetsByUser(userId: number): Promise<Bet[]> {
    return Array.from(this.bets.values()).filter(b => b.userId === userId);
  }

  async createBet(bet: InsertBet): Promise<Bet> {
    const newBet: Bet = {
      id: this.betIdCounter++,
      ...bet,
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
        ...bet,
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

  async getWeek1Bets(userId: number): Promise<Bet[]> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return Array.from(this.bets.values()).filter(
      b => b.userId === userId && b.createdAt >= oneWeekAgo
    );
  }

  async getLatestSnapshot(userId: number): Promise<PerformanceSnapshot | undefined> {
    const userSnapshots = Array.from(this.snapshots.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    return userSnapshots[0];
  }

  async createSnapshot(snapshot: InsertPerformanceSnapshot): Promise<PerformanceSnapshot> {
    const newSnapshot: PerformanceSnapshot = {
      id: this.snapshotIdCounter++,
      ...snapshot,
      createdAt: new Date(),
    };
    this.snapshots.set(newSnapshot.id, newSnapshot);
    return newSnapshot;
  }

  async getSnapshotHistory(userId: number, days: number): Promise<PerformanceSnapshot[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return Array.from(this.snapshots.values())
      .filter(s => s.userId === userId && s.date >= cutoffDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}

export const storage = new MemStorage();
