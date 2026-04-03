import { config as loadDotenv } from "dotenv";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, repsTable } from "@workspace/db";
import app from "./app";
import { logger } from "./lib/logger";

// Load monorepo root .env for local development.
loadDotenv({ path: new URL("../../../.env", import.meta.url).pathname });

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function seedAdminIfNeeded() {
  try {
    const existing = await db.query.repsTable.findFirst({
      where: eq(repsTable.role, "admin"),
    });
    if (existing) return;

    const adminEmail = process.env.ADMIN_EMAIL ?? "elias@clearpaymerchants.com";
    const adminPassword = process.env.ADMIN_PASSWORD ?? "admin@clearpay";
    const adminName = process.env.ADMIN_NAME ?? "Elias Antoniou";

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await db.insert(repsTable).values({
      name: adminName,
      email: adminEmail.toLowerCase().trim(),
      passwordHash,
      role: "admin",
    });
    logger.info({ email: adminEmail }, "Admin account seeded");
  } catch (err) {
    logger.error({ err }, "Failed to seed admin account");
  }
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  await seedAdminIfNeeded();
});
