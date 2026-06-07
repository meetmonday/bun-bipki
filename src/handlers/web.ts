import { InlineKeyboard } from "gramio";
import { config } from "../config.ts";
import { composer } from "../plugins/index.ts";
import { tunnelManager } from "../services/tunnel.ts";

export const webComposer = composer.command("web", (ctx) => {
	const info = tunnelManager.getInfo();
	const isAdmin = config.ADMIN_IDS.includes(ctx.from.id);

	if (info.status === "running" && info.url) {
		const kb = new InlineKeyboard().webApp("📊 Дашборд", info.url);

		if (isAdmin) {
			kb.webApp("⚙ Админка", `${info.url}/admin`);
		}

		kb.url("🔗 Прямая ссылка", info.url);

		ctx.send(
			isAdmin
				? `🌐 Web UI\n\nДашборд и админ-панель бота.`
				: `🌐 Web UI\n\nДашборд банка.`,
			{ reply_markup: kb },
		);
	} else if (info.status === "starting") {
		ctx.send("⏳ Web UI ещё запускается. Попробуй через пару секунд.");
	} else {
		ctx.send("❌ Web UI недоступен (туннель не запущен).");
	}
});
