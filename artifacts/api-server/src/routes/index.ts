import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import leadsRouter from "./leads";
import repsRouter from "./reps";
import tasksRouter from "./tasks";
import onboardingRouter from "./onboarding";
import dashboardRouter from "./dashboard";
import webhooksRouter from "./webhooks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(leadsRouter);
router.use(repsRouter);
router.use(tasksRouter);
router.use(onboardingRouter);
router.use(dashboardRouter);
router.use(webhooksRouter);

export default router;
