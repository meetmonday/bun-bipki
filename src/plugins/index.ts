import { scenes } from "@gramio/scenes";
import { Composer } from "gramio";
import { adminAmountScene } from "../scenes/admin-amount.ts";
import { greetingScene } from "../scenes/greeting.ts";
import { baseComposer, storage } from "./base.ts";

export const composer = new Composer({ name: "main" })
	.extend(baseComposer)
	.extend(scenes([greetingScene, adminAmountScene], { storage }))
	.as("scoped");

export type BotType = typeof composer;
