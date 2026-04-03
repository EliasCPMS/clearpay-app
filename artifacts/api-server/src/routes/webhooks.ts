/**
 * Webhook Endpoint — Placeholder
 *
 * POST /api/webhooks/events
 *
 * Receives inbound events from external systems (e.g. payment processors,
 * CRM tools, or other services). Currently a placeholder that logs the
 * event and returns 200. In production you would:
 *
 *   1. Verify the HMAC signature from the X-Webhook-Signature header
 *   2. Validate the event schema against known event types
 *   3. Enqueue the event for async processing (e.g. a job queue)
 *   4. Return 200 immediately and process asynchronously
 *
 * Supported event types (placeholder):
 *   - lead.created
 *   - lead.status_changed
 *   - task.completed
 *   - payment.processed
 *   - merchant.activated
 */

import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const KNOWN_EVENT_TYPES = [
  "lead.created",
  "lead.status_changed",
  "task.completed",
  "payment.processed",
  "merchant.activated",
] as const;

router.post("/webhooks/events", (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const eventType = req.body?.type as string | undefined;
  const payload = req.body?.payload;

  /* ------------------------------------------------------------------
   * TODO: Signature verification
   * const secret = process.env.WEBHOOK_SECRET;
   * const expectedSig = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
   * if (!timingSafeEqual(sig, expectedSig)) { res.status(401).json({ error: "Invalid signature" }); return; }
   * ------------------------------------------------------------------ */
  if (!signature) {
    logger.warn({ eventType }, "Webhook received without signature header — skipping verification in placeholder mode");
  }

  if (!eventType) {
    res.status(400).json({ error: "Missing event type" });
    return;
  }

  const isKnown = (KNOWN_EVENT_TYPES as readonly string[]).includes(eventType);

  logger.info(
    { eventType, known: isKnown, payloadKeys: payload ? Object.keys(payload) : [] },
    "Webhook event received"
  );

  /* ------------------------------------------------------------------
   * TODO: Enqueue for processing
   * await queue.enqueue({ type: eventType, payload, receivedAt: new Date() });
   * ------------------------------------------------------------------ */

  res.status(200).json({
    received: true,
    eventType,
    message: isKnown
      ? "Event accepted"
      : `Unknown event type '${eventType}' — ignored`,
  });
});

export default router;
