import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, tasksTable, repsTable, leadsTable } from "@workspace/db";
import {
  ListTasksQueryParams,
  ListTasksResponse,
  CreateTaskBody,
  UpdateTaskParams,
  UpdateTaskBody,
  UpdateTaskResponse,
  DeleteTaskParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tasks", async (req, res): Promise<void> => {
  // Parse boolean query params from raw strings before schema validation
  // zod.coerce.boolean("false") returns true (string is truthy), so we convert manually
  const rawQuery = { ...req.query };
  if (rawQuery.completed === "false") rawQuery.completed = "" as unknown as string;
  else if (rawQuery.completed === "true") rawQuery.completed = "1" as unknown as string;
  if (rawQuery.dueToday === "false") delete rawQuery.dueToday;
  if (rawQuery.dueToday === "true") rawQuery.dueToday = "1" as unknown as string;

  const query = ListTasksQueryParams.safeParse(rawQuery);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { assignedTo, priority, dueToday } = query.data;
  // Re-parse completed directly from the original query
  let completed: boolean | undefined = undefined;
  if (req.query.completed === "true") completed = true;
  else if (req.query.completed === "false") completed = false;

  const conditions = [];
  // Reps can only see tasks assigned to them; admins can filter by any rep
  if (req.session.role === "rep") {
    conditions.push(eq(tasksTable.assignedTo, req.session.repId!));
  } else if (assignedTo != null) {
    conditions.push(eq(tasksTable.assignedTo, assignedTo));
  }
  if (completed != null) conditions.push(eq(tasksTable.completed, completed));
  if (priority) conditions.push(eq(tasksTable.priority, priority));
  if (dueToday) {
    const today = new Date().toISOString().split("T")[0]!;
    conditions.push(eq(tasksTable.dueDate, today));
  }

  const baseQuery = db.select({
    task: tasksTable,
    repName: repsTable.name,
    leadName: leadsTable.businessName,
  })
    .from(tasksTable)
    .leftJoin(repsTable, eq(tasksTable.assignedTo, repsTable.id))
    .leftJoin(leadsTable, eq(tasksTable.leadId, leadsTable.id))
    .orderBy(desc(tasksTable.createdAt));

  const rows = conditions.length > 0
    ? await baseQuery.where(and(...conditions))
    : await baseQuery;

  const tasks = rows.map(r => ({
    id: r.task.id,
    leadId: r.task.leadId ?? null,
    leadName: r.leadName ?? null,
    assignedTo: r.task.assignedTo ?? null,
    assignedToName: r.repName ?? null,
    title: r.task.title,
    description: r.task.description ?? null,
    dueDate: r.task.dueDate ?? null,
    priority: r.task.priority,
    completed: r.task.completed,
    createdAt: r.task.createdAt.toISOString(),
  }));

  res.json(ListTasksResponse.parse(tasks));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db.insert(tasksTable).values({
    leadId: parsed.data.leadId ?? null,
    assignedTo: parsed.data.assignedTo ?? null,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    dueDate: parsed.data.dueDate ?? null,
    priority: parsed.data.priority ?? "medium",
  }).returning();

  let repName: string | null = null;
  if (task.assignedTo) {
    const [rep] = await db.select().from(repsTable).where(eq(repsTable.id, task.assignedTo));
    repName = rep?.name ?? null;
  }

  let leadName: string | null = null;
  if (task.leadId) {
    const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, task.leadId));
    leadName = lead?.businessName ?? null;
  }

  res.status(201).json({
    id: task.id,
    leadId: task.leadId ?? null,
    leadName,
    assignedTo: task.assignedTo ?? null,
    assignedToName: repName,
    title: task.title,
    description: task.description ?? null,
    dueDate: task.dueDate ?? null,
    priority: task.priority,
    completed: task.completed,
    createdAt: task.createdAt.toISOString(),
  });
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db.update(tasksTable).set(parsed.data).where(eq(tasksTable.id, params.data.id)).returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  let repName: string | null = null;
  if (task.assignedTo) {
    const [rep] = await db.select().from(repsTable).where(eq(repsTable.id, task.assignedTo));
    repName = rep?.name ?? null;
  }

  let leadName: string | null = null;
  if (task.leadId) {
    const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, task.leadId));
    leadName = lead?.businessName ?? null;
  }

  res.json(UpdateTaskResponse.parse({
    id: task.id,
    leadId: task.leadId ?? null,
    leadName,
    assignedTo: task.assignedTo ?? null,
    assignedToName: repName,
    title: task.title,
    description: task.description ?? null,
    dueDate: task.dueDate ?? null,
    priority: task.priority,
    completed: task.completed,
    createdAt: task.createdAt.toISOString(),
  }));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id)).returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
