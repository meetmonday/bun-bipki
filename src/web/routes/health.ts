import { sql } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { tunnelManager } from "../../services/tunnel.ts";
import { json } from "../middleware.ts";
import type { RouteDef } from "../router.ts";

export const healthRoute: RouteDef = {
	method: "GET",
	pattern: "/api/health",
	handler: async () => {
		const checks: Record<string, string | boolean> = {};

		// DB check
		try {
			await db.get(sql`SELECT 1 as ok`);
			checks.database = true;
		} catch {
			checks.database = "unreachable";
		}

		// Tunnel check
		const tunnel = tunnelManager.getInfo();
		checks.tunnel = tunnel.status;

		// Overall status
		const healthy = checks.database === true;
		const status = healthy ? "ok" : "degraded";

		return json(
			{
				status,
				uptime: process.uptime(),
				timestamp: new Date().toISOString(),
				checks,
			},
			healthy ? 200 : 503,
		);
	},
};
