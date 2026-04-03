import { and, desc, eq, type SQL } from "drizzle-orm";
import { db, leadsTable, repsTable, tasksTable } from "@workspace/db";
import type { CreateTaskBody, ListTasksParams, UpdateTaskBody } from "@workspace/api-zod";
import type { SessionAccessContext } from "./session-context";

function toTaskResponse(
  task: typeof tasksTable.$inferSelect,
  repName?: string | null,
  leadName?: string | null,
) {
  return {
    id: task.id,
    leadId: task.leadId ?? null,
    leadName: leadName ?? null,
    assignedTo: task.assignedTo ?? null,
    assignedToName: repName ?? null,
    title: task.title,
    description: task.description ?? null,
    dueDate: task.dueDate ?? null,
    priority: task.priority,
    completed: task.completed,
    createdAt: task.createdAt.toISOString(),
  };
}

export function normalizeTaskListQuery(rawQuery: Record<string, unknown>) {
  const normalizedQuery = { ...rawQuery };
  // Preserve existing boolean parsing semantics from route layer.
  if (normalizedQuery.completed === "false") normalizedQuery.completed = "" as unknown as string;
  else if (normalizedQuery.completed === "true") normalizedQuery.completed = "1" as unknown as string;
  if (normalizedQuery.dueToday === "false") delete normalizedQuery.dueToday;
  if (normalizedQuery.dueToday === "true") normalizedQuery.dueToday = "1" as unknown as string;
  return normalizedQuery;
}

export function parseCompletedFilter(rawQuery: Record<string, unknown>): boolean | undefined {
  if (rawQuery.completed === "true") return true;
  if (rawQuery.completed === "false") return false;
  return undefined;
}

export async function listTasks(
  filters: ListTasksParams,
  completed: boolean | undefined,
  context: SessionAccessContext,
) {
  const conditions: SQL[] = [];

  // Preserve current behavior: reps are restricted to tasks assigned to themselves.
  if (context.role === "rep") {
    conditions.push(eq(tasksTable.assignedTo, context.repId!));
  } else if (filters.assignedTo != null) {
    conditions.push(eq(tasksTable.assignedTo, filters.assignedTo));
  }

  if (completed != null) conditions.push(eq(tasksTable.completed, completed));
  if (filters.priority) conditions.push(eq(tasksTable.priority, filters.priority));
  if (filters.dueToday) {
    const today = new Date().toISOString().split("T")[0]!;
    conditions.push(eq(tasksTable.dueDate, today));
  }

  const baseQuery = db
    .select({
      task: tasksTable,
      repName: repsTable.name,
      leadName: leadsTable.businessName,
    })
    .from(tasksTable)
    .leftJoin(repsTable, eq(tasksTable.assignedTo, repsTable.id))
    .leftJoin(leadsTable, eq(tasksTable.leadId, leadsTable.id))
    .orderBy(desc(tasksTable.createdAt));

  const rows =
    conditions.length > 0
      ? await baseQuery.where(and(...conditions))
      : await baseQuery;

  return rows.map((row) => toTaskResponse(row.task, row.repName, row.leadName));
}

export async function createTask(data: CreateTaskBody) {
  const [task] = await db
    .insert(tasksTable)
    .values({
      leadId: data.leadId ?? null,
      assignedTo: data.assignedTo ?? null,
      title: data.title,
      description: data.description ?? null,
      dueDate: data.dueDate ?? null,
      priority: data.priority ?? "medium",
    })
    .returning();

  let repName: string | null = null;
  if (task.assignedTo) {
    const [rep] = await db
      .select()
      .from(repsTable)
      .where(eq(repsTable.id, task.assignedTo));
    repName = rep?.name ?? null;
  }

  let leadName: string | null = null;
  if (task.leadId) {
    const [lead] = await db
      .select()
      .from(leadsTable)
      .where(eq(leadsTable.id, task.leadId));
    leadName = lead?.businessName ?? null;
  }

  return toTaskResponse(task, repName, leadName);
}

export async function updateTaskById(id: number, data: UpdateTaskBody) {
  const [task] = await db
    .update(tasksTable)
    .set(data)
    .where(eq(tasksTable.id, id))
    .returning();

  if (!task) return null;

  let repName: string | null = null;
  if (task.assignedTo) {
    const [rep] = await db
      .select()
      .from(repsTable)
      .where(eq(repsTable.id, task.assignedTo));
    repName = rep?.name ?? null;
  }

  let leadName: string | null = null;
  if (task.leadId) {
    const [lead] = await db
      .select()
      .from(leadsTable)
      .where(eq(leadsTable.id, task.leadId));
    leadName = lead?.businessName ?? null;
  }

  return toTaskResponse(task, repName, leadName);
}

export async function deleteTaskById(id: number) {
  const [task] = await db
    .delete(tasksTable)
    .where(eq(tasksTable.id, id))
    .returning();
  return task ?? null;
}
