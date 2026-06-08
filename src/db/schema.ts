import {
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
	id: integer("id", { mode: "number" }).primaryKey(),

	name: text("name"),
	username: text("username"),
	startParameter: text("start_parameter"),

	languageCode: text("language_code"),

	bipki: integer("bipki").notNull().default(0),
	megabipki: integer("megabipki").notNull().default(0),

	lastDailyBonus: text("last_daily_bonus"),
	dailyRewardStreak: integer("daily_reward_streak").notNull().default(0),

	createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const transactionsTable = sqliteTable("transactions", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),

	fromUserId: integer("from_user_id", { mode: "number" }),
	toUserId: integer("to_user_id", { mode: "number" }),

	amount: integer("amount").notNull(),
	currency: text("currency").notNull(),
	type: text("type").notNull(),

	description: text("description"),

	createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export const chatMembersTable = sqliteTable(
	"chat_members",
	{
		chatId: integer("chat_id", { mode: "number" }).notNull(),
		userId: integer("user_id", { mode: "number" }).notNull(),
		createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.chatId, table.userId] }),
	}),
);

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;

export const gameLogTable = sqliteTable("game_log", {
	id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
	userId: integer("user_id", { mode: "number" }).notNull(),
	game: text("game").notNull(),
	bet: integer("bet").notNull(),
	currency: text("currency").notNull().default("bipki"),
	choice: text("choice"),
	win: integer("win", { mode: "boolean" }).notNull(),
	payout: integer("payout").notNull(),
	createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

export type Transaction = typeof transactionsTable.$inferSelect;
export type InsertTransaction = typeof transactionsTable.$inferInsert;

export type GameLog = typeof gameLogTable.$inferSelect;
export type InsertGameLog = typeof gameLogTable.$inferInsert;
