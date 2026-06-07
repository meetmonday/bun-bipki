import { format } from "gramio";
import type { BotType } from "../bot.ts";

export default (bot: BotType) =>
	bot.command("info", { description: "Информация о боте" }, (ctx) =>
		ctx.send(format`🤖 Bipki Bot\n\nТвой ID: ${ctx.from.id}`),
	);
