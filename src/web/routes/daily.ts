import {
	ensureUserFromInitData,
	json,
	unauthorized,
	validateInitData,
} from "../middleware.ts";
import type { RouteDef } from "../router.ts";

export const dailyRoute: RouteDef = {
	method: "POST",
	pattern: "/api/daily",
	handler: async (req) => {
		const body = (await req.json()) as Record<string, unknown>;

		const auth = validateInitData(body);
		if (!auth) return unauthorized("Invalid init data");

		await ensureUserFromInitData(auth.user);

		const { claimDailyBonus } = await import("../../services/economy.ts");

		try {
			const bonus = await claimDailyBonus(auth.user.id);
			return json(bonus);
		} catch (err) {
			return json(
				{ error: err instanceof Error ? err.message : "Unknown error" },
				400,
			);
		}
	},
};
