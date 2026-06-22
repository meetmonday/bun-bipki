import "./setup.ts";
import { expect, test } from "bun:test";
import { healthRoute } from "../src/web/routes/health.ts";

test("health endpoint returns 200", async () => {
	const req = new Request("http://localhost/api/health");
	const response = await healthRoute.handler(req, {}, new URL(req.url));
	const body = (await response.json()) as Record<string, unknown>;

	expect(response.status).toBe(200);
	expect(body.status).toBe("ok");
	expect(typeof body.uptime).toBe("number");
	expect(body.checks).toBeTruthy();
});
