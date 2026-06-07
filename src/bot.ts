import { Bot } from "gramio";
import { config } from "./config.ts";
import { economyComposer } from "./handlers/economy.ts";
import { startComposer } from "./handlers/start.ts";
import { webComposer } from "./handlers/web.ts";
import { composer } from "./plugins/index.ts";
import "./db/index.ts";

export const bot = new Bot(config.BOT_TOKEN)
	.extend(composer)
	.extend(startComposer)
	.extend(economyComposer)
	.extend(webComposer)
	.onStart(({ info }) => console.log(`✨ Bot ${info.username} was started!`));
