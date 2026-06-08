import { code, format } from "gramio";
import type { BotType } from "../bot.ts";
import { fmtId } from "../shared/format.ts";

export default (bot: BotType) =>
	bot.command("info", { description: "Информация о боте" }, (ctx) =>
		ctx.send(format`🤖 Bipki Bot\n\nТвой ID: ${code(fmtId(ctx.from.id))}`),
	);
