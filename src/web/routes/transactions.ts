import { desc } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { transactionsTable } from "../../db/schema.ts";
import { json } from "../middleware.ts";
import type { RouteDef } from "../router.ts";

export const transactionsRoute: RouteDef = {
	method: "GET",
	pattern: "/api/transactions",
	handler: async (_req, _params, url) => {
		const limit = Number(url.searchParams.get("limit") ?? "30");

		const transactions = await db
			.select()
			.from(transactionsTable)
			.orderBy(desc(transactionsTable.createdAt))
			.limit(limit)
			.all();

		return json({ transactions });
	},
};
