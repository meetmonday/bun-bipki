import { Composer, InlineKeyboard } from "gramio";
import { config } from "../config.ts";
import { composer } from "../plugins/index.ts";
import { tunnelManager } from "../services/tunnel.ts";

export const webComposer = new Composer()
	.extend(composer)
	.command("web", { description: "Открыть Web UI" }, (ctx) => {
		const info = tunnelManager.getInfo();
		const isAdmin = config.ADMIN_IDS.includes(ctx.from.id);

		if (info.status === "running" && info.url) {
			const kb = new InlineKeyboard().webApp("📊 Дашборд", info.url);

			if (isAdmin) {
				kb.row().webApp("⚙ Админка", `${info.url}/admin`);
			}

			ctx.send(
				isAdmin
					? "🌐 Web UI\n\nДашборд и админ-панель бота."
					: "🌐 Web UI\n\nДашборд банка.",
				{ reply_markup: kb },
			);
		} else if (info.status === "starting") {
			ctx.send("⏳ Web UI ещё запускается. Попробуй через пару секунд.");
		} else {
			const msg = info.error
				? `❌ Web UI недоступен.\n\n${info.error}`
				: "❌ Web UI недоступен (туннель не запущен).";
			ctx.send(msg);
		}
	});
