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
