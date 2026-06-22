import { autoload } from "@gramio/autoload";
import { Bot } from "gramio";
import { config } from "./config.ts";
import { gamesComposer } from "./games/index.ts";
import { adminComposer } from "./handlers/admin.ts";
import { chatMembersComposer } from "./handlers/chat-members.ts";
import { economyComposer } from "./handlers/economy.ts";
import { startComposer } from "./handlers/start.ts";
import { composer } from "./plugins/index.ts";
import { logger } from "./services/logger.ts";
import "./db/index.ts";

export const bot = new Bot(config.BOT_TOKEN)
	.extend(composer)
	.extend(chatMembersComposer)
	.extend(startComposer)
	.extend(economyComposer)
	.extend(adminComposer)
	.extend(gamesComposer)
	.extend(autoload({ path: "./commands", failGlob: false }))
	.onError(({ error }) => {
		logger.error({ error: String(error) }, "Bot onError");
	})

	.onStart(async ({ info }) => {
		await bot.syncCommands();
		logger.info({ username: info.username }, "Bot started");
	});

export type BotType = typeof bot;
