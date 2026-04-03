import { Router, type IRouter } from "express";
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
import { asyncRoute } from "../lib/async-route";
import {
  createLead,
  createLeadNote,
  deleteLeadById,
  getLeadAiInsightById,
  getLeadById,
  listLeadNotesByLeadId,
  listLeadTasksByLeadId,
  listLeads,
  recalculateLeadScoreById,
  updateLeadById,
} from "../services/leads.service";

const router: IRouter = Router();

function getSessionContext(req: Parameters<typeof listLeads>[1]) {
  return {
    role: req.role,
    repId: req.repId,
  };
}

router.get("/leads", asyncRoute(async (req, res): Promise<void> => {
  const query = ListLeadsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const leads = await listLeads(query.data, getSessionContext(req.session));
  res.json(ListLeadsResponse.parse(leads));
}));

router.post("/leads", asyncRoute(async (req, res): Promise<void> => {
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const lead = await createLead(parsed.data);
  res.status(201).json(GetLeadResponse.parse(lead));
}));

router.get("/leads/:id", asyncRoute(async (req, res): Promise<void> => {
  const params = GetLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const leadResult = await getLeadById(params.data.id);
  if (!leadResult) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  if (
    req.session.role === "rep" &&
    leadResult.assignedRepId !== req.session.repId
  ) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  res.json(GetLeadResponse.parse(leadResult.lead));
}));

router.patch("/leads/:id", asyncRoute(async (req, res): Promise<void> => {
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

  const result = await updateLeadById(
    params.data.id,
    parsed.data,
    getSessionContext(req.session),
  );
  if (result.kind === "not_found") {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  if (result.kind === "access_denied") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  res.json(UpdateLeadResponse.parse(result.lead));
}));

router.delete("/leads/:id", asyncRoute(async (req, res): Promise<void> => {
  const params = DeleteLeadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await deleteLeadById(params.data.id, getSessionContext(req.session));
  if (result.kind === "not_found") {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  if (result.kind === "access_denied") {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  res.sendStatus(204);
}));

router.post("/leads/:id/score", asyncRoute(async (req, res): Promise<void> => {
  const params = RecalculateLeadScoreParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const lead = await recalculateLeadScoreById(params.data.id);
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json(RecalculateLeadScoreResponse.parse(lead));
}));

router.get("/leads/:id/notes", asyncRoute(async (req, res): Promise<void> => {
  const params = ListLeadNotesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const notes = await listLeadNotesByLeadId(params.data.id);
  res.json(ListLeadNotesResponse.parse(notes));
}));

router.post("/leads/:id/notes", asyncRoute(async (req, res): Promise<void> => {
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

  const note = await createLeadNote(params.data.id, parsed.data);
  res.status(201).json(note);
}));

router.get("/leads/:id/tasks", asyncRoute(async (req, res): Promise<void> => {
  const params = ListLeadTasksParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const tasks = await listLeadTasksByLeadId(params.data.id);
  res.json(ListLeadTasksResponse.parse(tasks));
}));

router.get("/leads/:id/ai-insight", asyncRoute(async (req, res): Promise<void> => {
  const params = GetLeadAiInsightParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const insight = await getLeadAiInsightById(params.data.id);
  if (!insight) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json(GetLeadAiInsightResponse.parse(insight));
}));

export default router;
