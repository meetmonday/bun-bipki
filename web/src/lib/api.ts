const BASE = "";

/**
 * Извлекает raw initData строку из Telegram Web App.
 * На мобильных устройствах: window.Telegram.WebApp.initData
 * На Telegram Desktop: из URL hash (#tgWebAppData=...)
 */
export function getTelegramInitData(): string | null {
	const tg = window.Telegram?.WebApp;
	if (tg?.initData) return tg.initData;

	const hash = location.hash;
	if (!hash) return null;

	const params = new URLSearchParams(hash.replace(/^#/, ""));
	const data = params.get("tgWebAppData");
	if (!data) return null;

	return decodeURIComponent(data);
}

export interface TunnelInfo {
	url: string | null;
	status: "starting" | "running" | "stopped" | "error";
	error?: string;
	startedAt: string | null;
}

export interface Stats {
	users: { total: number };
	economy: { totalBipki: number; totalMegabipki: number };
	transactions: { today: number };
	topUsers: Array<{
		id: number;
		name: string | null;
		username: string | null;
		bipki: number;
		megabipki: number;
	}>;
	tunnel: TunnelInfo;
}

export interface Transaction {
	id: number;
	fromUserId: number | null;
	toUserId: number | null;
	amount: number;
	currency: string;
	type: string;
	description: string | null;
	createdAt: string;
}

export interface User {
	id: number;
	name: string | null;
	username: string | null;
	bipki: number;
	megabipki: number;
	createdAt: string;
}

export interface MeResponse {
	user: User;
	transactions: Transaction[];
	rank: number;
	isAdmin: boolean;
}

export async function fetchMe(initData: string): Promise<MeResponse> {
	const res = await fetch(`${BASE}/api/me`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ initData }),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error || "Failed to fetch user data");
	}
	return res.json();
}

export async function fetchStats(): Promise<Stats> {
	const res = await fetch(`${BASE}/api/stats`);
	return res.json();
}

export async function fetchTransactions(
	limit = 30,
): Promise<{ transactions: Transaction[] }> {
	const res = await fetch(`${BASE}/api/transactions?limit=${limit}`);
	return res.json();
}

export async function fetchUsers(
	page = 1,
): Promise<{ users: User[]; total: number; pages: number }> {
	const res = await fetch(`${BASE}/api/users?page=${page}`);
	return res.json();
}

export async function fetchUser(
	id: number,
): Promise<{ user: User; transactions: Transaction[] }> {
	const res = await fetch(`${BASE}/api/users/${id}`);
	if (!res.ok) throw new Error("User not found");
	return res.json();
}

export async function broadcast(
	token: string,
	message: string,
): Promise<{ sent: number; failed: number; total: number }> {
	const res = await fetch(
		`${BASE}/api/broadcast?token=${encodeURIComponent(token)}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ message }),
		},
	);
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error);
	}
	return res.json();
}

export async function checkAdmin(
	initData: string,
): Promise<{ isAdmin: boolean; reason?: string }> {
	try {
		const res = await fetch(`${BASE}/api/admin/check`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ initData }),
		});
		return res.json();
	} catch {
		return { isAdmin: false };
	}
}

export async function addCoins(
	token: string,
	userId: number,
	amount: number,
	currency: string,
): Promise<void> {
	const res = await fetch(
		`${BASE}/api/coins/add?token=${encodeURIComponent(token)}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ userId, amount, currency }),
		},
	);
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error);
	}
}
