import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { usersTable } from "../../db/schema.ts";
import {
	ensureUserFromInitData,
	json,
	unauthorized,
	validateInitData,
} from "../middleware.ts";
import type { RouteDef } from "../router.ts";

export const meSummaryRoute: RouteDef = {
	method: "POST",
	pattern: "/api/me/summary",
	handler: async (req) => {
		const body = (await req.json()) as { initData?: string };

		if (!body.initData) {
			return json({ error: "initData is required" }, 400);
		}

		const auth = validateInitData(body);
		if (!auth) return unauthorized("Invalid init data");

		const userId = auth.user.id;

		await ensureUserFromInitData(auth.user);

		const user = await db
			.select({
				bipki: usersTable.bipki,
				megabipki: usersTable.megabipki,
				lastDailyBonus: usersTable.lastDailyBonus,
				dailyRewardStreak: usersTable.dailyRewardStreak,
			})
			.from(usersTable)
			.where(eq(usersTable.id, userId))
			.get();

		if (!user) return json({ error: "User not found" }, 404);

		const rankResult = await db
			.select({ count: sql`COUNT(*)` })
			.from(usersTable)
			.where(sql`${usersTable.bipki} > ${user.bipki}`)
			.get();

		const rank = Number(rankResult?.count ?? 0) + 1;

		return json({ ...user, rank });
	},
};
