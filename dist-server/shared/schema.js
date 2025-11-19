var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
import { pgTable, text, serial, integer, decimal, timestamp, boolean, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from 'drizzle-orm';
// Session storage table for Replit Auth
export var sessions = pgTable("sessions", {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
}, function (table) { return [index("IDX_session_expire").on(table.expire)]; });
// User settings and bankroll (updated for Replit Auth)
export var users = pgTable("users", {
    id: varchar("id").primaryKey().default(sql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["gen_random_uuid()"], ["gen_random_uuid()"])))),
    email: varchar("email").unique(),
    firstName: varchar("first_name"),
    lastName: varchar("last_name"),
    profileImageUrl: varchar("profile_image_url"),
    bankroll: decimal("bankroll", { precision: 10, scale: 2 }).notNull().default("100.00"),
    initialBankroll: decimal("initial_bankroll", { precision: 10, scale: 2 }).notNull().default("100.00"),
    kellySizing: decimal("kelly_sizing", { precision: 3, scale: 2 }).notNull().default("0.125"), // 1/8 Kelly for micro bankroll
    riskTolerance: text("risk_tolerance", { enum: ["conservative", "balanced", "aggressive"] }).notNull().default("balanced"),
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export var upsertUserSchema = createInsertSchema(users);
export var insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
// Props with ML confidence scores
export var props = pgTable("props", {
    id: serial("id").primaryKey(),
    sport: text("sport").notNull(), // NHL, NBA, NFL, MLB
    player: text("player").notNull(),
    team: text("team").notNull(),
    opponent: text("opponent").notNull(),
    stat: text("stat").notNull(), // SOG, Points, Goals, Assists, etc.
    line: decimal("line", { precision: 5, scale: 1 }).notNull(), // Opening line
    currentLine: decimal("current_line", { precision: 5, scale: 1 }), // Current line for movement tracking
    direction: text("direction", { enum: ["over", "under"] }).notNull(),
    period: text("period", { enum: ["full_game", "1Q", "1H", "2H", "4Q"] }).notNull().default("full_game"), // Game period for NBA/NFL
    platform: text("platform").notNull(), // PrizePicks, Underdog, etc.
    confidence: integer("confidence").notNull(), // 0-100
    ev: decimal("ev", { precision: 5, scale: 2 }).notNull(), // Expected value %
    modelProbability: decimal("model_probability", { precision: 5, scale: 4 }).notNull(),
    gameTime: timestamp("game_time").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
export var insertPropSchema = createInsertSchema(props).omit({ id: true, createdAt: true });
// Generated slips
export var slips = pgTable("slips", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull(),
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
export var insertSlipSchema = createInsertSchema(slips).omit({ id: true, createdAt: true });
// Individual bets placed
export var bets = pgTable("bets", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull(),
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
export var insertBetSchema = createInsertSchema(bets).omit({ id: true, createdAt: true });
// Performance snapshots for tracking
export var performanceSnapshots = pgTable("performance_snapshots", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull(),
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
export var insertPerformanceSnapshotSchema = createInsertSchema(performanceSnapshots).omit({ id: true, createdAt: true });
// Data feeds for storing raw API responses
export var dataFeeds = pgTable("data_feeds", {
    id: serial("id").primaryKey(),
    provider: text("provider").notNull(), // balldontlie, oddsapi, prizepicks, underdog, scoreboard
    endpoint: text("endpoint").notNull(),
    response: jsonb("response").notNull(),
    etag: text("etag"),
    lastModified: text("last_modified"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
export var insertDataFeedSchema = createInsertSchema(dataFeeds).omit({ id: true, createdAt: true });
// Game events for tracking actual game results
export var gameEvents = pgTable("game_events", {
    id: serial("id").primaryKey(),
    sport: text("sport").notNull(),
    gameId: text("game_id").notNull().unique(), // External game ID from data provider
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    gameTime: timestamp("game_time").notNull(),
    status: text("status", { enum: ["scheduled", "in_progress", "final", "postponed"] }).notNull().default("scheduled"),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    playerStats: jsonb("player_stats"), // Detailed player statistics
    finalizedAt: timestamp("finalized_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export var insertGameEventSchema = createInsertSchema(gameEvents).omit({ id: true, createdAt: true, updatedAt: true });
// ML models for versioning
export var models = pgTable("models", {
    id: serial("id").primaryKey(),
    version: text("version").notNull().unique(),
    sport: text("sport").notNull(),
    modelType: text("model_type").notNull(), // gradient_boosting, statistical, etc.
    artifact: jsonb("artifact"), // Model weights/parameters
    performance: jsonb("performance"), // Accuracy metrics
    isActive: boolean("is_active").notNull().default(false),
    trainedAt: timestamp("trained_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
export var insertModelSchema = createInsertSchema(models).omit({ id: true, createdAt: true });
// Notification preferences for users
export var notificationPreferences = pgTable("notification_preferences", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull().unique(),
    emailEnabled: boolean("email_enabled").notNull().default(false),
    newPropsEnabled: boolean("new_props_enabled").notNull().default(true),
    highConfidenceOnly: boolean("high_confidence_only").notNull().default(false), // Only notify for props >70% confidence
    minConfidence: integer("min_confidence").notNull().default(65), // Minimum confidence threshold
    sports: jsonb("sports").notNull().default(sql(templateObject_2 || (templateObject_2 = __makeTemplateObject(["'[\"NHL\",\"NBA\",\"NFL\",\"MLB\"]'"], ["'[\"NHL\",\"NBA\",\"NFL\",\"MLB\"]'"])))), // Sports to receive notifications for
    platforms: jsonb("platforms").notNull().default(sql(templateObject_3 || (templateObject_3 = __makeTemplateObject(["'[\"PrizePicks\",\"Underdog\"]'"], ["'[\"PrizePicks\",\"Underdog\"]'"])))), // Platforms to receive notifications for
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export var insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({ id: true, createdAt: true, updatedAt: true });
// Notifications sent to users
export var notifications = pgTable("notifications", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull(),
    type: text("type", { enum: ["new_props", "high_confidence_prop", "bet_settled", "performance_alert"] }).notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    propIds: jsonb("prop_ids"), // Related props for new_props notifications
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
export var insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
// Weather data for NFL games
export var weatherData = pgTable("weather_data", {
    id: serial("id").primaryKey(),
    gameId: text("game_id").notNull().unique(), // Links to gameEvents
    stadium: text("stadium").notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 6 }).notNull(),
    longitude: decimal("longitude", { precision: 10, scale: 6 }).notNull(),
    temperature: decimal("temperature", { precision: 5, scale: 2 }), // Fahrenheit
    windSpeed: decimal("wind_speed", { precision: 5, scale: 2 }), // mph
    windGusts: decimal("wind_gusts", { precision: 5, scale: 2 }), // mph
    precipitation: decimal("precipitation", { precision: 5, scale: 2 }), // inches
    humidity: integer("humidity"), // percentage
    visibility: decimal("visibility", { precision: 5, scale: 2 }), // miles
    conditions: text("conditions"), // clear, cloudy, rain, snow, etc.
    isDome: boolean("is_dome").notNull().default(false), // Indoor stadium flag
    forecastTime: timestamp("forecast_time").notNull(), // When forecast was fetched
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
export var insertWeatherDataSchema = createInsertSchema(weatherData).omit({ id: true, createdAt: true });
// Provider limits tracking
export var providerLimits = pgTable("provider_limits", {
    id: serial("id").primaryKey(),
    provider: text("provider").notNull().unique(), // balldontlie, oddsapi, openmeteo, etc.
    callsToday: integer("calls_today").notNull().default(0),
    lastCallAt: timestamp("last_call_at"),
    dailyLimit: integer("daily_limit"), // null = unlimited
    rateLimitPerMinute: integer("rate_limit_per_minute"),
    resetAt: timestamp("reset_at"), // When daily counter resets
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export var insertProviderLimitSchema = createInsertSchema(providerLimits).omit({ id: true, createdAt: true, updatedAt: true });
// Advanced analytics tracking
export var analyticsSnapshots = pgTable("analytics_snapshots", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull(),
    date: timestamp("date").notNull(),
    // Platform performance breakdown
    platformStats: jsonb("platform_stats"), // {prizepicks: {wins: 10, losses: 5}, underdog: {...}}
    // Sport-specific performance
    sportStats: jsonb("sport_stats"), // {NHL: {wins: 5, roi: 15.2}, NBA: {...}}
    // Confidence accuracy tracking
    confidenceBrackets: jsonb("confidence_brackets"), // {60-70: {predicted: 65, actual: 62}, 70-80: {...}}
    // Trend analysis
    hotStreak: integer("hot_streak").notNull().default(0), // Consecutive wins
    coldStreak: integer("cold_streak").notNull().default(0), // Consecutive losses
    bestSport: text("best_sport"), // Sport with highest ROI
    bestPlatform: text("best_platform"), // Platform with highest win rate
    // Time-based patterns
    bestTimeOfWeek: text("best_time_of_week"), // Day of week with best performance
    avgBetSize: decimal("avg_bet_size", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
export var insertAnalyticsSnapshotSchema = createInsertSchema(analyticsSnapshots).omit({ id: true, createdAt: true });
// Line movement tracking for props
export var lineMovements = pgTable("line_movements", {
    id: serial("id").primaryKey(),
    propId: integer("prop_id").notNull(),
    platform: text("platform").notNull(),
    oldLine: decimal("old_line", { precision: 5, scale: 1 }).notNull(),
    newLine: decimal("new_line", { precision: 5, scale: 1 }).notNull(),
    movement: decimal("movement", { precision: 5, scale: 1 }).notNull(), // Difference (+ or -)
    timestamp: timestamp("timestamp").defaultNow().notNull(),
});
export var insertLineMovementSchema = createInsertSchema(lineMovements).omit({ id: true, timestamp: true });
// Discord webhook settings for users
export var discordSettings = pgTable("discord_settings", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull().unique(),
    webhookUrl: text("webhook_url").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    notifyNewProps: boolean("notify_new_props").notNull().default(true),
    notifyLineMovements: boolean("notify_line_movements").notNull().default(true),
    notifyBetSettlement: boolean("notify_bet_settlement").notNull().default(true),
    minConfidence: integer("min_confidence").notNull().default(70),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export var insertDiscordSettingsSchema = createInsertSchema(discordSettings).omit({ id: true, createdAt: true, updatedAt: true });
var templateObject_1, templateObject_2, templateObject_3;
