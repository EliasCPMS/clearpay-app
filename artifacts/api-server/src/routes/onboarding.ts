import { Router, type IRouter } from "express";
import {
  ListOnboardingResponse,
  CreateOnboardingBody,
  UpdateOnboardingParams,
  UpdateOnboardingBody,
  UpdateOnboardingResponse,
} from "@workspace/api-zod";
import { asyncRoute } from "../lib/async-route";
import {
  createOnboarding,
  listOnboarding,
  updateOnboardingById,
} from "../services/onboarding.service";

const router: IRouter = Router();

router.get("/onboarding", asyncRoute(async (req, res): Promise<void> => {
  const records = await listOnboarding({
    role: req.session.role,
    repId: req.session.repId,
  });
  res.json(ListOnboardingResponse.parse(records));
}));

router.post("/onboarding", asyncRoute(async (req, res): Promise<void> => {
  const parsed = CreateOnboardingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const record = await createOnboarding(parsed.data);
  res.status(201).json(record);
}));

router.patch("/onboarding/:id", asyncRoute(async (req, res): Promise<void> => {
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

  const record = await updateOnboardingById(params.data.id, parsed.data);
  if (!record) {
    res.status(404).json({ error: "Onboarding record not found" });
    return;
  }

  res.json(UpdateOnboardingResponse.parse(record));
}));

export default router;
