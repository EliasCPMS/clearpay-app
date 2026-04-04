import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db, leadsTable, notesTable, onboardingTable, repsTable, tasksTable } from "@workspace/db";
import type {
  CreateLeadBody,
  CreateLeadNoteBody,
  GetLeadAiInsightResponse,
  ListLeadsParams,
  UpdateLeadBody,
} from "@workspace/api-zod";
import { calculateLeadScore } from "../lib/scoring";
import { generateLeadInsight } from "./ai.service";
import type { SessionAccessContext } from "./session-context";

function toNullableNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  return Number.parseFloat(value);
}

function toLeadResponse(lead: typeof leadsTable.$inferSelect, repName?: string | null) {
  return {
    id: lead.id,
    businessName: lead.businessName,
    contactName: lead.contactName,
    phone: lead.phone ?? null,
    email: lead.email ?? null,
    website: lead.website ?? null,
    vertical: lead.vertical ?? null,
    leadSource: lead.leadSource ?? null,
    existingPos: lead.existingPos ?? null,
    processor: lead.processor ?? null,
    estimatedMonthlyVolume: toNullableNumber(lead.estimatedMonthlyVolume),
    leadScore: lead.leadScore,
    status: lead.status,
    assignedRepId: lead.assignedRepId ?? null,
    assignedRepName: repName ?? null,
    lastContactDate: lead.lastContactDate ?? null,
    nextFollowUpDate: lead.nextFollowUpDate ?? null,
    notes: lead.notes ?? null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

function getLeadAccessDenied(
  context: SessionAccessContext,
  assignedRepId: number | null,
): boolean {
  return context.role === "rep" && assignedRepId !== context.repId;
}

export async function listLeads(
  filters: ListLeadsParams,
  context: SessionAccessContext,
) {
  const conditions: SQL[] = [];

  if (filters.status) conditions.push(eq(leadsTable.status, filters.status));

  // Preserve current behavior: reps are restricted to their own records.
  if (context.role === "rep") {
    conditions.push(eq(leadsTable.assignedRepId, context.repId!));
  } else if (filters.assignedRep != null) {
    conditions.push(eq(leadsTable.assignedRepId, filters.assignedRep));
  }

  if (filters.vertical) conditions.push(eq(leadsTable.vertical, filters.vertical));
  if (filters.leadSource) conditions.push(eq(leadsTable.leadSource, filters.leadSource));
  if (filters.search) {
    conditions.push(
      or(
        ilike(leadsTable.businessName, `%${filters.search}%`),
        ilike(leadsTable.contactName, `%${filters.search}%`),
        ilike(leadsTable.email, `%${filters.search}%`),
      )!,
    );
  }

  const baseQuery = db
    .select({
      lead: leadsTable,
      repName: repsTable.name,
    })
    .from(leadsTable)
    .leftJoin(repsTable, eq(leadsTable.assignedRepId, repsTable.id))
    .orderBy(desc(leadsTable.createdAt));

  const rows =
    conditions.length > 0
      ? await baseQuery.where(and(...conditions))
      : await baseQuery;

  return rows.map((row) => toLeadResponse(row.lead, row.repName));
}

export async function createLead(data: CreateLeadBody) {
  const leadScore = calculateLeadScore({
    estimatedMonthlyVolume: data.estimatedMonthlyVolume ?? null,
    vertical: data.vertical ?? null,
    leadSource: data.leadSource ?? null,
    lastContactDate: data.lastContactDate ?? null,
  });

  const [lead] = await db
    .insert(leadsTable)
    .values({
      ...data,
      leadScore,
      estimatedMonthlyVolume:
        data.estimatedMonthlyVolume != null
          ? String(data.estimatedMonthlyVolume)
          : null,
    })
    .returning();

  let repName: string | null = null;
  if (lead.assignedRepId) {
    const [rep] = await db
      .select()
      .from(repsTable)
      .where(eq(repsTable.id, lead.assignedRepId));
    repName = rep?.name ?? null;
  }

  return toLeadResponse(lead, repName);
}

export async function getLeadById(id: number) {
  const [row] = await db
    .select({ lead: leadsTable, repName: repsTable.name })
    .from(leadsTable)
    .leftJoin(repsTable, eq(leadsTable.assignedRepId, repsTable.id))
    .where(eq(leadsTable.id, id));

  if (!row) return null;

  return {
    lead: toLeadResponse(row.lead, row.repName),
    assignedRepId: row.lead.assignedRepId ?? null,
  };
}

export async function updateLeadById(
  id: number,
  data: UpdateLeadBody,
  context: SessionAccessContext,
) {
  const [existingLead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
  if (!existingLead) return { kind: "not_found" as const };

  if (getLeadAccessDenied(context, existingLead.assignedRepId)) {
    return { kind: "access_denied" as const };
  }

  const updateValues: Partial<typeof leadsTable.$inferInsert> = { ...data };
  if (data.estimatedMonthlyVolume !== undefined) {
    updateValues.estimatedMonthlyVolume =
      data.estimatedMonthlyVolume != null
        ? String(data.estimatedMonthlyVolume)
        : null;
  }

  const merged = { ...existingLead, ...updateValues };
  const leadScore = calculateLeadScore({
    estimatedMonthlyVolume: toNullableNumber(merged.estimatedMonthlyVolume),
    vertical: merged.vertical ?? null,
    leadSource: merged.leadSource ?? null,
    lastContactDate: merged.lastContactDate ?? null,
  });

  const [updatedLead] = await db
    .update(leadsTable)
    .set({ ...updateValues, leadScore })
    .where(eq(leadsTable.id, id))
    .returning();

  let repName: string | null = null;
  if (updatedLead.assignedRepId) {
    const [rep] = await db
      .select()
      .from(repsTable)
      .where(eq(repsTable.id, updatedLead.assignedRepId));
    repName = rep?.name ?? null;
  }

  // Auto-create onboarding record on Closed Won transition.
  if (updatedLead.status === "Closed Won" && existingLead.status !== "Closed Won") {
    const [existingOnboarding] = await db
      .select()
      .from(onboardingTable)
      .where(eq(onboardingTable.leadId, updatedLead.id));
    if (!existingOnboarding) {
      await db.insert(onboardingTable).values({
        leadId: updatedLead.id,
        merchantName: updatedLead.businessName,
      });
    }
  }

  return { kind: "ok" as const, lead: toLeadResponse(updatedLead, repName) };
}

export async function deleteLeadById(id: number, context: SessionAccessContext) {
  const [existingLead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
  if (!existingLead) return { kind: "not_found" as const };

  if (getLeadAccessDenied(context, existingLead.assignedRepId)) {
    return { kind: "access_denied" as const };
  }

  await db.delete(leadsTable).where(eq(leadsTable.id, id));
  return { kind: "ok" as const };
}

export async function recalculateLeadScoreById(id: number) {
  const [existingLead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
  if (!existingLead) return null;

  const leadScore = calculateLeadScore({
    estimatedMonthlyVolume: toNullableNumber(existingLead.estimatedMonthlyVolume),
    vertical: existingLead.vertical ?? null,
    leadSource: existingLead.leadSource ?? null,
    lastContactDate: existingLead.lastContactDate ?? null,
  });

  const [updatedLead] = await db
    .update(leadsTable)
    .set({ leadScore })
    .where(eq(leadsTable.id, id))
    .returning();

  let repName: string | null = null;
  if (updatedLead.assignedRepId) {
    const [rep] = await db
      .select()
      .from(repsTable)
      .where(eq(repsTable.id, updatedLead.assignedRepId));
    repName = rep?.name ?? null;
  }

  return toLeadResponse(updatedLead, repName);
}

export async function listLeadNotesByLeadId(leadId: number) {
  const rows = await db
    .select({ note: notesTable, authorName: repsTable.name })
    .from(notesTable)
    .leftJoin(repsTable, eq(notesTable.authorId, repsTable.id))
    .where(eq(notesTable.leadId, leadId))
    .orderBy(desc(notesTable.createdAt));

  return rows.map((row) => ({
    id: row.note.id,
    leadId: row.note.leadId,
    authorId: row.note.authorId ?? null,
    authorName: row.authorName ?? null,
    content: row.note.content,
    createdAt: row.note.createdAt.toISOString(),
  }));
}

export async function createLeadNote(leadId: number, data: CreateLeadNoteBody) {
  const [note] = await db
    .insert(notesTable)
    .values({
      leadId,
      authorId: data.authorId ?? null,
      content: data.content,
    })
    .returning();

  let authorName: string | null = null;
  if (note.authorId) {
    const [rep] = await db
      .select()
      .from(repsTable)
      .where(eq(repsTable.id, note.authorId));
    authorName = rep?.name ?? null;
  }

  return {
    id: note.id,
    leadId: note.leadId,
    authorId: note.authorId ?? null,
    authorName,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
  };
}

export async function listLeadTasksByLeadId(leadId: number) {
  const rows = await db
    .select({ task: tasksTable, repName: repsTable.name })
    .from(tasksTable)
    .leftJoin(repsTable, eq(tasksTable.assignedTo, repsTable.id))
    .where(eq(tasksTable.leadId, leadId))
    .orderBy(desc(tasksTable.createdAt));

  return rows.map((row) => ({
    id: row.task.id,
    leadId: row.task.leadId ?? null,
    leadName: null,
    assignedTo: row.task.assignedTo ?? null,
    assignedToName: row.repName ?? null,
    title: row.task.title,
    description: row.task.description ?? null,
    dueDate: row.task.dueDate ?? null,
    priority: row.task.priority,
    completed: row.task.completed,
    createdAt: row.task.createdAt.toISOString(),
  }));
}

export const ImportLeadItemSchema = z.object({
  businessName: z.string().min(1),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  vertical: z.string().optional(),
  leadSource: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
});

export const ImportLeadsBodySchema = z.object({
  leads: z.array(ImportLeadItemSchema).min(1).max(500),
});

export type ImportLeadItem = z.infer<typeof ImportLeadItemSchema>;

type ImportResultItem =
  | { result: "created"; leadId: number }
  | { result: "duplicate"; existingId: number }
  | { result: "failed"; error: string };

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

async function findDuplicate(item: ImportLeadItem): Promise<number | null> {
  const website = item.website?.trim();
  if (website) {
    const [row] = await db
      .select({ id: leadsTable.id })
      .from(leadsTable)
      .where(eq(leadsTable.website, website))
      .limit(1);
    if (row) return row.id;
  }

  const phone = item.phone?.trim();
  if (phone) {
    const [row] = await db
      .select({ id: leadsTable.id })
      .from(leadsTable)
      .where(eq(leadsTable.phone, phone))
      .limit(1);
    if (row) return row.id;
  }

  const normalizedName = normalizeText(item.businessName);
  const rows = await db
    .select({ id: leadsTable.id, businessName: leadsTable.businessName })
    .from(leadsTable);
  const nameMatch = rows.find(
    (r) => normalizeText(r.businessName) === normalizedName,
  );
  if (nameMatch) return nameMatch.id;

  return null;
}

export async function importLeads(
  items: ImportLeadItem[],
): Promise<{ results: ImportResultItem[] }> {
  const results: ImportResultItem[] = [];

  for (const item of items) {
    try {
      const existingId = await findDuplicate(item);
      if (existingId !== null) {
        results.push({ result: "duplicate", existingId });
        continue;
      }

      const locationParts = [item.address, item.city, item.state].filter(Boolean);
      const locationNote = locationParts.length
        ? `Address: ${locationParts.join(", ")}`
        : null;
      const combinedNotes = [item.notes, locationNote].filter(Boolean).join("\n") || null;

      const leadScore = calculateLeadScore({
        estimatedMonthlyVolume: null,
        vertical: item.vertical ?? null,
        leadSource: item.leadSource ?? null,
        lastContactDate: null,
      });

      const [created] = await db
        .insert(leadsTable)
        .values({
          businessName: item.businessName.trim(),
          contactName: (item.contactName?.trim()) || item.businessName.trim(),
          phone: item.phone?.trim() || null,
          email: item.email?.trim() || null,
          website: item.website?.trim() || null,
          vertical: item.vertical?.trim() || null,
          leadSource: item.leadSource?.trim() || null,
          notes: combinedNotes,
          status: item.status?.trim() || "New",
          leadScore,
        })
        .returning({ id: leadsTable.id });

      results.push({ result: "created", leadId: created.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      results.push({ result: "failed", error: message });
    }
  }

  return { results };
}

export async function getLeadAiInsightById(
  leadId: number,
): Promise<GetLeadAiInsightResponse | null> {
  const [row] = await db
    .select({ lead: leadsTable, repName: repsTable.name })
    .from(leadsTable)
    .leftJoin(repsTable, eq(leadsTable.assignedRepId, repsTable.id))
    .where(eq(leadsTable.id, leadId));

  if (!row) return null;

  const notes = await db
    .select()
    .from(notesTable)
    .where(eq(notesTable.leadId, leadId));

  return generateLeadInsight({
    businessName: row.lead.businessName,
    contactName: row.lead.contactName,
    vertical: row.lead.vertical,
    leadSource: row.lead.leadSource,
    status: row.lead.status,
    estimatedMonthlyVolume: toNullableNumber(row.lead.estimatedMonthlyVolume),
    leadScore: row.lead.leadScore,
    existingPos: row.lead.existingPos,
    processor: row.lead.processor,
    lastContactDate: row.lead.lastContactDate,
    nextFollowUpDate: row.lead.nextFollowUpDate,
    repName: row.repName ?? null,
    notes: notes.map((note) => note.content),
  });
}
