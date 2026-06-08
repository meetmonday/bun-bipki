import {
	getBotTokenSecretKey,
	validateAndParseInitData,
} from "@gramio/init-data";
import { config } from "../config.ts";

export const initDataSecretKey = getBotTokenSecretKey(config.BOT_TOKEN);

export function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export function requireSecret(token: string | null): boolean {
	return !!token && !!config.WEB_SECRET && token === config.WEB_SECRET;
}

export function getSecretFromQuery(url: URL): string | null {
	return url.searchParams.get("token");
}

export interface InitDataUser {
	id: number;
	firstName?: string;
	username?: string;
	languageCode?: string;
}

export function validateInitData(
	body: Record<string, unknown>,
): { user: InitDataUser } | null {
	const initData = body.initData;
	if (typeof initData !== "string") return null;

	const result = validateAndParseInitData(initData, initDataSecretKey);
	if (!result) return null;
	if (!result.user) return null;

	return {
		user: {
			id: result.user.id,
			firstName: result.user.first_name,
			username: result.user.username,
			languageCode: result.user.language_code,
		},
	};
}

export async function ensureUserFromInitData(
	user: InitDataUser,
): Promise<void> {
	const { ensureUser } = await import("../services/economy.ts");
	await ensureUser(user.id, {
		name: user.firstName ?? null,
		username: user.username ?? null,
		languageCode: user.languageCode ?? null,
	});
}

export function unauthorized(message = "Unauthorized"): Response {
	return json({ error: message }, 401);
}

export function badRequest(message: string): Response {
	return json({ error: message }, 400);
}

export function notFound(message = "Not found"): Response {
	return json({ error: message }, 404);
}
