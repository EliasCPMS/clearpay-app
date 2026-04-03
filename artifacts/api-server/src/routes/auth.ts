import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, repsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 */
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const rep = await db.query.repsTable.findFirst({
    where: eq(repsTable.email, email.toLowerCase().trim()),
  });

  if (!rep) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (!rep.passwordHash) {
    res.status(401).json({ error: "Account not configured for login" });
    return;
  }

  const valid = await bcrypt.compare(password, rep.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  req.session.repId = rep.id;
  req.session.role = rep.role;
  req.session.name = rep.name;

  res.json({
    id: rep.id,
    name: rep.name,
    email: rep.email,
    role: rep.role,
    avatarUrl: rep.avatarUrl,
  });
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user.
 */
router.get("/auth/me", requireAuth, async (req, res) => {
  const rep = await db.query.repsTable.findFirst({
    where: eq(repsTable.id, req.session.repId!),
  });

  if (!rep) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Session invalid" });
    return;
  }

  res.json({
    id: rep.id,
    name: rep.name,
    email: rep.email,
    role: rep.role,
    avatarUrl: rep.avatarUrl,
  });
});

/**
 * POST /api/auth/logout
 * Destroys the session.
 */
router.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Failed to logout" });
      return;
    }
    res.clearCookie("clearpay_sid");
    res.json({ ok: true });
  });
});

export default router;
