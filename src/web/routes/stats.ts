import { desc, sql } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { transactionsTable, usersTable } from "../../db/schema.ts";
import { tunnelManager } from "../../services/tunnel.ts";
import { json } from "../middleware.ts";
import type { RouteDef } from "../router.ts";

export const statsRoute: RouteDef = {
	method: "GET",
	pattern: "/api/stats",
	handler: async () => {
		const userCount = await db.$count(usersTable);

		const totals = await db
			.select({
				totalBipki: sql`COALESCE(SUM(${usersTable.bipki}), 0)`,
				totalMegabipki: sql`COALESCE(SUM(${usersTable.megabipki}), 0)`,
			})
			.from(usersTable)
			.get();

		const today = new Date().toISOString().slice(0, 10);
		const txToday = await db.$count(
			transactionsTable,
			sql`${transactionsTable.createdAt} >= ${today}`,
		);

		const topUsers = await db
			.select({
				id: usersTable.id,
				name: usersTable.name,
				username: usersTable.username,
				bipki: usersTable.bipki,
				megabipki: usersTable.megabipki,
			})
			.from(usersTable)
			.orderBy(desc(usersTable.bipki))
			.limit(10)
			.all();

		return json({
			users: { total: userCount },
			economy: {
				totalBipki: Number(totals?.totalBipki ?? 0),
				totalMegabipki: Number(totals?.totalMegabipki ?? 0),
			},
			transactions: { today: txToday },
			topUsers,
			tunnel: tunnelManager.getInfo(),
		});
	},
};
