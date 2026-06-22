export class Mutex {
	private locked = false;
	private queue: Array<() => void> = [];

	async acquire(): Promise<() => void> {
		if (!this.locked) {
			this.locked = true;
			return this.release.bind(this);
		}

		return new Promise<() => void>((resolve) => {
			this.queue.push(() => {
				this.locked = true;
				resolve(this.release.bind(this));
			});
		});
	}

	private release(): void {
		const next = this.queue.shift();
		if (next) {
			next();
		} else {
			this.locked = false;
		}
	}

	async run<T>(fn: () => Promise<T>): Promise<T> {
		const release = await this.acquire();
		try {
			return await fn();
		} finally {
			release();
		}
	}
}

const locks = new Map<string, Mutex>();

function getLock(key: string): Mutex {
	let lock = locks.get(key);
	if (!lock) {
		lock = new Mutex();
		locks.set(key, lock);
	}
	return lock;
}

export function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
	return getLock(key).run(fn);
}

export function userLock(userId: number): string {
	return `user:${userId}`;
}

export function transferLock(fromId: number, toId: number): string {
	const ids = [fromId, toId].sort().join(":");
	return `transfer:${ids}`;
}
