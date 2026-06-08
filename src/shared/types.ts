export interface ApiUser {
	id: number;
	name: string | null;
	username: string | null;
	languageCode: string | null;
	bipki: number;
	megabipki: number;
	lastDailyBonus: string | null;
	dailyRewardStreak: number;
	createdAt: string;
}

export interface ApiTransaction {
	id: number;
	fromUserId: number | null;
	toUserId: number | null;
	amount: number;
	currency: string;
	type: string;
	description: string | null;
	createdAt: string;
}

export interface ApiTunnelInfo {
	url: string | null;
	status: "starting" | "running" | "stopped" | "error";
	error?: string;
	startedAt: string | null;
}

export interface ApiStats {
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
	tunnel: ApiTunnelInfo;
}

export interface DailyRewardTier {
	day: number;
	bipki: number;
	megabipki: number;
}

export interface ApiMeResponse {
	user: ApiUser;
	transactions: ApiTransaction[];
	rank: number;
	isAdmin: boolean;
	dailyRewardTiers: DailyRewardTier[];
}

export interface ApiMeSummaryResponse {
	bipki: number;
	megabipki: number;
	lastDailyBonus: string | null;
	dailyRewardStreak: number;
	rank: number;
}

export interface ApiUsersResponse {
	users: ApiUser[];
	total: number;
	page: number;
	pages: number;
}

export interface ApiTransferRecipient {
	id: number;
	name: string | null;
	username: string | null;
	bipki: number;
}
