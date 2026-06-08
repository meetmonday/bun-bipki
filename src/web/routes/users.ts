import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { usersTable } from "../../db/schema.ts";
import { getUserByUsername } from "../../services/economy.ts";
import {
	ensureUserFromInitData,
	json,
	notFound,
	unauthorized,
	validateInitData,
} from "../middleware.ts";
import type { RouteDef } from "../router.ts";

export const listUsersRoute: RouteDef = {
	method: "GET",
	pattern: "/api/users",
	handler: async (_req, _params, url) => {
		const page = Number(url.searchParams.get("page") ?? "1");
		const limit = 20;
		const offset = (page - 1) * limit;

		const users = await db
			.select()
			.from(usersTable)
			.orderBy(desc(usersTable.createdAt))
			.limit(limit)
			.offset(offset)
			.all();

		const total = await db.$count(usersTable);

		return json({ users, total, page, pages: Math.ceil(total / limit) });
	},
};

export const userByIdRoute: RouteDef = {
	method: "GET",
	pattern: "/api/users/:id",
	handler: async (_req, params) => {
		const id = Number(params.id);
		if (!Number.isInteger(id)) return notFound("Invalid user ID");

		const user = await db
			.select()
			.from(usersTable)
			.where(eq(usersTable.id, id))
			.get();

		if (!user) return notFound("User not found");

		const { transactionsTable } = await import("../../db/schema.ts");

		const transactions = await db
			.select()
			.from(transactionsTable)
			.where(
				sql`${transactionsTable.fromUserId} = ${id} OR ${transactionsTable.toUserId} = ${id}`,
			)
			.orderBy(desc(transactionsTable.createdAt))
			.limit(50)
			.all();

		return json({ user, transactions });
	},
};

export const userByUsernameRoute: RouteDef = {
	method: "POST",
	pattern: "/api/users/by-username",
	handler: async (req, _params) => {
		const body = (await req.json()) as Record<string, unknown>;
		const initData = body.initData;
		const username = body.username;

		if (typeof initData !== "string" || typeof username !== "string") {
			return json({ error: "initData and username are required" }, 400);
		}

		const auth = validateInitData(body);
		if (!auth) return unauthorized();
		await ensureUserFromInitData(auth.user);

		const user = await getUserByUsername(username);
		if (!user) return notFound("User not found");

		return json({
			id: user.id,
			name: user.name,
			username: user.username,
		});
	},
};
