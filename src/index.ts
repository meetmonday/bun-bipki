import { bot } from "./bot.ts";
import { config } from "./config.ts";
import { logger } from "./services/logger.ts";
import { tunnelManager } from "./services/tunnel.ts";
import { startWebServer, stopWebServer } from "./web/index.ts";

const signals = ["SIGINT", "SIGTERM"];

for (const signal of signals) {
	process.on(signal, async () => {
		logger.info({ signal }, "Initiating graceful shutdown");
		tunnelManager.stop();
		stopWebServer();
		await bot.stop();
		process.exit(0);
	});
}

process.on("uncaughtException", (error) => {
	logger.fatal(error, "Uncaught exception");
	process.exit(1);
});

process.on("unhandledRejection", (reason) => {
	if (
		reason &&
		typeof reason === "object" &&
		"method" in reason &&
		reason.method === "editMessageText"
	) {
		return;
	}
	logger.error({ reason }, "Unhandled rejection");
});

startWebServer();
await bot.start();

// Назначаем Mini App кнопку в меню (список чатов и поле ввода)
if (config.NODE_ENV !== "test") {
	try {
		const tunnelUrl =
			config.CLOUDFLARE_TUNNEL_URL ||
			(config.CLOUDFLARE_TUNNEL_ENABLED
				? await tunnelManager.waitForUrl()
				: null);

		if (tunnelUrl) {
			await bot.api.setChatMenuButton({
				menu_button: {
					type: "web_app",
					text: "📊 Dashboard",
					web_app: { url: tunnelUrl },
				},
			});
			logger.info({ tunnelUrl }, "Mini App assigned");
		}
	} catch (err) {
		logger.error(
			{ err: err instanceof Error ? err.message : String(err) },
			"Failed to assign Mini App",
		);
	}
}
