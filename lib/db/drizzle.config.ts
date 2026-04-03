import { defineConfig } from "drizzle-kit";
import { config as loadDotenv } from "dotenv";
import path from "path";

// Load monorepo root .env for local development.
loadDotenv({ path: path.resolve(__dirname, "../../.env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
