import { Composer, code, format, join } from "gramio";
import { config } from "../config.ts";
import { composer } from "../plugins/index.ts";
import {
	addCoins,
	claimDailyBonus,
	ensureUser,
	getBalance,
	getTransactionHistory,
	getUserByUsername,
	removeCoins,
	transfer,
} from "../services/economy.ts";
import { dailyLimiter, transferLimiter } from "../services/rate-limiter.ts";
import { fmtId, parseId } from "../shared/format.ts";

const dailyClaimCache = {
	date: "",
	userIds: new Set<number>(),

	reset(): void {
		const today = new Date().toISOString().slice(0, 10);
		if (this.date !== today) {
			this.date = today;
			this.userIds.clear();
		}
	},

	has(userId: number): boolean {
		this.reset();
		return this.userIds.has(userId);
	},

	add(userId: number): void {
		this.reset();
		this.userIds.add(userId);
	},
};

async function resolveTarget(raw: string): Promise<number | null> {
	if (raw.startsWith("@")) {
		const user = await getUserByUsername(raw);
		return user ? user.id : null;
	}
	const id = parseId(raw);
	return Number.isInteger(id) ? id : null;
}

export const economyComposer = new Composer()
	.extend(composer)
	.command("balance", { description: "Показать баланс" }, async (context) => {
		await ensureUser(context.from.id, {
			name: context.from.firstName,
			username: context.from.username,
			languageCode: context.from.languageCode,
		});

		const balance = await getBalance(context.from.id);

		return context.send(
			format`💰 Твой баланс:\n\n🪙 Бипки: ${balance.bipki}\n💎 Мегабипки: ${balance.megabipki}`,
		);
	})
	.command(
		"transfer",
		{ description: "Перевести бипки другому пользователю" },
		async (context) => {
			const limiterKey = `transfer:${context.from.id}`;
			if (!transferLimiter.check(limiterKey)) {
				return context.send("⏳ Слишком много переводов. Подожди немного.");
			}

			if (!context.args)
				return context.send("Использование: /transfer <id|@username> <сумма>");

			const parts = context.args.split(/\s+/);
			const target = parts[0] ?? "";
			const amount = Number(parts[1]);

			if (!Number.isInteger(amount) || amount <= 0) {
				return context.send("Укажи корректную сумму.");
			}

			const toId = await resolveTarget(target);
			if (!toId) {
				return context.send(
					"Пользователь не найден. Укажи корректный ID или @username.",
				);
			}

			if (toId === context.from.id)
				return context.send("Нельзя переводить самому себе.");

			await ensureUser(context.from.id, {
				name: context.from.firstName,
				username: context.from.username,
				languageCode: context.from.languageCode,
			});

			try {
				await transfer(context.from.id, toId, amount);
				return context.send(
					format`✅ Переведено ${amount} 🪙 бипок пользователю ${code(fmtId(toId))}`,
				);
			} catch (error) {
				return context.send(
					error instanceof Error ? error.message : "Ошибка перевода",
				);
			}
		},
	)
	.command(
		"daily",
		{ description: "Получить ежедневный бонус" },
		async (context) => {
			const limiterKey = `daily:${context.from.id}`;
			if (!dailyLimiter.check(limiterKey)) {
				return context.send("⏳ Слишком много запросов. Подожди.");
			}

			if (dailyClaimCache.has(context.from.id)) return;

			await ensureUser(context.from.id, {
				name: context.from.firstName,
				username: context.from.username,
				languageCode: context.from.languageCode,
			});

			try {
				const bonus = await claimDailyBonus(context.from.id);
				dailyClaimCache.add(context.from.id);

				const rewardLine =
					bonus.megabipki > 0
						? format`+${bonus.bipki} 🪙 +${bonus.megabipki} 💎`
						: format`+${bonus.bipki} 🪙`;
				return context.send(
					format`🎉 Ежедневный бонус получен!\n🔥 Стрик: ${bonus.streak} ${bonus.streak >= 5 ? "💎" : "день"}\n${rewardLine}`,
				);
			} catch {
				dailyClaimCache.add(context.from.id);
			}
		},
	)
	.command(
		"history",
		{ description: "История транзакций" },
		async (context) => {
			await ensureUser(context.from.id, {
				name: context.from.firstName,
				username: context.from.username,
				languageCode: context.from.languageCode,
			});

			const txs = await getTransactionHistory(context.from.id);

			if (txs.length === 0) return context.send("У тебя пока нет транзакций.");

			function txLabel(tx: (typeof txs)[number]) {
				switch (tx.type) {
					case "transfer":
						return tx.fromUserId === context.from.id
							? format`Перевод → ${code(fmtId(tx.toUserId ?? 0))}`
							: format`Перевод ← ${code(fmtId(tx.fromUserId ?? 0))}`;
					case "daily_bonus":
						return "Ежедневный бонус";
					case "admin_add":
						return "Админ начислил";
					case "admin_remove":
						return "Админ снял";
					case "game_win":
						return format`🎮 Выигрыш (${tx.description})`;
					case "game_lose":
						return format`🎮 Проигрыш (${tx.description})`;
					default:
						return tx.type;
				}
			}

			const lines = txs.map((tx) => {
				const date = new Date(tx.createdAt ?? "").toLocaleString("ru-RU");
				const sign = tx.fromUserId === context.from.id ? "➖" : "➕";
				const currency = tx.currency === "bipki" ? "🪙" : "💎";
				const label = txLabel(tx);

				return format`${sign} ${currency} ${tx.amount} — ${label} (${date})`;
			});

			return context.send(
				format`📋 Последние транзакции:\n\n${join(lines, "\n")}`,
			);
		},
	)
	.command(
		"give",
		{ description: "[Админ] Начислить валюту пользователю", hide: true },
		async (context) => {
			if (!config.ADMIN_IDS.includes(context.from.id)) {
				return context.send("У тебя нет прав на эту команду.");
			}

			if (!context.args) {
				return context.send(
					"Использование: /give <id|@username> <сумма> [bipki|megabipki]",
				);
			}

			const parts = context.args.split(/\s+/);
			const target = parts[0] ?? "";
			const amount = Number(parts[1]);
			const currency = (parts[2] ?? "bipki") as "bipki" | "megabipki";

			if (!Number.isInteger(amount) || amount <= 0) {
				return context.send("Укажи корректную сумму.");
			}

			if (!["bipki", "megabipki"].includes(currency)) {
				return context.send("Валюта должна быть bipki или megabipki.");
			}

			const targetId = await resolveTarget(target);
			if (!targetId) {
				return context.send(
					"Пользователь не найден. Укажи корректный ID или @username.",
				);
			}

			await addCoins(
				targetId,
				amount,
				currency,
				"admin_add",
				`Начислил админ ${context.from.id}`,
			);

			return context.send(
				format`✅ Начислено ${amount} ${currency === "bipki" ? "🪙 бипок" : "💎 мегабипок"} пользователю ${code(fmtId(targetId))}`,
			);
		},
	)
	.command(
		"take",
		{ description: "[Админ] Снять валюту у пользователя", hide: true },
		async (context) => {
			if (!config.ADMIN_IDS.includes(context.from.id)) {
				return context.send("У тебя нет прав на эту команду.");
			}

			if (!context.args) {
				return context.send(
					"Использование: /take <id|@username> <сумма> [bipki|megabipki]",
				);
			}

			const parts = context.args.split(/\s+/);
			const target = parts[0] ?? "";
			const amount = Number(parts[1]);
			const currency = (parts[2] ?? "bipki") as "bipki" | "megabipki";

			if (!Number.isInteger(amount) || amount <= 0) {
				return context.send("Укажи корректную сумму.");
			}

			if (!["bipki", "megabipki"].includes(currency)) {
				return context.send("Валюта должна быть bipki или megabipki.");
			}

			const targetId = await resolveTarget(target);
			if (!targetId) {
				return context.send(
					"Пользователь не найден. Укажи корректный ID или @username.",
				);
			}

			try {
				await removeCoins(
					targetId,
					amount,
					currency,
					"admin_remove",
					`Снял админ ${context.from.id}`,
				);
				return context.send(
					format`✅ Снято ${amount} ${currency === "bipki" ? "🪙 бипок" : "💎 мегабипок"} у пользователя ${code(fmtId(targetId))}`,
				);
			} catch (error) {
				return context.send(error instanceof Error ? error.message : "Ошибка");
			}
		},
	);
