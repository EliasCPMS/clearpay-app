import { timingSafeEqual } from "crypto";
import { type RequestHandler } from "express";

export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.session.repId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.session.repId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.session.role !== "admin") {
    res.status(403).json({ error: "Forbidden: admin role required" });
    return;
  }
  next();
};

export const requireAuthOrApiKey: RequestHandler = (req, res, next) => {
  const authHeader = req.headers["authorization"] ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const expected = process.env.CRM_IMPORT_API_KEY ?? "";

    if (expected.length > 0 && token.length === expected.length) {
      try {
        const match = timingSafeEqual(
          Buffer.from(token, "utf8"),
          Buffer.from(expected, "utf8"),
        );
        if (match) {
          next();
          return;
        }
      } catch {
        // length mismatch guard — fall through to session check
      }
    }

    res.status(401).json({ error: "Invalid or missing API key" });
    return;
  }

  if (!req.session.repId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};
