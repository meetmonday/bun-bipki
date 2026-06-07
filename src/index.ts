import { bot } from "./bot.ts";
import { config } from "./config.ts";
import { tunnelManager } from "./services/tunnel.ts";
import { startWebServer } from "./web/index.ts";

const signals = ["SIGINT", "SIGTERM"];

for (const signal of signals) {
	process.on(signal, async () => {
		console.log(`Received ${signal}. Initiating graceful shutdown...`);
		tunnelManager.stop();
		await bot.stop();
		process.exit(0);
	});
}

process.on("uncaughtException", (error) => {
	console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (error) => {
	console.error("Unhandled rejection:", error);
});

startWebServer();
await bot.start();

// Ждём URL от Cloudflare Tunnel и назначаем Mini App
if (config.CLOUDFLARE_TUNNEL_ENABLED && config.NODE_ENV !== "test") {
	try {
		const tunnelUrl = await tunnelManager.waitForUrl();
		await bot.api.setChatMenuButton({
			menu_button: {
				type: "web_app",
				text: "📊 Dashboard",
				web_app: { url: tunnelUrl },
			},
		});
		console.log(`  ✅ Mini App назначен: ${tunnelUrl}`);
	} catch (err) {
		console.error(
			`  ⚠️ Mini App не назначен: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
}
