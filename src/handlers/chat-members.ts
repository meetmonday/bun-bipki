import { Composer } from "gramio";
import { db } from "../db/index.ts";
import { chatMembersTable } from "../db/schema.ts";
import { ensureUser } from "../services/economy.ts";

export const chatMembersComposer = new Composer().on("message", async (ctx) => {
	if (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup") return;
	if (ctx.from.isBot()) return;

	await ensureUser(ctx.from.id, {
		name: ctx.from.firstName,
		username: ctx.from.username,
		languageCode: ctx.from.languageCode,
	});

	await db
		.insert(chatMembersTable)
		.values({
			chatId: ctx.chat.id,
			userId: ctx.from.id,
		})
		.onConflictDoNothing()
		.run();
});
