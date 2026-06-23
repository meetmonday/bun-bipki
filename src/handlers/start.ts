import { Composer, InlineKeyboard } from "gramio";
import { composer } from "../plugins/index.ts";
import { ensureUser } from "../services/economy.ts";
import { tunnelManager } from "../services/tunnel.ts";

export const startComposer = new Composer()
	.extend(composer)
	.command("start", { description: "Запустить бота" }, async (context) => {
		if (context.from.isBot()) return;

		await ensureUser(context.from.id, {
			name: context.from.firstName,
			username: context.from.username,
			languageCode: context.from.languageCode,
		});

		const tunnel = tunnelManager.getInfo();
		if (
			context.chat?.type === "private" &&
			tunnel.status === "running" &&
			tunnel.url
		) {
			const kb = new InlineKeyboard().webApp("📊 Дашборд", tunnel.url);
			return context.send("Hi!", { reply_markup: kb });
		}

		return context.send("Hi!");
	});
