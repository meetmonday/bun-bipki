import { Composer, format } from "gramio";
import { config } from "../config.ts";
import { composer } from "../plugins/index.ts";
import {
	addCoins,
	claimDailyBonus,
	ensureUser,
	getBalance,
	getTransactionHistory,
	removeCoins,
	transfer,
} from "../services/economy.ts";

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
			if (!context.args)
				return context.send("Использование: /transfer <id> <сумма>");

			const parts = context.args.split(/\s+/);
			const toId = Number(parts[0]);
			const amount = Number(parts[1]);

			if (!Number.isInteger(toId) || !Number.isInteger(amount) || amount <= 0) {
				return context.send("Укажи корректный ID пользователя и сумму.");
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
					format`✅ Переведено ${amount} 🪙 бипок пользователю ${toId}`,
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
			await ensureUser(context.from.id, {
				name: context.from.firstName,
				username: context.from.username,
				languageCode: context.from.languageCode,
			});

			try {
				const bonus = await claimDailyBonus(context.from.id);
				return context.send(
					format`🎉 Ежедневный бонус получен!\n\n+${bonus.bipki} 🪙 бипок\n+${bonus.megabipki} 💎 мегабипок`,
				);
			} catch (error) {
				return context.send(
					error instanceof Error
						? error.message
						: "Ты уже получил бонус сегодня. Возвращайся завтра!",
				);
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

			const lines = txs.map((tx) => {
				const date = new Date(tx.createdAt ?? "").toLocaleString("ru-RU");
				const sign = tx.fromUserId === context.from.id ? "➖" : "➕";
				const currency = tx.currency === "bipki" ? "🪙" : "💎";
				const label =
					tx.type === "transfer"
						? tx.fromUserId === context.from.id
							? `Перевод → ${tx.toUserId}`
							: `Перевод ← ${tx.fromUserId}`
						: tx.type === "daily_bonus"
							? "Ежедневный бонус"
							: tx.type === "admin_add"
								? "Админ начислил"
								: tx.type === "admin_remove"
									? "Админ снял"
									: tx.type;

				return `${sign} ${currency} ${tx.amount} — ${label} (${date})`;
			});

			return context.send(
				format`📋 Последние транзакции:\n\n${lines.join("\n")}`,
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
					"Использование: /give <id> <сумма> [bipki|megabipki]",
				);
			}

			const parts = context.args.split(/\s+/);
			const targetId = Number(parts[0]);
			const amount = Number(parts[1]);
			const currency = (parts[2] ?? "bipki") as "bipki" | "megabipki";

			if (
				!Number.isInteger(targetId) ||
				!Number.isInteger(amount) ||
				amount <= 0
			) {
				return context.send("Укажи корректные данные.");
			}

			if (!["bipki", "megabipki"].includes(currency)) {
				return context.send("Валюта должна быть bipki или megabipki.");
			}

			await addCoins(
				targetId,
				amount,
				currency,
				"admin_add",
				`Начислил админ ${context.from.id}`,
			);

			return context.send(
				format`✅ Начислено ${amount} ${currency === "bipki" ? "🪙 бипок" : "💎 мегабипок"} пользователю ${targetId}`,
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
					"Использование: /take <id> <сумма> [bipki|megabipki]",
				);
			}

			const parts = context.args.split(/\s+/);
			const targetId = Number(parts[0]);
			const amount = Number(parts[1]);
			const currency = (parts[2] ?? "bipki") as "bipki" | "megabipki";

			if (
				!Number.isInteger(targetId) ||
				!Number.isInteger(amount) ||
				amount <= 0
			) {
				return context.send("Укажи корректные данные.");
			}

			if (!["bipki", "megabipki"].includes(currency)) {
				return context.send("Валюта должна быть bipki или megabipki.");
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
					format`✅ Снято ${amount} ${currency === "bipki" ? "🪙 бипок" : "💎 мегабипок"} у пользователя ${targetId}`,
				);
			} catch (error) {
				return context.send(error instanceof Error ? error.message : "Ошибка");
			}
		},
	);
