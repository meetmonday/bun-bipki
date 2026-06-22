export class RateLimiter {
	private store = new Map<string, number[]>();
	private readonly windowMs: number;
	private readonly maxRequests: number;

	constructor(windowMs: number, maxRequests: number) {
		this.windowMs = windowMs;
		this.maxRequests = maxRequests;
	}

	check(key: string): boolean {
		const now = Date.now();
		const timestamps = this.store.get(key) ?? [];
		const valid = timestamps.filter((t) => now - t < this.windowMs);

		if (valid.length >= this.maxRequests) {
			this.store.set(key, valid);
			return false;
		}

		valid.push(now);
		this.store.set(key, valid);
		return true;
	}

	reset(key: string): void {
		this.store.delete(key);
	}
}

export const transferLimiter = new RateLimiter(10_000, 3);
export const dailyLimiter = new RateLimiter(60_000, 2);
export const gameLimiter = new RateLimiter(5_000, 5);
