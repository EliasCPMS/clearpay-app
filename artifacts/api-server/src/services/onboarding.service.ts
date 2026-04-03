import { desc, eq } from "drizzle-orm";
import { db, leadsTable, onboardingTable } from "@workspace/db";
import type {
  CreateOnboardingBody,
  UpdateOnboardingBody,
} from "@workspace/api-zod";
import type { SessionAccessContext } from "./session-context";

function toOnboardingResponse(record: typeof onboardingTable.$inferSelect) {
  return {
    id: record.id,
    leadId: record.leadId,
    merchantName: record.merchantName,
    applicationSubmitted: record.applicationSubmitted,
    underwritingApproved: record.underwritingApproved,
    equipmentShipped: record.equipmentShipped,
    accountActivated: record.accountActivated,
    trainingCompleted: record.trainingCompleted,
    notes: record.notes ?? null,
    completedAt: record.completedAt ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function listOnboarding(context: SessionAccessContext) {
  if (context.role === "rep") {
    const rows = await db
      .select({ onboarding: onboardingTable })
      .from(onboardingTable)
      .leftJoin(leadsTable, eq(onboardingTable.leadId, leadsTable.id))
      .where(eq(leadsTable.assignedRepId, context.repId!))
      .orderBy(desc(onboardingTable.createdAt));

    return rows.map((row) => toOnboardingResponse(row.onboarding));
  }

  const records = await db
    .select()
    .from(onboardingTable)
    .orderBy(desc(onboardingTable.createdAt));
  return records.map(toOnboardingResponse);
}

export async function createOnboarding(data: CreateOnboardingBody) {
  const [record] = await db
    .insert(onboardingTable)
    .values({
      leadId: data.leadId,
      merchantName: data.merchantName,
      notes: data.notes ?? null,
    })
    .returning();

  return toOnboardingResponse(record);
}

export async function updateOnboardingById(id: number, data: UpdateOnboardingBody) {
  const [record] = await db
    .update(onboardingTable)
    .set(data)
    .where(eq(onboardingTable.id, id))
    .returning();

  if (!record) return null;
  return toOnboardingResponse(record);
}
