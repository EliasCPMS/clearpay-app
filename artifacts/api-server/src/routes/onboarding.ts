import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, onboardingTable, leadsTable } from "@workspace/db";
import {
  ListOnboardingResponse,
  CreateOnboardingBody,
  UpdateOnboardingParams,
  UpdateOnboardingBody,
  UpdateOnboardingResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatOnboarding(r: typeof onboardingTable.$inferSelect) {
  return {
    id: r.id,
    leadId: r.leadId,
    merchantName: r.merchantName,
    applicationSubmitted: r.applicationSubmitted,
    underwritingApproved: r.underwritingApproved,
    equipmentShipped: r.equipmentShipped,
    accountActivated: r.accountActivated,
    trainingCompleted: r.trainingCompleted,
    notes: r.notes ?? null,
    completedAt: r.completedAt ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

router.get("/onboarding", async (req, res): Promise<void> => {
  if (req.session.role === "rep") {
    // Reps only see onboarding records for their own assigned leads
    const rows = await db.select({ onboarding: onboardingTable })
      .from(onboardingTable)
      .leftJoin(leadsTable, eq(onboardingTable.leadId, leadsTable.id))
      .where(eq(leadsTable.assignedRepId, req.session.repId!))
      .orderBy(desc(onboardingTable.createdAt));
    res.json(ListOnboardingResponse.parse(rows.map(r => formatOnboarding(r.onboarding))));
  } else {
    const records = await db.select().from(onboardingTable).orderBy(desc(onboardingTable.createdAt));
    res.json(ListOnboardingResponse.parse(records.map(formatOnboarding)));
  }
});

router.post("/onboarding", async (req, res): Promise<void> => {
  const parsed = CreateOnboardingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [record] = await db.insert(onboardingTable).values({
    leadId: parsed.data.leadId,
    merchantName: parsed.data.merchantName,
    notes: parsed.data.notes ?? null,
  }).returning();

  res.status(201).json(formatOnboarding(record));
});

router.patch("/onboarding/:id", async (req, res): Promise<void> => {
  const params = UpdateOnboardingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOnboardingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [record] = await db.update(onboardingTable)
    .set(parsed.data)
    .where(eq(onboardingTable.id, params.data.id))
    .returning();

  if (!record) {
    res.status(404).json({ error: "Onboarding record not found" });
    return;
  }

  res.json(UpdateOnboardingResponse.parse(formatOnboarding(record)));
});

export default router;
