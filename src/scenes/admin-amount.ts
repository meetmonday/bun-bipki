import { Scene } from "@gramio/scenes";
import { code, format, InlineKeyboard } from "gramio";
import { baseComposer } from "../plugins/base.ts";
import { addCoins, removeCoins } from "../services/economy.ts";
import { fmtId } from "../shared/format.ts";

type SceneState = {
	currency: "bipki" | "megabipki";
};
type SceneParams = {
	userId: number;
	action: "add" | "remove";
};

export const adminAmountScene = new Scene("admin_amount")
	.params<SceneParams>()
	.extend(baseComposer)
	.step("callback_query", async (context) => {
		const params = context.scene.params as unknown as SceneParams;

		if (context.scene.step.firstTime) {
			await context.editText(
				format`${params.action === "add" ? "➕" : "➖"} Выбери валюту:`,
				{
					reply_markup: new InlineKeyboard()
						.text("🪙 Бипки", "bipki")
						.text("💎 Мегабипки", "megabipki"),
				},
			);
			return;
		}

		if (context.data === "bipki" || context.data === "megabipki") {
			context.scene.update({ currency: context.data });
			await context.editText(
				format`${params.action === "add" ? "➕" : "➖"} Введи сумму (${context.data === "bipki" ? "🪙" : "💎"}):`,
			);
			return context.scene.step.go(1);
		}
	})
	.step("message", async (context) => {
		const amount = Number(context.text);
		if (!context.text || !Number.isInteger(amount) || amount <= 0) {
			return context.send("Укажи корректное целое число.");
		}

		const params = context.scene.params as unknown as SceneParams;
		const { currency } = context.scene.state as unknown as SceneState;

		try {
			if (params.action === "add") {
				await addCoins(
					params.userId,
					amount,
					currency,
					"admin_add",
					`Начислил админ ${context.from.id}`,
				);
				await context.send(
					format`✅ Начислено ${amount} ${currency === "bipki" ? "🪙 бипок" : "💎 мегабипок"} пользователю ${code(fmtId(params.userId))}`,
				);
			} else {
				await removeCoins(
					params.userId,
					amount,
					currency,
					"admin_remove",
					`Снял админ ${context.from.id}`,
				);
				await context.send(
					format`✅ Снято ${amount} ${currency === "bipki" ? "🪙 бипок" : "💎 мегабипок"} у пользователя ${code(fmtId(params.userId))}`,
				);
			}
		} catch (error) {
			await context.send(
				error instanceof Error ? error.message : "Ошибка операции",
			);
		}

		return context.scene.exit();
	});
