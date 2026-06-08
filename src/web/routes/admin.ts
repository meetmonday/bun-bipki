import { config } from "../../config.ts";
import {
	ensureUserFromInitData,
	json,
	validateInitData,
} from "../middleware.ts";
import type { RouteDef } from "../router.ts";

export const adminCheckRoute: RouteDef = {
	method: "POST",
	pattern: "/api/admin/check",
	handler: async (req) => {
		const body = (await req.json()) as { initData?: string };

		if (!body.initData) {
			return json({ isAdmin: false, reason: "no_init_data" });
		}

		const auth = validateInitData(body);
		if (auth) await ensureUserFromInitData(auth.user);

		if (!auth) {
			return json({ isAdmin: false, reason: "invalid_init_data" });
		}

		const isAdmin = config.ADMIN_IDS.includes(auth.user.id);
		return json({
			isAdmin,
			reason: isAdmin ? "ok" : "not_in_admin_ids",
			user: { id: auth.user.id, first_name: auth.user.firstName },
		});
	},
};
