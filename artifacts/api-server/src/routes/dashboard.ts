import { Router, type IRouter } from "express";
import {
  GetDashboardSummaryResponse,
  GetPipelineByStatusResponse,
  GetRecentActivityResponse,
  GetRepLeaderboardResponse,
} from "@workspace/api-zod";
import { asyncRoute } from "../lib/async-route";
import {
  getDashboardSummary,
  getPipelineByStatus,
  getRecentActivity,
  getRepLeaderboard,
} from "../services/dashboard.service";

const router: IRouter = Router();

router.get("/dashboard/summary", asyncRoute(async (req, res): Promise<void> => {
  const summary = await getDashboardSummary({
    role: req.session.role,
    repId: req.session.repId,
  });
  res.json(GetDashboardSummaryResponse.parse(summary));
}));

router.get("/dashboard/pipeline-by-status", asyncRoute(async (req, res): Promise<void> => {
  const pipeline = await getPipelineByStatus({
    role: req.session.role,
    repId: req.session.repId,
  });
  res.json(GetPipelineByStatusResponse.parse(pipeline));
}));

router.get("/dashboard/recent-activity", asyncRoute(async (req, res): Promise<void> => {
  const activity = await getRecentActivity({
    role: req.session.role,
    repId: req.session.repId,
  });
  res.json(GetRecentActivityResponse.parse(activity));
}));

router.get("/dashboard/rep-leaderboard", asyncRoute(async (_req, res): Promise<void> => {
  const leaderboard = await getRepLeaderboard();
  res.json(GetRepLeaderboardResponse.parse(leaderboard));
}));

export default router;
