import { asc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import { transactionsTable, usersTable } from "../db/schema.ts";

export type Currency = "bipki" | "megabipki";

export interface DailyRewardTier {
	day: number;
	bipki: number;
	megabipki: number;
}

export const DAILY_REWARDS: DailyRewardTier[] = [
	{ day: 1, bipki: 50, megabipki: 0 },
	{ day: 2, bipki: 70, megabipki: 0 },
	{ day: 3, bipki: 100, megabipki: 1 },
	{ day: 4, bipki: 120, megabipki: 0 },
	{ day: 5, bipki: 150, megabipki: 2 },
];

export function getDailyRewardByStreak(streak: number): DailyRewardTier {
	const index = Math.min(streak - 1, DAILY_REWARDS.length - 1);
	return (
		DAILY_REWARDS[Math.max(0, index)] ?? { day: 1, bipki: 0, megabipki: 0 }
	);
}

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

function yesterdayDate(): string {
	const d = new Date();
	d.setDate(d.getDate() - 1);
	return d.toISOString().slice(0, 10);
}

function todayDate(): string {
	return new Date().toISOString().slice(0, 10);
}

export interface DailyRewardState {
	streak: number;
	lastClaimDate: string | null;
	canClaim: boolean;
	reward: DailyRewardTier;
}

export async function getDailyRewardState(
	userId: number,
): Promise<DailyRewardState> {
	const user = await db
		.select()
		.from(usersTable)
		.where(eq(usersTable.id, userId))
		.get();

	if (!user)
		return {
			streak: 0,
			lastClaimDate: null,
			canClaim: true,
			reward: DAILY_REWARDS[0] ?? { day: 1, bipki: 0, megabipki: 0 },
		};

	const today = todayDate();
	const lastDate = user.lastDailyBonus?.slice(0, 10) ?? null;
	const yesterday = yesterdayDate();

	let streak = user.dailyRewardStreak;

	if (lastDate === today) {
		return {
			streak,
			lastClaimDate: lastDate,
			canClaim: false,
			reward: getDailyRewardByStreak(streak),
		};
	}

	if (lastDate !== yesterday) {
		streak = 0;
	}

	const nextStreak = streak + 1;
	return {
		streak: nextStreak,
		lastClaimDate: lastDate,
		canClaim: true,
		reward: getDailyRewardByStreak(nextStreak),
	};
}

export async function claimDailyBonus(userId: number) {
	return db.transaction(async (tx) => {
		const user = await tx
			.select()
			.from(usersTable)
			.where(eq(usersTable.id, userId))
			.get();

		if (!user) throw new Error("User not found");

		const today = todayDate();
		const lastDate = user.lastDailyBonus?.slice(0, 10);

		if (lastDate === today) {
			throw new Error("Already claimed today");
		}

		const yesterday = yesterdayDate();
		let newStreak = 0;

		if (lastDate === yesterday) {
			newStreak = user.dailyRewardStreak + 1;
		} else {
			newStreak = 1;
		}

		const reward = getDailyRewardByStreak(newStreak);

		await tx
			.update(usersTable)
			.set({
				bipki: sql`${usersTable.bipki} + ${reward.bipki}`,
				megabipki: sql`${usersTable.megabipki} + ${reward.megabipki}`,
				lastDailyBonus: new Date().toISOString(),
				dailyRewardStreak: newStreak,
			})
			.where(eq(usersTable.id, userId))
			.run();

		await tx
			.insert(transactionsTable)
			.values({
				toUserId: userId,
				amount: reward.bipki,
				currency: "bipki",
				type: "daily_bonus",
				description: `Ежедневный бонус (день ${newStreak})`,
			})
			.run();

		if (reward.megabipki > 0) {
			await tx
				.insert(transactionsTable)
				.values({
					toUserId: userId,
					amount: reward.megabipki,
					currency: "megabipki",
					type: "daily_bonus",
					description: `Ежедневный мега-бонус (день ${newStreak})`,
				})
				.run();
		}

		return { ...reward, streak: newStreak };
	});
}

export async function getUsers(offset: number, limit: number) {
	return db
		.select()
		.from(usersTable)
		.orderBy(asc(usersTable.id))
		.limit(limit)
		.offset(offset)
		.all();
}

export async function getUsersCount() {
	const result = await db
		.select({ count: sql<number>`count(*)` })
		.from(usersTable)
		.get();
	return result?.count ?? 0;
}

export async function getUser(userId: number) {
	return db.select().from(usersTable).where(eq(usersTable.id, userId)).get();
}

export async function getUserByUsername(username: string) {
	const clean = username.replace(/^@/, "").toLowerCase();
	return db
		.select()
		.from(usersTable)
		.where(sql`LOWER(${usersTable.username}) = ${clean}`)
		.get();
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
