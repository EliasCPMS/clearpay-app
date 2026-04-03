import { Router, type IRouter } from "express";
import { eq, desc, gte, sql } from "drizzle-orm";
import { db, leadsTable, tasksTable, repsTable, notesTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetPipelineByStatusResponse,
  GetRecentActivityResponse,
  GetRepLeaderboardResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  let allLeads = await db.select().from(leadsTable);
  // Reps see stats for their own leads only
  if (req.session.role === "rep") {
    allLeads = allLeads.filter(l => l.assignedRepId === req.session.repId);
  }
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalLeads = allLeads.length;
  const newLeadsThisMonth = allLeads.filter(l => new Date(l.createdAt) >= startOfMonth).length;
  const closedWonThisMonth = allLeads.filter(l =>
    l.status === "Closed Won" && new Date(l.updatedAt) >= startOfMonth
  ).length;

  const totalPipelineValue = allLeads
    .filter(l => !["Closed Won", "Closed Lost"].includes(l.status))
    .reduce((sum, l) => sum + (l.estimatedMonthlyVolume != null ? parseFloat(l.estimatedMonthlyVolume as string) : 0), 0);

  const closed = allLeads.filter(l => ["Closed Won", "Closed Lost"].includes(l.status));
  const winRate = closed.length > 0
    ? Math.round((closed.filter(l => l.status === "Closed Won").length / closed.length) * 100) / 100
    : 0;

  const today = new Date().toISOString().split("T")[0]!;
  let tasksDueToday = await db.select().from(tasksTable)
    .where(eq(tasksTable.dueDate, today));
  if (req.session.role === "rep") {
    tasksDueToday = tasksDueToday.filter(t => t.assignedTo === req.session.repId);
  }

  const avgLeadScore = totalLeads > 0
    ? Math.round(allLeads.reduce((sum, l) => sum + l.leadScore, 0) / totalLeads)
    : 0;

  res.json(GetDashboardSummaryResponse.parse({
    totalLeads,
    newLeadsThisMonth,
    closedWonThisMonth,
    totalPipelineValue,
    winRate,
    tasksDueToday: tasksDueToday.filter(t => !t.completed).length,
    avgLeadScore,
  }));
});

router.get("/dashboard/pipeline-by-status", async (req, res): Promise<void> => {
  let leads = await db.select().from(leadsTable);
  if (req.session.role === "rep") {
    leads = leads.filter(l => l.assignedRepId === req.session.repId);
  }
  const statuses = ["New", "Verified", "Contacted", "Replied", "Qualified", "Meeting Booked", "Proposal Sent", "Closed Won", "Closed Lost", "Onboarding"];

  const grouped = statuses.map(status => {
    const statusLeads = leads.filter(l => l.status === status);
    return {
      status,
      count: statusLeads.length,
      totalVolume: statusLeads.reduce((sum, l) => sum + (l.estimatedMonthlyVolume != null ? parseFloat(l.estimatedMonthlyVolume as string) : 0), 0),
    };
  });

  res.json(GetPipelineByStatusResponse.parse(grouped));
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const isRep = req.session.role === "rep";
  const repId = req.session.repId;

  const leadsQuery = db.select({ lead: leadsTable, repName: repsTable.name })
    .from(leadsTable)
    .leftJoin(repsTable, eq(leadsTable.assignedRepId, repsTable.id))
    .orderBy(desc(leadsTable.updatedAt))
    .limit(isRep ? 20 : 5);

  const notesQuery = db.select({ note: notesTable, lead: leadsTable, repName: repsTable.name })
    .from(notesTable)
    .leftJoin(leadsTable, eq(notesTable.leadId, leadsTable.id))
    .leftJoin(repsTable, eq(notesTable.authorId, repsTable.id))
    .orderBy(desc(notesTable.createdAt))
    .limit(isRep ? 20 : 5);

  const tasksQuery = db.select({ task: tasksTable, lead: leadsTable, repName: repsTable.name })
    .from(tasksTable)
    .leftJoin(leadsTable, eq(tasksTable.leadId, leadsTable.id))
    .leftJoin(repsTable, eq(tasksTable.assignedTo, repsTable.id))
    .orderBy(desc(tasksTable.createdAt))
    .limit(isRep ? 20 : 5);

  const [allLeads, allNotes, allTasks] = await Promise.all([leadsQuery, notesQuery, tasksQuery]);

  const recentLeads = isRep ? allLeads.filter(r => r.lead.assignedRepId === repId).slice(0, 5) : allLeads;
  const recentNotes = isRep ? allNotes.filter(r => r.note.authorId === repId).slice(0, 5) : allNotes;
  const recentTasks = isRep ? allTasks.filter(r => r.task.assignedTo === repId).slice(0, 5) : allTasks;

  const activities: Array<{
    id: string;
    type: string;
    description: string;
    leadId: number | null;
    leadName: string | null;
    repName: string | null;
    createdAt: string;
  }> = [];

  for (const r of recentLeads) {
    activities.push({
      id: `lead-${r.lead.id}-${r.lead.updatedAt.toISOString()}`,
      type: "lead_updated",
      description: `Lead "${r.lead.businessName}" moved to ${r.lead.status}`,
      leadId: r.lead.id,
      leadName: r.lead.businessName,
      repName: r.repName ?? null,
      createdAt: r.lead.updatedAt.toISOString(),
    });
  }

  for (const r of recentNotes) {
    activities.push({
      id: `note-${r.note.id}`,
      type: "note_added",
      description: `Note added on "${r.lead?.businessName ?? "a lead"}"`,
      leadId: r.note.leadId,
      leadName: r.lead?.businessName ?? null,
      repName: r.repName ?? null,
      createdAt: r.note.createdAt.toISOString(),
    });
  }

  for (const r of recentTasks) {
    if (r.task.completed) {
      activities.push({
        id: `task-${r.task.id}`,
        type: "task_completed",
        description: `Task "${r.task.title}" completed`,
        leadId: r.task.leadId ?? null,
        leadName: r.lead?.businessName ?? null,
        repName: r.repName ?? null,
        createdAt: r.task.updatedAt.toISOString(),
      });
    }
  }

  activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(GetRecentActivityResponse.parse(activities.slice(0, 10)));
});

router.get("/dashboard/rep-leaderboard", async (_req, res): Promise<void> => {
  const reps = await db.select().from(repsTable);
  const leads = await db.select().from(leadsTable);

  const leaderboard = reps.map(rep => {
    const repLeads = leads.filter(l => l.assignedRepId === rep.id);
    const closedWon = repLeads.filter(l => l.status === "Closed Won").length;
    const closed = repLeads.filter(l => ["Closed Won", "Closed Lost"].includes(l.status)).length;
    const conversionRate = closed > 0 ? Math.round((closedWon / closed) * 100) / 100 : 0;
    const totalVolume = repLeads.reduce((sum, l) => sum + (l.estimatedMonthlyVolume != null ? parseFloat(l.estimatedMonthlyVolume as string) : 0), 0);

    return {
      repId: rep.id,
      repName: rep.name,
      totalLeads: repLeads.length,
      closedWon,
      conversionRate,
      totalVolume,
    };
  }).sort((a, b) => b.closedWon - a.closedWon);

  res.json(GetRepLeaderboardResponse.parse(leaderboard));
});

export default router;
