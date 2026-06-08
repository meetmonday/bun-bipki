import { existsSync, mkdirSync } from "node:fs";
import { autoAnswerCallbackQuery } from "@gramio/auto-answer-callback-query";
import { autoRetry } from "@gramio/auto-retry";
import { sqliteStorage } from "@gramio/storage-sqlite";
import { Composer } from "gramio";
import { i18n } from "../shared/locales/index.ts";

if (!existsSync("data")) {
	mkdirSync("data", { recursive: true });
}

export const storage = sqliteStorage({ filename: "data/scenes.db" });

export const baseComposer = new Composer({ name: "base" })
	.extend(autoAnswerCallbackQuery())
	.extend(autoRetry())
	.derive((context) => ({
		t: i18n.buildT(
			(context as { from?: { languageCode?: string } }).from?.languageCode ??
				"en",
		),
	}))
	.as("scoped");
