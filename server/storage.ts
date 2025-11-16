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
  getAllActiveProps(): Promise<Prop[]>;
  createProp(prop: InsertProp): Promise<Prop>;
  deactivateProp(propId: number): Promise<void>;
  
  // Slips
  getSlipsByUser(userId: number): Promise<Slip[]>;
  getPendingSlips(userId: number): Promise<Slip[]>;
  createSlip(slip: InsertSlip): Promise<Slip>;
  updateSlipStatus(slipId: number, status: string): Promise<Slip>;
  
  // Bets
  getBet(betId: number): Promise<Bet | undefined>;
  getBetsByUser(userId: number): Promise<Bet[]>;
  getBetsWithProps(userId: number): Promise<(Bet & { prop?: Prop; slip?: Slip })[]>;
  createBet(bet: InsertBet): Promise<Bet>;
  placeBetWithBankrollCheck(bet: InsertBet): Promise<{ success: true; bet: Bet } | { success: false; error: string }>;
  settleBetWithBankrollUpdate(betId: number, outcome: 'won' | 'lost' | 'pushed', closingLine?: string, clv?: string): Promise<{ success: true; bet: Bet; bankrollChange: number } | { success: false; error: string }>;
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

  async getAllActiveProps(): Promise<Prop[]> {
    return Array.from(this.props.values()).filter(p => p.isActive);
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

  async getBet(betId: number): Promise<Bet | undefined> {
    return this.bets.get(betId);
  }

  async getBetsByUser(userId: number): Promise<Bet[]> {
    return Array.from(this.bets.values()).filter(b => b.userId === userId);
  }

  async getBetsWithProps(userId: number): Promise<(Bet & { prop?: Prop })[]> {
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

// Database storage implementation using Drizzle ORM
import { db } from "./db";
import { users, props, slips, bets, performanceSnapshots } from "@shared/schema";
import { eq, and, desc, gte, sql, inArray } from "drizzle-orm";

class DbStorage implements IStorage {
  // User management
  async getUser(userId: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateBankroll(userId: number, newBankroll: string): Promise<User> {
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
    if (sport) {
      return await db
        .select()
        .from(props)
        .where(and(eq(props.isActive, true), eq(props.sport, sport)));
    }
    return await db.select().from(props).where(eq(props.isActive, true));
  }

  async getAllActiveProps(): Promise<Prop[]> {
    return await db.select().from(props).where(eq(props.isActive, true));
  }

  async createProp(prop: InsertProp): Promise<Prop> {
    const result = await db.insert(props).values(prop).returning();
    return result[0];
  }

  async deactivateProp(propId: number): Promise<void> {
    await db.update(props).set({ isActive: false }).where(eq(props.id, propId));
  }

  // Slips
  async getSlipsByUser(userId: number): Promise<Slip[]> {
    return await db.select().from(slips).where(eq(slips.userId, userId));
  }

  async getPendingSlips(userId: number): Promise<Slip[]> {
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

  async getBetsByUser(userId: number): Promise<Bet[]> {
    return await db.select().from(bets).where(eq(bets.userId, userId));
  }

  async getBetsWithProps(userId: number): Promise<(Bet & { prop?: Prop; slip?: Slip })[]> {
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

  async getWeek1Bets(userId: number): Promise<Bet[]> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return await db
      .select()
      .from(bets)
      .where(and(eq(bets.userId, userId), gte(bets.createdAt, oneWeekAgo)));
  }

  // Performance
  async getLatestSnapshot(userId: number): Promise<PerformanceSnapshot | undefined> {
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

  async getSnapshotHistory(userId: number, days: number): Promise<PerformanceSnapshot[]> {
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
}

// Use database storage
export const storage = new DbStorage();

// Keep MemStorage for reference/testing
// export const storage = new MemStorage();
