import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
	id: integer("id", { mode: "number" }).primaryKey(),

	name: text("name"),
	username: text("username"),
	startParameter: text("start_parameter"),

	languageCode: text("language_code"),

	bipki: integer("bipki").notNull().default(0),
	megabipki: integer("megabipki").notNull().default(0),

	lastDailyBonus: text("last_daily_bonus"),

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

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;

export type Transaction = typeof transactionsTable.$inferSelect;
export type InsertTransaction = typeof transactionsTable.$inferInsert;
