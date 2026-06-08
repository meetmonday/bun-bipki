import type { GameDefinition } from "./types.ts";

export const coinflip: GameDefinition = {
	id: "cf",
	emoji: "🪙",
	i18nKey: "games.coinflip",
	choices: [
		{ id: "h", labelI18nKey: "games.coinflip.heads" },
		{ id: "t", labelI18nKey: "games.coinflip.tails" },
	],
	resolve(_bet: number, choice: string) {
		const result = Math.random() < 0.5 ? "h" : "t";
		return {
			win: choice === result,
			outcomeLabelI18nKey:
				result === "h" ? "games.coinflip.heads" : "games.coinflip.tails",
			outcomeEmoji: result === "h" ? "🦅" : "🌿",
		};
	},
};
