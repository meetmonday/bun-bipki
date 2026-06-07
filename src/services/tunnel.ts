import { type ChildProcess, spawn } from "node:child_process";

export interface TunnelInfo {
	url: string | null;
	status: "starting" | "running" | "stopped" | "error";
	error?: string;
	startedAt: string | null;
}

export class TunnelManager {
	private process: ChildProcess | null = null;
	private info: TunnelInfo = {
		url: null,
		status: "stopped",
		startedAt: null,
	};
	private abortController: AbortController | null = null;
	private urlResolve: ((url: string) => void) | null = null;
	private urlReject: ((err: Error) => void) | null = null;

	waitForUrl(): Promise<string> {
		if (this.info.url) return Promise.resolve(this.info.url);
		return new Promise((resolve, reject) => {
			this.urlResolve = resolve;
			this.urlReject = reject;
		});
	}

	getInfo(): TunnelInfo {
		return this.info;
	}

	async start(targetUrl: string, token?: string): Promise<void> {
		if (this.process) {
			this.stop();
		}

		this.info = {
			url: null,
			status: "starting",
			startedAt: new Date().toISOString(),
		};

		const args = token
			? ["tunnel", "run", "--token", token]
			: ["tunnel", "--url", targetUrl];

		this.abortController = new AbortController();

		try {
			this.process = spawn("cloudflared", args, {
				stdio: ["ignore", "pipe", "pipe"],
				signal: this.abortController.signal,
			});
		} catch (err) {
			this.info = {
				url: null,
				status: "error",
				error: `Failed to spawn cloudflared: ${err instanceof Error ? err.message : String(err)}`,
				startedAt: this.info.startedAt,
			};
			return;
		}

		const onUrl = (url: string) => {
			this.info = { ...this.info, url, status: "running" };
			const border = "═".repeat(url.length + 4);
			console.log(`\n  ╔${border}╗`);
			console.log(`  ║  🌐 Web UI: ${url}  ║`);
			console.log(`  ╚${border}╝\n`);
			this.urlResolve?.(url);
		};

		this.process.stdout?.on("data", (data: Buffer) => {
			const text = data.toString();
			const urlMatch = text.match(
				/https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9]*\.trycloudflare\.com/,
			);
			if (urlMatch && !this.info.url) onUrl(urlMatch[0]);
		});

		this.process.stderr?.on("data", (data: Buffer) => {
			const text = data.toString();
			const urlMatch = text.match(
				/https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9]*\.trycloudflare\.com/,
			);
			if (urlMatch && !this.info.url) onUrl(urlMatch[0]);

			if (text.includes(" error ") || text.includes("Error:")) {
				console.error(`cloudflared: ${text.trim()}`);
			}
		});

		this.process.on("error", (err) => {
			if (err.name === "AbortError") return;
			this.info = {
				...this.info,
				status: "error",
				error: err.message,
			};
			this.urlReject?.(err);
			console.error(`cloudflared error: ${err.message}`);
		});

		this.process.on("exit", (code) => {
			if (this.info.status !== "stopped") {
				this.info = {
					...this.info,
					status: "error",
					error: `Process exited with code ${code}`,
				};
				this.urlReject?.(new Error(`Process exited with code ${code}`));
				console.log(`cloudflared exited with code ${code}`);
			}
		});
	}

	stop(): void {
		this.info = { url: null, status: "stopped", startedAt: null };
		if (this.process) {
			this.process.kill();
			this.process = null;
		}
		this.abortController?.abort();
		this.abortController = null;
	}
}

export const tunnelManager = new TunnelManager();
