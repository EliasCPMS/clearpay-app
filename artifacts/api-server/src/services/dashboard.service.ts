import { desc, eq } from "drizzle-orm";
import { db, leadsTable, notesTable, repsTable, tasksTable } from "@workspace/db";
import type { SessionAccessContext } from "./session-context";

const PIPELINE_STATUSES = [
  "New",
  "Verified",
  "Contacted",
  "Replied",
  "Qualified",
  "Meeting Booked",
  "Proposal Sent",
  "Closed Won",
  "Closed Lost",
  "Onboarding",
] as const;

export async function getDashboardSummary(context: SessionAccessContext) {
  let allLeads = await db.select().from(leadsTable);
  // Preserve current behavior: reps only see their assigned leads.
  if (context.role === "rep") {
    allLeads = allLeads.filter((lead) => lead.assignedRepId === context.repId);
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalLeads = allLeads.length;
  const newLeadsThisMonth = allLeads.filter(
    (lead) => new Date(lead.createdAt) >= startOfMonth,
  ).length;
  const closedWonThisMonth = allLeads.filter(
    (lead) =>
      lead.status === "Closed Won" && new Date(lead.updatedAt) >= startOfMonth,
  ).length;

  const totalPipelineValue = allLeads
    .filter((lead) => !["Closed Won", "Closed Lost"].includes(lead.status))
    .reduce(
      (sum, lead) =>
        sum +
        (lead.estimatedMonthlyVolume != null
          ? Number.parseFloat(lead.estimatedMonthlyVolume as string)
          : 0),
      0,
    );

  const closedLeads = allLeads.filter((lead) =>
    ["Closed Won", "Closed Lost"].includes(lead.status),
  );
  const winRate =
    closedLeads.length > 0
      ? Math.round(
          (closedLeads.filter((lead) => lead.status === "Closed Won").length /
            closedLeads.length) *
            100,
        ) / 100
      : 0;

  const today = new Date().toISOString().split("T")[0]!;
  let tasksDueToday = await db.select().from(tasksTable).where(eq(tasksTable.dueDate, today));
  if (context.role === "rep") {
    tasksDueToday = tasksDueToday.filter((task) => task.assignedTo === context.repId);
  }

  const avgLeadScore =
    totalLeads > 0
      ? Math.round(allLeads.reduce((sum, lead) => sum + lead.leadScore, 0) / totalLeads)
      : 0;

  return {
    totalLeads,
    newLeadsThisMonth,
    closedWonThisMonth,
    totalPipelineValue,
    winRate,
    tasksDueToday: tasksDueToday.filter((task) => !task.completed).length,
    avgLeadScore,
  };
}

export async function getPipelineByStatus(context: SessionAccessContext) {
  let leads = await db.select().from(leadsTable);
  if (context.role === "rep") {
    leads = leads.filter((lead) => lead.assignedRepId === context.repId);
  }

  return PIPELINE_STATUSES.map((status) => {
    const statusLeads = leads.filter((lead) => lead.status === status);
    return {
      status,
      count: statusLeads.length,
      totalVolume: statusLeads.reduce(
        (sum, lead) =>
          sum +
          (lead.estimatedMonthlyVolume != null
            ? Number.parseFloat(lead.estimatedMonthlyVolume as string)
            : 0),
        0,
      ),
    };
  });
}

export async function getRecentActivity(context: SessionAccessContext) {
  const isRep = context.role === "rep";
  const repId = context.repId;

  const leadsQuery = db
    .select({ lead: leadsTable, repName: repsTable.name })
    .from(leadsTable)
    .leftJoin(repsTable, eq(leadsTable.assignedRepId, repsTable.id))
    .orderBy(desc(leadsTable.updatedAt))
    .limit(isRep ? 20 : 5);

  const notesQuery = db
    .select({ note: notesTable, lead: leadsTable, repName: repsTable.name })
    .from(notesTable)
    .leftJoin(leadsTable, eq(notesTable.leadId, leadsTable.id))
    .leftJoin(repsTable, eq(notesTable.authorId, repsTable.id))
    .orderBy(desc(notesTable.createdAt))
    .limit(isRep ? 20 : 5);

  const tasksQuery = db
    .select({ task: tasksTable, lead: leadsTable, repName: repsTable.name })
    .from(tasksTable)
    .leftJoin(leadsTable, eq(tasksTable.leadId, leadsTable.id))
    .leftJoin(repsTable, eq(tasksTable.assignedTo, repsTable.id))
    .orderBy(desc(tasksTable.createdAt))
    .limit(isRep ? 20 : 5);

  const [allLeads, allNotes, allTasks] = await Promise.all([
    leadsQuery,
    notesQuery,
    tasksQuery,
  ]);

  const recentLeads = isRep
    ? allLeads.filter((row) => row.lead.assignedRepId === repId).slice(0, 5)
    : allLeads;
  const recentNotes = isRep
    ? allNotes.filter((row) => row.note.authorId === repId).slice(0, 5)
    : allNotes;
  const recentTasks = isRep
    ? allTasks.filter((row) => row.task.assignedTo === repId).slice(0, 5)
    : allTasks;

  const activities: Array<{
    id: string;
    type: string;
    description: string;
    leadId: number | null;
    leadName: string | null;
    repName: string | null;
    createdAt: string;
  }> = [];

  for (const row of recentLeads) {
    activities.push({
      id: `lead-${row.lead.id}-${row.lead.updatedAt.toISOString()}`,
      type: "lead_updated",
      description: `Lead "${row.lead.businessName}" moved to ${row.lead.status}`,
      leadId: row.lead.id,
      leadName: row.lead.businessName,
      repName: row.repName ?? null,
      createdAt: row.lead.updatedAt.toISOString(),
    });
  }

  for (const row of recentNotes) {
    activities.push({
      id: `note-${row.note.id}`,
      type: "note_added",
      description: `Note added on "${row.lead?.businessName ?? "a lead"}"`,
      leadId: row.note.leadId,
      leadName: row.lead?.businessName ?? null,
      repName: row.repName ?? null,
      createdAt: row.note.createdAt.toISOString(),
    });
  }

  for (const row of recentTasks) {
    if (row.task.completed) {
      activities.push({
        id: `task-${row.task.id}`,
        type: "task_completed",
        description: `Task "${row.task.title}" completed`,
        leadId: row.task.leadId ?? null,
        leadName: row.lead?.businessName ?? null,
        repName: row.repName ?? null,
        createdAt: row.task.updatedAt.toISOString(),
      });
    }
  }

  activities.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return activities.slice(0, 10);
}

export async function getRepLeaderboard() {
  const reps = await db.select().from(repsTable);
  const leads = await db.select().from(leadsTable);

  return reps
    .map((rep) => {
      const repLeads = leads.filter((lead) => lead.assignedRepId === rep.id);
      const closedWon = repLeads.filter((lead) => lead.status === "Closed Won").length;
      const closed = repLeads.filter((lead) =>
        ["Closed Won", "Closed Lost"].includes(lead.status),
      ).length;
      const conversionRate =
        closed > 0 ? Math.round((closedWon / closed) * 100) / 100 : 0;
      const totalVolume = repLeads.reduce(
        (sum, lead) =>
          sum +
          (lead.estimatedMonthlyVolume != null
            ? Number.parseFloat(lead.estimatedMonthlyVolume as string)
            : 0),
        0,
      );

      return {
        repId: rep.id,
        repName: rep.name,
        totalLeads: repLeads.length,
        closedWon,
        conversionRate,
        totalVolume,
      };
    })
    .sort((a, b) => b.closedWon - a.closedWon);
}
