import { Router, type IRouter } from "express";
import { eq, desc, count, and, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, repsTable, leadsTable } from "@workspace/db";
import {
  ListRepsResponse,
  CreateRepBody,
  GetRepParams,
  GetRepResponse,
  UpdateRepParams,
  UpdateRepBody,
  UpdateRepResponse,
  DeleteRepParams,
  GetRepStatsParams,
  GetRepStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatRep(rep: typeof repsTable.$inferSelect) {
  return {
    id: rep.id,
    name: rep.name,
    email: rep.email,
    role: rep.role,
    avatarUrl: rep.avatarUrl ?? null,
    createdAt: rep.createdAt.toISOString(),
  };
}

router.get("/reps", async (_req, res): Promise<void> => {
  const reps = await db.select().from(repsTable).orderBy(repsTable.name);
  res.json(ListRepsResponse.parse(reps.map(formatRep)));
});

router.post("/reps", async (req, res): Promise<void> => {
  const parsed = CreateRepBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const rawPassword: string | undefined = typeof req.body.password === "string" ? req.body.password : undefined;
  if (rawPassword && rawPassword.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  let passwordHash: string | null = null;
  if (rawPassword) {
    passwordHash = await bcrypt.hash(rawPassword, 10);
  }

  const [rep] = await db.insert(repsTable).values({
    name: parsed.data.name,
    email: parsed.data.email,
    role: parsed.data.role ?? "rep",
    avatarUrl: parsed.data.avatarUrl ?? null,
    passwordHash,
  }).returning();

  res.status(201).json(GetRepResponse.parse(formatRep(rep)));
});

router.get("/reps/:id", async (req, res): Promise<void> => {
  const params = GetRepParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [rep] = await db.select().from(repsTable).where(eq(repsTable.id, params.data.id));
  if (!rep) {
    res.status(404).json({ error: "Rep not found" });
    return;
  }

  res.json(GetRepResponse.parse(formatRep(rep)));
});

router.patch("/reps/:id", async (req, res): Promise<void> => {
  const params = UpdateRepParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateRepBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [rep] = await db.update(repsTable).set(parsed.data).where(eq(repsTable.id, params.data.id)).returning();
  if (!rep) {
    res.status(404).json({ error: "Rep not found" });
    return;
  }

  res.json(UpdateRepResponse.parse(formatRep(rep)));
});

router.delete("/reps/:id", async (req, res): Promise<void> => {
  const params = DeleteRepParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [rep] = await db.delete(repsTable).where(eq(repsTable.id, params.data.id)).returning();
  if (!rep) {
    res.status(404).json({ error: "Rep not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/reps/:id/stats", async (req, res): Promise<void> => {
  const params = GetRepStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const leads = await db.select().from(leadsTable).where(eq(leadsTable.assignedRepId, params.data.id));

  const totalLeads = leads.length;
  const closedWon = leads.filter(l => l.status === "Closed Won").length;
  const closedLost = leads.filter(l => l.status === "Closed Lost").length;
  const inPipeline = leads.filter(l => !["Closed Won", "Closed Lost"].includes(l.status)).length;
  const closed = closedWon + closedLost;
  const conversionRate = closed > 0 ? Math.round((closedWon / closed) * 100) / 100 : 0;
  const totalVolume = leads.reduce((sum, l) => sum + (l.estimatedMonthlyVolume != null ? parseFloat(l.estimatedMonthlyVolume as string) : 0), 0);

  const stats = {
    repId: params.data.id,
    totalLeads,
    closedWon,
    closedLost,
    inPipeline,
    conversionRate,
    totalVolume,
  };

  res.json(GetRepStatsResponse.parse(stats));
});

export default router;
