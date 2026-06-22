import { code, format } from "gramio";

import type { BotType } from "../bot.ts";
import { fmtId } from "../shared/format.ts";

type Ctx = Parameters<Parameters<BotType["command"]>[2]>[0];

export default (bot: BotType) =>
	bot.command("info", { description: "Информация о боте" }, (ctx: Ctx) =>
		ctx.send(format`🤖 Bipki Bot\n\nТвой ID: ${code(fmtId(ctx.from.id))}`),
	);
