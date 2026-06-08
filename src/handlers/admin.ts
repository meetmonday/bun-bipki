import {
	CallbackData,
	Composer,
	code,
	format,
	InlineKeyboard,
	join,
} from "gramio";
import { config } from "../config.ts";
import { composer } from "../plugins/index.ts";
import { adminAmountScene } from "../scenes/admin-amount.ts";
import {
	getBalance,
	getTransactionHistory,
	getUser,
	getUsers,
	getUsersCount,
} from "../services/economy.ts";
import { tunnelManager } from "../services/tunnel.ts";
import { fmtId } from "../shared/format.ts";

const USERS_PER_PAGE = 10;

const listNav = new CallbackData("a_list").number("page");
const selectUser = new CallbackData("a_user").number("id");
const userAction = new CallbackData("a_act").number("id").string("act");

async function renderUserList(page: number, showWebApp = false) {
	const total = await getUsersCount();
	const totalPages = Math.ceil(total / USERS_PER_PAGE) || 1;
	const offset = page * USERS_PER_PAGE;
	const users = await getUsers(offset, USERS_PER_PAGE);

	const kb = new InlineKeyboard();

	for (const [i, u] of users.entries()) {
		if (i > 0) kb.row();
		kb.text(
			`${u.name ?? "—"} (@${u.username ?? "—"})  🪙${u.bipki}`,
			selectUser.pack({ id: u.id }),
		);
	}

	kb.row();
	if (page > 0) kb.text("◀", listNav.pack({ page: page - 1 }));
	kb.text(`${page + 1}/${totalPages}`, "a_page_info");
	if (page < totalPages - 1) kb.text("▶", listNav.pack({ page: page + 1 }));

	const tunnel = tunnelManager.getInfo();
	if (showWebApp && tunnel.status === "running" && tunnel.url) {
		kb.row().webApp("⚙ Админка", `${tunnel.url}/admin`);
	}

	return {
		text: format`👥 Список пользователей (${total})`,
		keyboard: kb,
	};
}

async function renderUserDetail(userId: number) {
	const user = await getUser(userId);
	if (!user) return null;

	const balance = await getBalance(userId);

	const lines: Array<string | ReturnType<typeof format>> = [
		format`👤 Пользователь ${code(fmtId(userId))}`,
		"",
		format`Имя: ${user.name ?? "—"}`,
		format`Username: ${user.username ? `@${user.username}` : "—"}`,
		format`Язык: ${user.languageCode ?? "—"}`,
		format`🪙 Бипки: ${balance.bipki}`,
		format`💎 Мегабипки: ${balance.megabipki}`,
		format`📅 Регистрация: ${user.createdAt ? new Date(user.createdAt).toLocaleString("ru-RU") : "—"}`,
	];

	const kb = new InlineKeyboard()
		.columns(1)
		.text("➕ Начислить", userAction.pack({ id: userId, act: "add" }))
		.text("➖ Снять", userAction.pack({ id: userId, act: "remove" }))
		.text("📋 История", userAction.pack({ id: userId, act: "history" }))
		.text("◀ К списку", userAction.pack({ id: userId, act: "back" }));

	return {
		text: join(lines, "\n"),
		keyboard: kb,
	};
}

async function renderUserHistory(userId: number) {
	const user = await getUser(userId);
	const txs = await getTransactionHistory(userId);

	const header = format`📋 История ${user?.name ?? fmtId(userId)}:`;

	if (txs.length === 0) {
		return {
			text: format`${header}\n\nНет транзакций.`,
			keyboard: new InlineKeyboard().text(
				"◀ Назад",
				userAction.pack({ id: userId, act: "back_user" }),
			),
		};
	}

	function txLabel(tx: (typeof txs)[number]) {
		switch (tx.type) {
			case "transfer":
				return tx.fromUserId === userId
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
		const sign = tx.fromUserId === userId ? "➖" : "➕";
		const currency = tx.currency === "bipki" ? "🪙" : "💎";
		const label = txLabel(tx);

		return format`${sign} ${currency} ${tx.amount} — ${label} (${date})`;
	});

	return {
		text: format`${header}\n\n${join(lines, "\n")}`,
		keyboard: new InlineKeyboard().text(
			"◀ Назад",
			userAction.pack({ id: userId, act: "back_user" }),
		),
	};
}

export const adminComposer = new Composer()
	.extend(composer)
	.command(
		"admin",
		{ description: "[Админ] Панель управления", hide: true },
		async (context) => {
			if (!config.ADMIN_IDS.includes(context.from.id)) {
				return context.send("У тебя нет прав на эту команду.");
			}

			const isPrivate = context.chat?.type === "private";
			const { text, keyboard } = await renderUserList(0, isPrivate);
			return context.send(text, { reply_markup: keyboard });
		},
	)
	.callbackQuery(listNav, async (context) => {
		if (!config.ADMIN_IDS.includes(context.from.id)) {
			return context.answer("Нет доступа");
		}

		const { page } = context.queryData;
		const { text, keyboard } = await renderUserList(
			page,
			(context.chatId ?? 0) > 0,
		);
		return context.editText(text, { reply_markup: keyboard });
	})
	.callbackQuery(selectUser, async (context) => {
		if (!config.ADMIN_IDS.includes(context.from.id)) {
			return context.answer("Нет доступа");
		}

		const { id } = context.queryData;
		const screen = await renderUserDetail(id);
		if (!screen) return context.answer("Пользователь не найден");

		return context.editText(screen.text, { reply_markup: screen.keyboard });
	})
	.callbackQuery(userAction, async (context) => {
		if (!config.ADMIN_IDS.includes(context.from.id)) {
			return context.answer("Нет доступа");
		}

		const { id, act } = context.queryData;

		switch (act) {
			case "add":
				return context.scene.enter(adminAmountScene, {
					userId: id,
					action: "add",
				});
			case "remove":
				return context.scene.enter(adminAmountScene, {
					userId: id,
					action: "remove",
				});
			case "history": {
				const screen = await renderUserHistory(id);
				return context.editText(screen.text, {
					reply_markup: screen.keyboard,
				});
			}
			case "back_user": {
				const screen = await renderUserDetail(id);
				if (!screen) return context.answer("Пользователь не найден");
				return context.editText(screen.text, {
					reply_markup: screen.keyboard,
				});
			}
			case "back": {
				const { text, keyboard } = await renderUserList(0);
				return context.editText(text, { reply_markup: keyboard });
			}
		}
	});
