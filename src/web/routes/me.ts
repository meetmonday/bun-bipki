import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { usersTable } from "../../db/schema.ts";
import { DAILY_REWARDS } from "../../services/economy.ts";
import {
	ensureUserFromInitData,
	json,
	unauthorized,
	validateInitData,
} from "../middleware.ts";
import type { RouteDef } from "../router.ts";

export const meRoute: RouteDef = {
	method: "POST",
	pattern: "/api/me",
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
			.select()
			.from(usersTable)
			.where(eq(usersTable.id, userId))
			.get();

		if (!user) return json({ error: "User not found" }, 404);

		const { transactionsTable } = await import("../../db/schema.ts");

		const transactions = await db
			.select()
			.from(transactionsTable)
			.where(
				sql`${transactionsTable.fromUserId} = ${userId} OR ${transactionsTable.toUserId} = ${userId}`,
			)
			.orderBy(sql`${transactionsTable.createdAt} DESC`)
			.limit(20)
			.all();

		const rankResult = await db
			.select({ count: sql`COUNT(*)` })
			.from(usersTable)
			.where(sql`${usersTable.bipki} > ${user.bipki}`)
			.get();

		const rank = Number(rankResult?.count ?? 0) + 1;

		const { config } = await import("../../config.ts");
		const isAdmin = config.ADMIN_IDS.includes(userId);

		return json({
			user,
			transactions,
			rank,
			isAdmin,
			dailyRewardTiers: DAILY_REWARDS,
		});
	},
};
