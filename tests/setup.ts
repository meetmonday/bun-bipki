// Sets required environment variables for tests.
// ??= ensures real values take precedence if already set.
process.env.BOT_TOKEN ??= "test";
process.env.DATABASE_URL ??= ":memory:";

import { existsSync, mkdirSync } from "node:fs";

if (!existsSync("data")) {
	mkdirSync("data", { recursive: true });
}
