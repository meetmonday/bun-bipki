import { Composer } from "gramio";
import { composer } from "../plugins/index.ts";

export const startComposer = new Composer()
	.extend(composer)
	.command("start", (context) => context.send("Hi!"));
