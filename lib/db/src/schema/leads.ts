import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull(),
  contactName: text("contact_name").notNull(),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  vertical: text("vertical"),
  leadSource: text("lead_source"),
  existingPos: text("existing_pos"),
  processor: text("processor"),
  estimatedMonthlyVolume: numeric("estimated_monthly_volume", { precision: 12, scale: 2 }),
  leadScore: integer("lead_score").notNull().default(0),
  status: text("status").notNull().default("New"),
  assignedRepId: integer("assigned_rep_id"),
  lastContactDate: text("last_contact_date"),
  nextFollowUpDate: text("next_follow_up_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
