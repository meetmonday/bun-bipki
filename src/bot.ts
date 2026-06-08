import { autoload } from "@gramio/autoload";
import { Bot } from "gramio";
import { config } from "./config.ts";
import { gamesComposer } from "./games/index.ts";
import { adminComposer } from "./handlers/admin.ts";
import { chatMembersComposer } from "./handlers/chat-members.ts";
import { economyComposer } from "./handlers/economy.ts";
import { startComposer } from "./handlers/start.ts";
import { composer } from "./plugins/index.ts";
import "./db/index.ts";

export const bot = new Bot(config.BOT_TOKEN)
	.extend(composer)
	.extend(chatMembersComposer)
	.extend(startComposer)
	.extend(economyComposer)
	.extend(adminComposer)
	.extend(gamesComposer)
	.extend(autoload({ path: "./commands", failGlob: false }))
	.onStart(async ({ info }) => {
		await bot.syncCommands();
		console.log(`✨ Bot ${info.username} was started!`);
	});

export type BotType = typeof bot;
