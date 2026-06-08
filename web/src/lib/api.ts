import type {
	ApiMeResponse,
	ApiMeSummaryResponse,
	ApiStats,
	ApiTransaction,
	ApiTransferRecipient,
	ApiTunnelInfo,
	ApiUser,
	ApiUsersResponse,
	DailyRewardTier,
} from "@shared/types";

export type {
	ApiMeResponse as MeResponse,
	ApiStats as Stats,
	ApiTransaction as Transaction,
	ApiTransferRecipient as TransferRecipient,
	ApiTunnelInfo as TunnelInfo,
	ApiUser as User,
	ApiUsersResponse as UsersResponse,
	DailyRewardTier,
};

export interface DailyRewardState {
	claimed: number;
	next: number;
	canClaim: boolean;
	tiers: DailyRewardTier[];
}

const BASE = "";

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

export async function fetchMe(initData: string): Promise<ApiMeResponse> {
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

export async function fetchMeSummary(
	initData: string,
): Promise<ApiMeSummaryResponse> {
	const res = await fetch(`${BASE}/api/me/summary`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ initData }),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error || "Failed to fetch summary");
	}
	return res.json();
}

export async function fetchStats(): Promise<ApiStats> {
	const res = await fetch(`${BASE}/api/stats`);
	return res.json();
}

export async function fetchTransactions(
	limit = 30,
): Promise<{ transactions: ApiTransaction[] }> {
	const res = await fetch(`${BASE}/api/transactions?limit=${limit}`);
	return res.json();
}

export async function fetchUser(
	id: number,
): Promise<{ user: ApiUser; transactions: ApiTransaction[] }> {
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

export async function fetchUsers(page = 1): Promise<ApiUsersResponse> {
	const res = await fetch(`${BASE}/api/users?page=${page}`);
	return res.json();
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

export async function removeCoins(
	token: string,
	userId: number,
	amount: number,
	currency: string,
): Promise<void> {
	const res = await fetch(
		`${BASE}/api/coins/remove?token=${encodeURIComponent(token)}`,
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

export async function claimDailyBonus(
	initData: string,
): Promise<{ bipki: number; megabipki: number; streak: number }> {
	const res = await fetch(`${BASE}/api/daily`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ initData }),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error || "Failed to claim daily bonus");
	}
	return res.json();
}

export async function fetchUserByUsername(
	initData: string,
	username: string,
): Promise<{ id: number; name: string | null; username: string | null }> {
	const res = await fetch(`${BASE}/api/users/by-username`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ initData, username }),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error || "User not found");
	}
	return res.json();
}

export async function fetchTransfer(
	initData: string,
	toUserId: number,
	amount: number,
): Promise<{ success: boolean }> {
	const res = await fetch(`${BASE}/api/transfer`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ initData, toUserId, amount }),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error || "Transfer failed");
	}
	return res.json();
}

export async function fetchTransferRecipients(
	initData: string,
): Promise<ApiTransferRecipient[]> {
	const res = await fetch(`${BASE}/api/transfer/recipients`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ initData }),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error || "Failed to fetch recipients");
	}
	const data = await res.json();
	return data.recipients ?? [];
}
