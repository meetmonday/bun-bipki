import {
	CallbackData,
	Composer,
	InlineKeyboard,
	InlineQueryResult,
	InputMessageContent,
} from "gramio";
import { db } from "../db/index.ts";
import { gameLogTable } from "../db/schema.ts";
import { composer } from "../plugins/index.ts";
import {
	addCoins,
	ensureUser,
	getBalance,
	removeCoins,
} from "../services/economy.ts";
import { coinflip } from "./coinflip.ts";
import type { GameDefinition } from "./types.ts";

const games: GameDefinition[] = [coinflip];

const gameAction = new CallbackData("ga")
	.string("s")
	.string("g")
	.number("b")
	.string("a");

const MIN_BET = 1;

interface LogEntry {
	userId: number;
	player: string;
	emoji: string;
	won: boolean;
	amount: number;
}

interface GameSession {
	bet: number;
	log: Map<number, LogEntry>;
	updatedAt: number;
}

const sessions = new Map<string, GameSession>();

setInterval(() => {
	const cutoff = Date.now() - 30 * 60 * 1000;
	for (const [id, session] of sessions) {
		if (session.updatedAt < cutoff) sessions.delete(id);
	}
}, 60_000);

function clampBet(bet: number): number {
	return Math.max(MIN_BET, bet);
}

function buildKeyboard(
	sessionId: string,
	game: GameDefinition,
	bet: number,
	label: (key: string) => string,
): InlineKeyboard {
	const kb = new InlineKeyboard();

	for (const choice of game.choices) {
		kb.text(
			label(choice.labelI18nKey),
			gameAction.pack({ s: sessionId, g: game.id, b: bet, a: choice.id }),
		);
	}

	kb.row();
	kb.text(
		"×0.5",
		gameAction.pack({ s: sessionId, g: game.id, b: bet, a: "x05" }),
	).text("×2", gameAction.pack({ s: sessionId, g: game.id, b: bet, a: "x2" }));

	return kb;
}

// GramIO's `context.t` has a literal-key type that can't express
// dynamically-constructed keys like `${game.i18nKey}.header`.
// biome-ignore lint/suspicious/noExplicitAny: required for dynamic i18n keys
type TContext = { t: (...args: any[]) => string };

function text(ctx: TContext, key: string, ...args: unknown[]): string {
	return ctx.t(key, ...args);
}

function buildLogText(context: TContext, log: Map<number, LogEntry>): string {
	if (log.size === 0) return "";
	const lines = [...log.values()].map((entry) => {
		const result = entry.won
			? text(context, "games.log_win", entry.amount)
			: text(context, "games.log_lose");
		const prefix = entry.player ? `${entry.player} ` : "";
		return `${entry.emoji} — ${prefix}${result}`;
	});
	return lines.join("\n");
}

function skipBot(ctx: { from?: { isBot(): boolean } }): boolean {
	return !!ctx.from?.isBot();
}

