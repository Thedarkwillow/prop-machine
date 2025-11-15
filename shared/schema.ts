import { pgTable, text, serial, integer, decimal, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User settings and bankroll
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  bankroll: decimal("bankroll", { precision: 10, scale: 2 }).notNull().default("100.00"),
  initialBankroll: decimal("initial_bankroll", { precision: 10, scale: 2 }).notNull().default("100.00"),
  kellySizing: decimal("kelly_sizing", { precision: 3, scale: 2 }).notNull().default("0.125"), // 1/8 Kelly for micro bankroll
  riskTolerance: text("risk_tolerance", { enum: ["conservative", "balanced", "aggressive"] }).notNull().default("balanced"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Props with ML confidence scores
export const props = pgTable("props", {
  id: serial("id").primaryKey(),
  sport: text("sport").notNull(), // NHL, NBA, NFL, MLB
  player: text("player").notNull(),
  team: text("team").notNull(),
  opponent: text("opponent").notNull(),
  stat: text("stat").notNull(), // SOG, Points, Goals, Assists, etc.
  line: decimal("line", { precision: 5, scale: 1 }).notNull(), // Opening line
  currentLine: decimal("current_line", { precision: 5, scale: 1 }), // Current line for movement tracking
  direction: text("direction", { enum: ["over", "under"] }).notNull(),
  platform: text("platform").notNull(), // PrizePicks, Underdog, etc.
  confidence: integer("confidence").notNull(), // 0-100
  ev: decimal("ev", { precision: 5, scale: 2 }).notNull(), // Expected value %
  modelProbability: decimal("model_probability", { precision: 5, scale: 4 }).notNull(),
  gameTime: timestamp("game_time").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPropSchema = createInsertSchema(props).omit({ id: true, createdAt: true });
export type InsertProp = z.infer<typeof insertPropSchema>;
export type Prop = typeof props.$inferSelect;

// Generated slips
export const slips = pgTable("slips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type", { enum: ["conservative", "balanced", "aggressive"] }).notNull(),
  title: text("title").notNull(),
  picks: jsonb("picks").notNull(), // Array of prop IDs with details
  confidence: integer("confidence").notNull(),
  suggestedBet: decimal("suggested_bet", { precision: 10, scale: 2 }).notNull(),
  potentialReturn: decimal("potential_return", { precision: 10, scale: 2 }).notNull(),
  platform: text("platform").notNull(),
  status: text("status", { enum: ["pending", "placed", "won", "lost", "pushed"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSlipSchema = createInsertSchema(slips).omit({ id: true, createdAt: true });
export type InsertSlip = z.infer<typeof insertSlipSchema>;
export type Slip = typeof slips.$inferSelect;

// Individual bets placed
export const bets = pgTable("bets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  slipId: integer("slip_id"),
  propId: integer("prop_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  odds: decimal("odds", { precision: 6, scale: 2 }).notNull(),
  potentialReturn: decimal("potential_return", { precision: 10, scale: 2 }).notNull(),
  status: text("status", { enum: ["pending", "won", "lost", "pushed"] }).notNull().default("pending"),
  direction: text("direction", { enum: ["over", "under"] }), // Snapshot of prop direction at bet time
  openingLine: decimal("opening_line", { precision: 5, scale: 1 }),
  closingLine: decimal("closing_line", { precision: 5, scale: 1 }),
  clv: decimal("clv", { precision: 5, scale: 2 }), // Closing line value
  settledAt: timestamp("settled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBetSchema = createInsertSchema(bets).omit({ id: true, createdAt: true });
export type InsertBet = z.infer<typeof insertBetSchema>;
export type Bet = typeof bets.$inferSelect;

// Performance snapshots for tracking
export const performanceSnapshots = pgTable("performance_snapshots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull(),
  bankroll: decimal("bankroll", { precision: 10, scale: 2 }).notNull(),
  totalBets: integer("total_bets").notNull(),
  wins: integer("wins").notNull(),
  losses: integer("losses").notNull(),
  pushes: integer("pushes").notNull(),
  winRate: decimal("win_rate", { precision: 5, scale: 2 }).notNull(),
  roi: decimal("roi", { precision: 5, scale: 2 }).notNull(),
  avgClv: decimal("avg_clv", { precision: 5, scale: 2 }),
  kellyCompliance: decimal("kelly_compliance", { precision: 5, scale: 2 }), // % of bets following Kelly
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPerformanceSnapshotSchema = createInsertSchema(performanceSnapshots).omit({ id: true, createdAt: true });
export type InsertPerformanceSnapshot = z.infer<typeof insertPerformanceSnapshotSchema>;
export type PerformanceSnapshot = typeof performanceSnapshots.$inferSelect;
