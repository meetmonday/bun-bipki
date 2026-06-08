import { tunnelManager } from "../../services/tunnel.ts";
import { json } from "../middleware.ts";
import type { RouteDef } from "../router.ts";

export const tunnelRoute: RouteDef = {
	method: "GET",
	pattern: "/api/tunnel",
	handler: () => json(tunnelManager.getInfo()),
};