export const gamesComposer = new Composer()
	.extend(composer)

	.inlineQuery(/^(\d+)$/, async (context) => {
		if (skipBot(context)) return;
		const bet = Number(context.args?.[1] ?? 0);

		const userId = context.from.id;
		await ensureUser(userId, {
			name: context.from.firstName,
			username: context.from.username,
			languageCode: context.from.languageCode,
		});
		const { bipki: balance } = await getBalance(userId);

		const balanceArticle = InlineQueryResult.article(
			"balance",
			text(context, "games.balance_title", balance),
			InputMessageContent.text(text(context, "games.balance_text", balance)),
			{ description: text(context, "games.balance_desc") },
		);

		if (bet < MIN_BET) {
			await context.answer(
				[
					balanceArticle,
					InlineQueryResult.article(
						"help",
						text(context, "games.help_title"),
						InputMessageContent.text(text(context, "games.help_text")),
						{ description: text(context, "games.help_desc") },
					),
				],
				{ cache_time: 0, is_personal: true },
			);
			return;
		}

		const sessionId = Math.random().toString(36).slice(2, 10);
		sessions.set(sessionId, {
			bet,
			log: new Map(),
			updatedAt: Date.now(),
		});

		const results = games.map((game) => {
			const header = text(context, `${game.i18nKey}.header`, bet);
			const keyboard = buildKeyboard(sessionId, game, bet, (key) =>
				text(context, key),
			);

			return InlineQueryResult.article(
				game.id,
				text(context, `${game.i18nKey}.title`, bet),
				InputMessageContent.text(header),
				{
					description: text(context, `${game.i18nKey}.desc`, bet),
					reply_markup: keyboard,
				},
			);
		});

		await context.answer([balanceArticle, ...results], {
			cache_time: 0,
			is_personal: true,
		});
	})

	.inlineQuery(
		() => true,
		async (context) => {
			if (skipBot(context)) return;
			const userId = context.from.id;
			await ensureUser(userId, {
				name: context.from.firstName,
				username: context.from.username,
				languageCode: context.from.languageCode,
			});
			const { bipki: balance } = await getBalance(userId);

			await context.answer(
				[
					InlineQueryResult.article(
						"balance",
						text(context, "games.balance_title", balance),
						InputMessageContent.text(
							text(context, "games.balance_text", balance),
						),
						{ description: text(context, "games.balance_desc") },
					),
					InlineQueryResult.article(
						"help",
						text(context, "games.help_title"),
						InputMessageContent.text(text(context, "games.help_text")),
						{ description: text(context, "games.help_desc") },
					),
				],
				{ cache_time: 0, is_personal: true },
			);
		},
	)

	.callbackQuery(gameAction, async (context) => {
		if (skipBot(context)) return;
		const { s: sessionId, g: gameId, b: bet, a: action } = context.queryData;
		const game = games.find((g) => g.id === gameId);
		if (!game) {
			await context.answer("❌ Game not found");
			return;
		}

		let session = sessions.get(sessionId);
		if (!session) {
			session = { bet, log: new Map(), updatedAt: Date.now() };
			sessions.set(sessionId, session);
		}
		session.updatedAt = Date.now();

		const userId = context.from.id;

		if (action === "x2" || action === "x05") {
			const multiplier = action === "x2" ? 2 : 0.5;
			const newBet = clampBet(Math.floor(bet * multiplier));
			session.bet = newBet;

			const header = text(context, `${game.i18nKey}.header`, newBet);
			const keyboard = buildKeyboard(sessionId, game, newBet, (key) =>
				text(context, key),
			);
			const logText = buildLogText(context, session.log);
			const messageText = logText ? `${header}\n\n${logText}` : header;

			try {
				await context.editText(messageText, { reply_markup: keyboard });
			} catch {
				// rate-limited; cosmetic only, state is already correct
			}
			await context.answer({
				text: text(context, "games.bet_changed", newBet),
			});
			return;
		}

		await ensureUser(userId, {
			name: context.from.firstName,
			username: context.from.username,
			languageCode: context.from.languageCode,
		});

		const balance = await getBalance(userId);
		if (balance.bipki < bet) {
			await context.answer({
				text: text(context, "games.insufficient_funds"),
				show_alert: true,
			});
			return;
		}

		const result = game.resolve(bet, action);

		try {
			if (result.win) {
				await addCoins(
					userId,
					bet,
					"bipki",
					"game_win",
					`${game.emoji} ${game.id} win (bet ${bet})`,
				);
			} else {
				await removeCoins(
					userId,
					bet,
					"bipki",
					"game_lose",
					`${game.emoji} ${game.id} loss (bet ${bet})`,
				);
			}
		} catch {
			await context.answer({
				text: "❌ Error processing game",
				show_alert: true,
			});
			return;
		}

		const payout = result.win ? bet * 2 : 0;
		await db
			.insert(gameLogTable)
			.values({
				userId,
				game: game.id,
				bet,
				currency: "bipki",
				choice: action,
				win: result.win,
				payout,
			})
			.run();

		const prevEntry = session.log.get(userId);
		const playerName = prevEntry
			? ""
			: context.from.username || context.from.firstName;

		session.log.set(userId, {
			userId,
			player: playerName,
			emoji: result.outcomeEmoji,
			won: result.win,
			amount: result.win ? bet * 2 : bet,
		});

		const newBalance = await getBalance(userId);
		const header = text(context, `${game.i18nKey}.header`, session.bet);
		const logText = buildLogText(context, session.log);
		const messageText = logText ? `${header}\n\n${logText}` : header;
		const keyboard = buildKeyboard(sessionId, game, session.bet, (key) =>
			text(context, key),
		);

		try {
			await context.editText(messageText, { reply_markup: keyboard });
		} catch {
			// rate-limited; cosmetic only, state is already correct
		}

		const toast = result.win
			? text(context, "games.toast_win", bet, newBalance.bipki)
			: text(context, "games.toast_lose", bet, newBalance.bipki);
		await context.answer(toast);
	});
