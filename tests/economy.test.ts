import "./setup.ts";
import { beforeEach, expect, test } from "bun:test";
import { db } from "../src/db/index.ts";
import {
	gameLogTable,
	transactionsTable,
	usersTable,
} from "../src/db/schema.ts";
import {
	addCoins,
	claimDailyBonus,
	getBalance,
	getDailyRewardState,
	removeCoins,
	transfer,
} from "../src/services/economy.ts";

let nextId = 100_000;
function freshId(): number {
	return nextId++;
}

async function seedUser(id: number, bipki = 1000) {
	await db.insert(usersTable).values({ id, bipki, megabipki: 0 }).run();
}

beforeEach(() => {
	db.delete(usersTable).run();
	db.delete(transactionsTable).run();
	db.delete(gameLogTable).run();
});

test("transfer: successful transfer deducts and credits", async () => {
	const fromId = freshId();
	const toId = freshId();
	await seedUser(fromId, 1000);
	await seedUser(toId, 0);

	await transfer(fromId, toId, 100);

	const from = await getBalance(fromId);
	const to = await getBalance(toId);

	expect(from.bipki).toBe(900);
	expect(to.bipki).toBe(100);
});

test("transfer: insufficient funds throws", async () => {
	const fromId = freshId();
	const toId = freshId();
	await seedUser(fromId, 50);
	await seedUser(toId, 0);

	expect(transfer(fromId, toId, 100)).rejects.toThrow("Insufficient funds");
});

test("transfer: sender not found throws", async () => {
	await expect(transfer(9999, freshId(), 100)).rejects.toThrow(
		"Sender not found",
	);
});

test("addCoins: adds to bipki", async () => {
	const id = freshId();
	await seedUser(id);
	await addCoins(id, 500, "bipki", "test");
	const { bipki, megabipki } = await getBalance(id);
	expect(bipki).toBe(1500);
	expect(megabipki).toBe(0);
});

test("addCoins: adds to megabipki", async () => {
	const id = freshId();
	await seedUser(id);
	await addCoins(id, 10, "megabipki", "test");
	const { megabipki } = await getBalance(id);
	expect(megabipki).toBe(10);
});

test("removeCoins: deducts from bipki", async () => {
	const id = freshId();
	await seedUser(id);
	await removeCoins(id, 300, "bipki", "test");
	const { bipki } = await getBalance(id);
	expect(bipki).toBe(700);
});

test("removeCoins: insufficient funds throws", async () => {
	const id = freshId();
	await seedUser(id, 50);
	expect(removeCoins(id, 100, "bipki", "test")).rejects.toThrow(
		"Insufficient funds",
	);
});

test("claimDailyBonus: first claim gives day 1 reward", async () => {
	const id = freshId();
	await seedUser(id);

	const { bipki: before } = await getBalance(id);
	const result = await claimDailyBonus(id);
	const { bipki: after } = await getBalance(id);

	expect(result.streak).toBe(1);
	expect(result.bipki).toBeGreaterThan(0);
	expect(after - before).toBe(result.bipki);
});

test("claimDailyBonus: cannot claim twice in one day", async () => {
	const id = freshId();
	await seedUser(id);
	await claimDailyBonus(id);
	expect(claimDailyBonus(id)).rejects.toThrow("Already claimed today");
});

test("getDailyRewardState: shows canClaim when not claimed", async () => {
	const id = freshId();
	await seedUser(id);
	const state = await getDailyRewardState(id);
	expect(state.canClaim).toBe(true);
});
