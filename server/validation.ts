import { z } from "zod";

export const updateNotificationPreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  newPropsEnabled: z.boolean().optional(),
  highConfidenceOnly: z.boolean().optional(),
  minConfidence: z.number().min(0).max(100).optional(),
  sports: z.array(z.string()).min(1, "Sports array cannot be empty").optional(),
  platforms: z.array(z.string()).min(1, "Platforms array cannot be empty").optional(),
});

// Path params validation
export const userIdParamSchema = z.object({
  userId: z.string().regex(/^\d+$/, "User ID must be a number").transform(Number),
});

export const betIdParamSchema = z.object({
  betId: z.string().regex(/^\d+$/, "Bet ID must be a number").transform(Number),
});

export const slipIdParamSchema = z.object({
  slipId: z.string().regex(/^\d+$/, "Slip ID must be a number").transform(Number),
});

export const propIdParamSchema = z.object({
  propId: z.string().regex(/^\d+$/, "Prop ID must be a number").transform(Number),
});

// Route validation schemas
export const updateBankrollSchema = z.object({
  bankroll: z.string().regex(/^\d+\.\d{2}$/, "Bankroll must be in format XX.XX")
    .transform((val) => {
      const num = parseFloat(val);
      if (num < 0) throw new Error("Bankroll cannot be negative");
      return val;
    }),
});

export const updateSlipStatusSchema = z.object({
  status: z.enum(["pending", "placed", "won", "lost", "pushed"]),
});

export const settleBetSchema = z.object({
  status: z.enum(["pending", "won", "lost", "pushed"]),
  closingLine: z.string().regex(/^\d+\.\d{1}$/).optional(),
  clv: z.string().regex(/^-?\d+\.\d{2}$/).optional(),
});

export const queryParamsSportSchema = z.object({
  sport: z.enum(["NHL", "NBA", "NFL", "MLB"]).optional(),
});

export const queryParamsWeek1Schema = z.object({
  week1: z.enum(["true", "false"]).optional(),
});

export const queryParamsSlipStatusSchema = z.object({
  status: z.enum(["pending", "placed", "won", "lost", "pushed"]).optional(),
});

export const queryParamsDaysSchema = z.object({
  days: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export const analyzePropSchema = z.object({
  sport: z.enum(["NHL", "NBA", "NFL", "MLB"]),
  player: z.string().min(1),
  team: z.string().min(1),
  opponent: z.string().min(1),
  stat: z.string().min(1),
  line: z.string(),
  direction: z.enum(["over", "under"]),
  platform: z.string().min(1),
});
