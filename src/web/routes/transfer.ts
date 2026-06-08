import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { chatMembersTable, usersTable } from "../../db/schema.ts";
import {
	badRequest,
	ensureUserFromInitData,
	json,
	unauthorized,
	validateInitData,
} from "../middleware.ts";
import type { RouteDef } from "../router.ts";

export const transferRoute: RouteDef = {
	method: "POST",
	pattern: "/api/transfer",
	handler: async (req) => {
		const body = (await req.json()) as {
			initData?: string;
			toUserId?: number;
			amount?: number;
		};

		if (!body.initData || !body.toUserId || !body.amount) {
			return badRequest("initData, toUserId, and amount are required");
		}

		const auth = validateInitData(body);
		if (!auth) return unauthorized("Invalid init data");

		await ensureUserFromInitData(auth.user);

		const fromUserId = auth.user.id;
		const toUserId = body.toUserId;

		if (fromUserId === toUserId) {
			return badRequest("Cannot transfer to yourself");
		}

		const { transfer } = await import("../../services/economy.ts");

		try {
			await transfer(fromUserId, toUserId, body.amount);
			return json({ success: true });
		} catch (err) {
			return json(
				{ error: err instanceof Error ? err.message : "Transfer failed" },
				400,
			);
		}
	},
};

export const transferRecipientsRoute: RouteDef = {
	method: "POST",
	pattern: "/api/transfer/recipients",
	handler: async (req) => {
		const body = (await req.json()) as { initData?: string };

		if (!body.initData) {
			return badRequest("initData is required");
		}

		const auth = validateInitData(body);
		if (!auth) return unauthorized("Invalid init data");

		await ensureUserFromInitData(auth.user);

		const userId = auth.user.id;

		const userChats = await db
			.select({ chatId: chatMembersTable.chatId })
			.from(chatMembersTable)
			.where(eq(chatMembersTable.userId, userId))
			.all();

		if (userChats.length === 0) return json({ recipients: [] });

		const chatIds = userChats.map((c) => c.chatId);

		const peers = await db
			.selectDistinct({ userId: chatMembersTable.userId })
			.from(chatMembersTable)
			.where(
				and(
					inArray(chatMembersTable.chatId, chatIds),
					sql`${chatMembersTable.userId} != ${userId}`,
				),
			)
			.all();

		if (peers.length === 0) return json({ recipients: [] });

		const peerIds = peers.map((p) => p.userId);

		const recipients = await db
			.select({
				id: usersTable.id,
				name: usersTable.name,
				username: usersTable.username,
				bipki: usersTable.bipki,
			})
			.from(usersTable)
			.where(inArray(usersTable.id, peerIds))
			.all();

		return json({ recipients });
	},
};
