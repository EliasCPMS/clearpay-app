import { type RequestHandler } from "express";
import { logger } from "./logger";

export function asyncRoute(handler: RequestHandler): RequestHandler {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      logger.error(
        {
          err: error,
          method: req.method,
          path: req.path,
        },
        "Unhandled route error",
      );

      if (res.headersSent) {
        return;
      }

      res.status(500).json({ error: "Internal server error" });
    }
  };
}
