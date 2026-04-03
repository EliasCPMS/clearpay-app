import { config as loadDotenv } from "dotenv";
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

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
