import { Composer } from "gramio";
import { composer } from "../plugins/index.ts";

export const startComposer = new Composer()
	.extend(composer)
	.command("start", { description: "Запустить бота" }, (context) =>
		context.send("Hi!"),
	);
