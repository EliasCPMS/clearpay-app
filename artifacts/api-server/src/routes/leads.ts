import { Router, type IRouter } from "express";
import { eq, ilike, or, and, isNull, desc } from "drizzle-orm";
import { db, leadsTable, repsTable, notesTable, tasksTable, onboardingTable } from "@workspace/db";
import {
  ListLeadsQueryParams,
  ListLeadsResponse,
  CreateLeadBody,
  GetLeadParams,
  GetLeadResponse,
  UpdateLeadParams,
  UpdateLeadBody,
  UpdateLeadResponse,
  DeleteLeadParams,
  RecalculateLeadScoreParams,
  RecalculateLeadScoreResponse,
  ListLeadNotesParams,
  ListLeadNotesResponse,
  CreateLeadNoteParams,
  CreateLeadNoteBody,
  ListLeadTasksParams,
  ListLeadTasksResponse,
  GetLeadAiInsightParams,
  GetLeadAiInsightResponse,
} from "@workspace/api-zod";
import { calculateLeadScore } from "../lib/scoring";
import { generateLeadInsight } from "../services/ai.service";

const router: IRouter = Router();

function formatLead(lead: typeof leadsTable.$inferSelect, repName?: string | null) {
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
    estimatedMonthlyVolume: lead.estimatedMonthlyVolume != null ? parseFloat(lead.estimatedMonthlyVolume as string) : null,
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

router.get("/leads", async (req, res): Promise<void> => {
  const query = ListLeadsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { status, assignedRep, search, vertical, leadSource } = query.data;

  const conditions = [];
  if (status) conditions.push(eq(leadsTable.status, status));
  // Reps can only see leads assigned to them; admins can filter by any rep
  if (req.session.role === "rep") {
    conditions.push(eq(leadsTable.assignedRepId, req.session.repId!));
  } else if (assignedRep) {
    conditions.push(eq(leadsTable.assignedRepId, assignedRep));
  }
  if (vertical) conditions.push(eq(leadsTable.vertical, vertical));
  if (leadSource) conditions.push(eq(leadsTable.leadSource, leadSource));
  if (search) {
    conditions.push(
      or(
        ilike(leadsTable.businessName, `%${search}%`),
        ilike(leadsTable.contactName, `%${search}%`),
        ilike(leadsTable.email, `%${search}%`),
      )!
    );
  }

  const baseQuery = db.select({
    lead: leadsTable,
    repName: repsTable.name,
  })
    .from(leadsTable)
    .leftJoin(repsTable, eq(leadsTable.assignedRepId, repsTable.id))
    .orderBy(desc(leadsTable.createdAt));

  const rows = conditions.length > 0
    ? await baseQuery.where(and(...conditions))
    : await baseQuery;

  const leads = rows.map(r => formatLead(r.lead, r.repName));
  res.json(ListLeadsResponse.parse(leads));
});

router.post("/leads", async (req, res): Promise<void> => {
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const score = calculateLeadScore({
    estimatedMonthlyVolume: data.estimatedMonthlyVolume ?? null,
    vertical: data.vertical ?? null,
    leadSource: data.leadSource ?? null,
    lastContactDate: data.lastContactDate ?? null,
  });

  const [lead] = await db.insert(leadsTable).values({
    ...data,
    leadScore: score,
    estimatedMonthlyVolume: data.estimatedMonthlyVolume != null ? String(data.estimatedMonthlyVolume) : null,
  }).returning();

  let repName: string | null = null;
  if (lead.assignedRepId) {
    const [rep] = await db.select().from(repsTable).where(eq(repsTable.id, lead.assignedRepId));
    repName = rep?.name ?? null;
  }

  res.status(201).json(GetLeadResponse.parse(formatLead(lead, repName)));
});

router.get("/leads/:id", async (req, res): Promise<void> => {
  const params = GetLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.select({ lead: leadsTable, repName: repsTable.name })
    .from(leadsTable)
    .leftJoin(repsTable, eq(leadsTable.assignedRepId, repsTable.id))
    .where(eq(leadsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  if (req.session.role === "rep" && row.lead.assignedRepId !== req.session.repId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  res.json(GetLeadResponse.parse(formatLead(row.lead, row.repName)));
});

router.patch("/leads/:id", async (req, res): Promise<void> => {
  const params = UpdateLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const updateData: Partial<typeof leadsTable.$inferInsert> = { ...data };
  if (data.estimatedMonthlyVolume !== undefined) {
    updateData.estimatedMonthlyVolume = data.estimatedMonthlyVolume != null ? String(data.estimatedMonthlyVolume) : null;
  }

  const [existing] = await db.select().from(leadsTable).where(eq(leadsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  if (req.session.role === "rep" && existing.assignedRepId !== req.session.repId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const merged = { ...existing, ...updateData };
  const score = calculateLeadScore({
    estimatedMonthlyVolume: merged.estimatedMonthlyVolume != null ? parseFloat(merged.estimatedMonthlyVolume as string) : null,
    vertical: merged.vertical ?? null,
    leadSource: merged.leadSource ?? null,
    lastContactDate: merged.lastContactDate ?? null,
  });

  const [lead] = await db.update(leadsTable)
    .set({ ...updateData, leadScore: score })
    .where(eq(leadsTable.id, params.data.id))
    .returning();

  let repName: string | null = null;
  if (lead.assignedRepId) {
    const [rep] = await db.select().from(repsTable).where(eq(repsTable.id, lead.assignedRepId));
    repName = rep?.name ?? null;
  }

  // Auto-create onboarding record when lead is moved to Closed Won
  if (lead.status === "Closed Won" && existing.status !== "Closed Won") {
    const [existingOnboarding] = await db.select().from(onboardingTable)
      .where(eq(onboardingTable.leadId, lead.id));
    if (!existingOnboarding) {
      await db.insert(onboardingTable).values({
        leadId: lead.id,
        merchantName: lead.businessName,
      });
    }
  }

  res.json(UpdateLeadResponse.parse(formatLead(lead, repName)));
});

router.delete("/leads/:id", async (req, res): Promise<void> => {
  const params = DeleteLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(leadsTable).where(eq(leadsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  if (req.session.role === "rep" && existing.assignedRepId !== req.session.repId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  await db.delete(leadsTable).where(eq(leadsTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/leads/:id/score", async (req, res): Promise<void> => {
  const params = RecalculateLeadScoreParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(leadsTable).where(eq(leadsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  const score = calculateLeadScore({
    estimatedMonthlyVolume: existing.estimatedMonthlyVolume != null ? parseFloat(existing.estimatedMonthlyVolume as string) : null,
    vertical: existing.vertical ?? null,
    leadSource: existing.leadSource ?? null,
    lastContactDate: existing.lastContactDate ?? null,
  });

  const [lead] = await db.update(leadsTable)
    .set({ leadScore: score })
    .where(eq(leadsTable.id, params.data.id))
    .returning();

  let repName: string | null = null;
  if (lead.assignedRepId) {
    const [rep] = await db.select().from(repsTable).where(eq(repsTable.id, lead.assignedRepId));
    repName = rep?.name ?? null;
  }

  res.json(RecalculateLeadScoreResponse.parse(formatLead(lead, repName)));
});

router.get("/leads/:id/notes", async (req, res): Promise<void> => {
  const params = ListLeadNotesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db.select({ note: notesTable, authorName: repsTable.name })
    .from(notesTable)
    .leftJoin(repsTable, eq(notesTable.authorId, repsTable.id))
    .where(eq(notesTable.leadId, params.data.id))
    .orderBy(desc(notesTable.createdAt));

  const notes = rows.map(r => ({
    id: r.note.id,
    leadId: r.note.leadId,
    authorId: r.note.authorId ?? null,
    authorName: r.authorName ?? null,
    content: r.note.content,
    createdAt: r.note.createdAt.toISOString(),
  }));

  res.json(ListLeadNotesResponse.parse(notes));
});

router.post("/leads/:id/notes", async (req, res): Promise<void> => {
  const params = CreateLeadNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateLeadNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [note] = await db.insert(notesTable).values({
    leadId: params.data.id,
    authorId: parsed.data.authorId ?? null,
    content: parsed.data.content,
  }).returning();

  let authorName: string | null = null;
  if (note.authorId) {
    const [rep] = await db.select().from(repsTable).where(eq(repsTable.id, note.authorId));
    authorName = rep?.name ?? null;
  }

  res.status(201).json({
    id: note.id,
    leadId: note.leadId,
    authorId: note.authorId ?? null,
    authorName,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
  });
});

router.get("/leads/:id/tasks", async (req, res): Promise<void> => {
  const params = ListLeadTasksParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db.select({ task: tasksTable, repName: repsTable.name })
    .from(tasksTable)
    .leftJoin(repsTable, eq(tasksTable.assignedTo, repsTable.id))
    .where(eq(tasksTable.leadId, params.data.id))
    .orderBy(desc(tasksTable.createdAt));

  const tasks = rows.map(r => ({
    id: r.task.id,
    leadId: r.task.leadId ?? null,
    leadName: null,
    assignedTo: r.task.assignedTo ?? null,
    assignedToName: r.repName ?? null,
    title: r.task.title,
    description: r.task.description ?? null,
    dueDate: r.task.dueDate ?? null,
    priority: r.task.priority,
    completed: r.task.completed,
    createdAt: r.task.createdAt.toISOString(),
  }));

  res.json(ListLeadTasksResponse.parse(tasks));
});

router.get("/leads/:id/ai-insight", async (req, res): Promise<void> => {
  const params = GetLeadAiInsightParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.select({ lead: leadsTable, repName: repsTable.name })
    .from(leadsTable)
    .leftJoin(repsTable, eq(leadsTable.assignedRepId, repsTable.id))
    .where(eq(leadsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  const notes = await db.select().from(notesTable).where(eq(notesTable.leadId, params.data.id));
  const insight = await generateLeadInsight({
    businessName: row.lead.businessName,
    contactName: row.lead.contactName,
    vertical: row.lead.vertical,
    leadSource: row.lead.leadSource,
    status: row.lead.status,
    estimatedMonthlyVolume: row.lead.estimatedMonthlyVolume ? parseFloat(row.lead.estimatedMonthlyVolume) : null,
    leadScore: row.lead.leadScore,
    existingPos: row.lead.existingPos,
    processor: row.lead.processor,
    lastContactDate: row.lead.lastContactDate,
    nextFollowUpDate: row.lead.nextFollowUpDate,
    repName: row.repName ?? null,
    notes: notes.map(n => n.content),
  });

  res.json(GetLeadAiInsightResponse.parse(insight));
});

export default router;
