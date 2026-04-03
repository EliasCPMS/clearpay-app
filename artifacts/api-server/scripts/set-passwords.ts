/**
 * One-time script to hash and set passwords for all existing reps.
 *
 * Default passwords (change in production!):
 *   admin role  →  admin@clearpay (change immediately)
 *   rep role    →  rep@clearpay   (change immediately)
 *
 * Run with: npx tsx scripts/set-passwords.ts
 */

import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq } from "drizzle-orm";
import { config as loadDotenv } from "dotenv";
import * as schema from "../../../lib/db/src/schema";

const { Pool } = pg;

// Load monorepo root .env for local development.
loadDotenv({ path: new URL("../../../.env", import.meta.url).pathname });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  const reps = await db.select().from(schema.repsTable);

  for (const rep of reps) {
    const rawPassword = rep.role === "admin" ? "admin@clearpay" : "rep@clearpay";
    const passwordHash = await bcrypt.hash(rawPassword, 12);
    await db
      .update(schema.repsTable)
      .set({ passwordHash })
      .where(eq(schema.repsTable.id, rep.id));
    console.log(`  ✓ Set password for ${rep.name} (${rep.role}): ${rawPassword}`);
  }

  console.log("\nDone. Change these passwords immediately in production!");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
