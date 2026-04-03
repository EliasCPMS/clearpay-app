import { Router, type IRouter } from "express";
import {
  ListTasksQueryParams,
  ListTasksResponse,
  CreateTaskBody,
  UpdateTaskParams,
  UpdateTaskBody,
  UpdateTaskResponse,
  DeleteTaskParams,
} from "@workspace/api-zod";
import { asyncRoute } from "../lib/async-route";
import {
  createTask,
  deleteTaskById,
  listTasks,
  normalizeTaskListQuery,
  parseCompletedFilter,
  updateTaskById,
} from "../services/tasks.service";

const router: IRouter = Router();

router.get("/tasks", asyncRoute(async (req, res): Promise<void> => {
  const normalizedQuery = normalizeTaskListQuery(req.query as Record<string, unknown>);
  const query = ListTasksQueryParams.safeParse(normalizedQuery);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const completed = parseCompletedFilter(req.query as Record<string, unknown>);
  const tasks = await listTasks(query.data, completed, {
    role: req.session.role,
    repId: req.session.repId,
  });

  res.json(ListTasksResponse.parse(tasks));
}));

router.post("/tasks", asyncRoute(async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const task = await createTask(parsed.data);
  res.status(201).json(UpdateTaskResponse.parse(task));
}));

router.patch("/tasks/:id", asyncRoute(async (req, res): Promise<void> => {
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

  const task = await updateTaskById(params.data.id, parsed.data);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(UpdateTaskResponse.parse(task));
}));

router.delete("/tasks/:id", asyncRoute(async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const task = await deleteTaskById(params.data.id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.sendStatus(204);
}));

export default router;
