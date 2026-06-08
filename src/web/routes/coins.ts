import {
	badRequest,
	getSecretFromQuery,
	json,
	requireSecret,
	unauthorized,
} from "../middleware.ts";
import type { RouteDef } from "../router.ts";

type CoinsBody = { userId?: number; amount?: number; currency?: string };

function getSecretRoute(action: "add" | "remove"): RouteDef {
	return {
		method: "POST",
		pattern: `/api/coins/${action}`,
		handler: async (req, _params, url) => {
			const token = getSecretFromQuery(url);
			if (!token || !requireSecret(token)) return unauthorized();

			const body = (await req.json()) as CoinsBody;
			if (!body.userId || !body.amount || !body.currency) {
				return badRequest("userId, amount, and currency are required");
			}

			const { addCoins, removeCoins } = await import(
				"../../services/economy.ts"
			);

			try {
				if (action === "add") {
					await addCoins(
						body.userId,
						body.amount,
						body.currency as "bipki" | "megabipki",
						"web_admin",
					);
				} else {
					await removeCoins(
						body.userId,
						body.amount,
						body.currency as "bipki" | "megabipki",
						"web_admin",
					);
				}
				return json({ success: true });
			} catch (err) {
				return json(
					{ error: err instanceof Error ? err.message : "Unknown error" },
					400,
				);
			}
		},
	};
}

export const addCoinsRoute = getSecretRoute("add");
export const removeCoinsRoute = getSecretRoute("remove");
