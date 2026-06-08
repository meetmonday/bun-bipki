import type { ShouldFollowLanguageStrict } from "@gramio/i18n";
import { bold, format } from "gramio";
import type { en } from "./en.ts";

export const ru = {
	greeting: (name: string) => format`Привет, ${bold(name)}!`,
	games: {
		help_title: "❓ Как играть",
		help_desc: "Укажи ставку чтобы поиграть",
		help_text:
			"Напиши сумму ставки, чтобы начать играть, например: @username 50",

		balance_title: (amount: number) => `💳 ${amount} 🪙`,
		balance_desc: "Твой текущий баланс",
		balance_text: (amount: number) => `💳 Твой баланс: ${amount} 🪙`,

		bet_changed: (bet: number) => `Ставка: ${bet} 🪙`,
		toast_win: (payout: number, balance: number) =>
			`🎉 +${payout} 🪙 | Баланс: ${balance} 🪙`,
		toast_lose: (loss: number, balance: number) =>
			`😔 -${loss} 🪙 | Баланс: ${balance} 🪙`,
		insufficient_funds: "❌ Недостаточно бипок!",
		log_win: (amount: number) => `Выиграл ✅ +${amount}`,
		log_lose: () => "Проиграл ❌",

		coinflip: {
			title: (bet: number) => `🪙 Монетка (${bet} 🪙)`,
			desc: (bet: number) => `Ставка ${bet} бипок • Выигрыш x2!`,
			header: (bet: number) => `🪙 Монетка | Ставка: ${bet}`,
			heads: "🦅 Орёл",
			tails: "🌿 Решка",
		},
	},
} satisfies ShouldFollowLanguageStrict<typeof en>;
