import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const onboardingTable = pgTable("onboarding", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull(),
  merchantName: text("merchant_name").notNull(),
  applicationSubmitted: boolean("application_submitted").notNull().default(false),
  underwritingApproved: boolean("underwriting_approved").notNull().default(false),
  equipmentShipped: boolean("equipment_shipped").notNull().default(false),
  accountActivated: boolean("account_activated").notNull().default(false),
  trainingCompleted: boolean("training_completed").notNull().default(false),
  notes: text("notes"),
  completedAt: text("completed_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOnboardingSchema = createInsertSchema(onboardingTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOnboarding = z.infer<typeof insertOnboardingSchema>;
export type Onboarding = typeof onboardingTable.$inferSelect;
