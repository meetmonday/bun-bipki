import { db } from "../../db/index.ts";
import { usersTable } from "../../db/schema.ts";
import {
	badRequest,
	getSecretFromQuery,
	json,
	requireSecret,
	unauthorized,
} from "../middleware.ts";
import type { RouteDef } from "../router.ts";

export const broadcastRoute: RouteDef = {
	method: "POST",
	pattern: "/api/broadcast",
	handler: async (req, _params, url) => {
		const token = getSecretFromQuery(url);
		if (!token || !requireSecret(token)) return unauthorized();

		const body = (await req.json()) as { message?: string };
		const message = body.message;
		if (!message) return badRequest("Message is required");

		const users = await db.select({ id: usersTable.id }).from(usersTable).all();

		const { bot } = await import("../../bot.ts");

		const CHUNK_SIZE = 25;
		const DELAY_MS = 50;
		let sent = 0;
		let failed = 0;

		for (let i = 0; i < users.length; i += CHUNK_SIZE) {
			const chunk = users.slice(i, i + CHUNK_SIZE);

			const results = await Promise.allSettled(
				chunk.map((user) =>
					bot.api.sendMessage({
						chat_id: user.id,
						text: message,
						suppress: true,
					}),
				),
			);

			for (const r of results) {
				if (r.status === "fulfilled") sent++;
				else failed++;
			}

			if (i + CHUNK_SIZE < users.length) {
				await new Promise((r) => setTimeout(r, DELAY_MS));
			}
		}

		return json({ sent, failed, total: users.length });
	},
};
