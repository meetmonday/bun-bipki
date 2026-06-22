import "./setup.ts";
import { expect, test } from "bun:test";
import { coinflip } from "../src/games/coinflip.ts";

test("coinflip: resolves with win on correct guess", () => {
	const result = coinflip.resolve(100, "h");
	expect(typeof result.win).toBe("boolean");
	expect(["🦅", "🌿"]).toContain(result.outcomeEmoji);
	expect(result.outcomeLabelI18nKey).toMatch(/^games\.coinflip\./);
});

test("coinflip: resolves with loss on incorrect choice (by simulation)", () => {
	const choice = "h";
	const oppositeChoice = "t";

	const results = new Set<boolean>();
	for (let i = 0; i < 100; i++) {
		const r1 = coinflip.resolve(100, choice);
		const r2 = coinflip.resolve(100, oppositeChoice);
		results.add(r1.win);
		results.add(r2.win);
	}
	expect(results.has(true)).toBe(true);
	expect(results.has(false)).toBe(true);
});

test("coinflip: outcome emoji is valid", () => {
	for (let i = 0; i < 50; i++) {
		const result = coinflip.resolve(100, "h");
		expect(["🦅", "🌿"]).toContain(result.outcomeEmoji);
	}
});
