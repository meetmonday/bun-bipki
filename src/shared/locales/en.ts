import type { LanguageMap } from "@gramio/i18n";
import { bold, format } from "gramio";

export const en = {
	greeting: (name: string) => format`Hello, ${bold(name)}!`,
	games: {
		help_title: "❓ How to play",
		help_desc: "Send a bet to play",
		help_text: "Type a bet amount to start playing, e.g.: @username 50",

		balance_title: (amount: number) => `💳 ${amount} 🪙`,
		balance_desc: "Your current balance",
		balance_text: (amount: number) => `💳 Your balance: ${amount} 🪙`,

		bet_changed: (bet: number) => `Bet: ${bet} 🪙`,
		toast_win: (payout: number, balance: number) =>
			`🎉 +${payout} 🪙 | Balance: ${balance} 🪙`,
		toast_lose: (loss: number, balance: number) =>
			`😔 -${loss} 🪙 | Balance: ${balance} 🪙`,
		insufficient_funds: "❌ Not enough bipki!",
		log_win: (amount: number) => `Won ✅ +${amount}`,
		log_lose: () => "Lost ❌",

		coinflip: {
			title: (bet: number) => `🪙 Coin Flip (${bet} 🪙)`,
			desc: (bet: number) => `Bet ${bet} bipki • Win x2!`,
			header: (bet: number) => `🪙 Coin Flip | Bet: ${bet}`,
			heads: "🦅 Heads",
			tails: "🌿 Tails",
		},
	},
} satisfies LanguageMap;
