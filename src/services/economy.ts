import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { transactionsTable, usersTable } from "../db/schema.ts";

const DAILY_BONUS_AMOUNT = 100;
const DAILY_MEGA_BONUS_AMOUNT = 1;

export type Currency = "bipki" | "megabipki";

export async function ensureUser(
	userId: number,
	data: {
		name?: string | null;
		username?: string | null;
		languageCode?: string | null;
		startParameter?: string | null;
	},
) {
	const existing = await db
		.select()
		.from(usersTable)
		.where(eq(usersTable.id, userId))
		.get();

	if (existing) return existing;

	await db
		.insert(usersTable)
		.values({ id: userId, ...data })
		.run();

	return db
		.select()
		.from(usersTable)
		.where(eq(usersTable.id, userId))
		.get() as typeof existing;
}

export async function getBalance(userId: number) {
	const user = await db
		.select({
			bipki: usersTable.bipki,
			megabipki: usersTable.megabipki,
		})
		.from(usersTable)
		.where(eq(usersTable.id, userId))
		.get();

	return user ?? { bipki: 0, megabipki: 0 };
}

export async function transfer(
	fromId: number,
	toId: number,
	amount: number,
	description?: string,
) {
	return db.transaction(async (tx) => {
		const fromUser = await tx
			.select()
			.from(usersTable)
			.where(eq(usersTable.id, fromId))
			.get();

		if (!fromUser) throw new Error("Sender not found");

		if (fromUser.bipki < amount) throw new Error("Insufficient funds");

		const toUser = await tx
			.select()
			.from(usersTable)
			.where(eq(usersTable.id, toId))
			.get();

		if (!toUser) throw new Error("Recipient not found");

		await tx
			.update(usersTable)
			.set({ bipki: sql`${usersTable.bipki} - ${amount}` })
			.where(eq(usersTable.id, fromId))
			.run();

		await tx
			.update(usersTable)
			.set({ bipki: sql`${usersTable.bipki} + ${amount}` })
			.where(eq(usersTable.id, toId))
			.run();

		await tx
			.insert(transactionsTable)
			.values({
				fromUserId: fromId,
				toUserId: toId,
				amount,
				currency: "bipki",
				type: "transfer",
				description: description ?? null,
			})
			.run();
	});
}

export async function addCoins(
	userId: number,
	amount: number,
	currency: Currency,
	type: string,
	description?: string,
) {
	return db.transaction(async (tx) => {
		if (currency === "bipki") {
			await tx
				.update(usersTable)
				.set({ bipki: sql`${usersTable.bipki} + ${amount}` })
				.where(eq(usersTable.id, userId))
				.run();
		} else {
			await tx
				.update(usersTable)
				.set({ megabipki: sql`${usersTable.megabipki} + ${amount}` })
				.where(eq(usersTable.id, userId))
				.run();
		}

		await tx
			.insert(transactionsTable)
			.values({
				toUserId: userId,
				amount,
				currency,
				type,
				description: description ?? null,
			})
			.run();
	});
}

export async function removeCoins(
	userId: number,
	amount: number,
	currency: Currency,
	type: string,
	description?: string,
) {
	return db.transaction(async (tx) => {
		const user = await tx
			.select()
			.from(usersTable)
			.where(eq(usersTable.id, userId))
			.get();

		if (!user) throw new Error("User not found");

		const balance = currency === "bipki" ? user.bipki : user.megabipki;

		if (balance < amount) throw new Error("Insufficient funds");

		if (currency === "bipki") {
			await tx
				.update(usersTable)
				.set({ bipki: sql`${usersTable.bipki} - ${amount}` })
				.where(eq(usersTable.id, userId))
				.run();
		} else {
			await tx
				.update(usersTable)
				.set({ megabipki: sql`${usersTable.megabipki} - ${amount}` })
				.where(eq(usersTable.id, userId))
				.run();
		}

		await tx
			.insert(transactionsTable)
			.values({
				fromUserId: userId,
				amount,
				currency,
				type,
				description: description ?? null,
			})
			.run();
	});
}

export async function claimDailyBonus(userId: number) {
	return db.transaction(async (tx) => {
		const user = await tx
			.select()
			.from(usersTable)
			.where(eq(usersTable.id, userId))
			.get();

		if (!user) throw new Error("User not found");

		const today = new Date().toISOString().slice(0, 10);

		if (user.lastDailyBonus?.startsWith(today)) {
			throw new Error("Already claimed today");
		}

		await tx
			.update(usersTable)
			.set({
				bipki: sql`${usersTable.bipki} + ${DAILY_BONUS_AMOUNT}`,
				megabipki: sql`${usersTable.megabipki} + ${DAILY_MEGA_BONUS_AMOUNT}`,
				lastDailyBonus: new Date().toISOString(),
			})
			.where(eq(usersTable.id, userId))
			.run();

		await tx
			.insert(transactionsTable)
			.values({
				toUserId: userId,
				amount: DAILY_BONUS_AMOUNT,
				currency: "bipki",
				type: "daily_bonus",
				description: "Ежедневный бонус",
			})
			.run();

		await tx
			.insert(transactionsTable)
			.values({
				toUserId: userId,
				amount: DAILY_MEGA_BONUS_AMOUNT,
				currency: "megabipki",
				type: "daily_bonus",
				description: "Ежедневный мега-бонус",
			})
			.run();

		return { bipki: DAILY_BONUS_AMOUNT, megabipki: DAILY_MEGA_BONUS_AMOUNT };
	});
}

export async function getUser(userId: number) {
	return db.select().from(usersTable).where(eq(usersTable.id, userId)).get();
}

export async function getTransactionHistory(userId: number, limit = 10) {
	return db
		.select()
		.from(transactionsTable)
		.where(
			sql`${transactionsTable.fromUserId} = ${userId} OR ${transactionsTable.toUserId} = ${userId}`,
		)
		.orderBy(sql`${transactionsTable.createdAt} DESC`)
		.limit(limit)
		.all();
}
