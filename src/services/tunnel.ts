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
	private stdoutBuf = "";
	private stderrBuf = "";

	private readonly URL_RE =
		/https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)*\.(?:trycloudflare|cfargotunnel)\.com/;

	waitForUrl(timeoutMs = 30_000): Promise<string> {
		if (this.info.url) return Promise.resolve(this.info.url);

		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.urlResolve = null;
				this.urlReject = null;
				reject(new Error("Tunnel URL not received within timeout"));
			}, timeoutMs);

			this.urlResolve = (url: string) => {
				clearTimeout(timer);
				resolve(url);
			};
			this.urlReject = (err: Error) => {
				clearTimeout(timer);
				reject(err);
			};
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
		this.stdoutBuf = "";
		this.stderrBuf = "";

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

		const onChunk = (chunk: string, stream: "stdout" | "stderr") => {
			if (stream === "stdout") {
				this.stdoutBuf += chunk;
			} else {
				this.stderrBuf += chunk;
			}

			const match =
				this.stdoutBuf.match(this.URL_RE) ?? this.stderrBuf.match(this.URL_RE);

			if (match && !this.info.url) {
				this.onUrl(match[0]);
			}

			const maxLen = 2048;
			if (this.stdoutBuf.length > maxLen) {
				this.stdoutBuf = this.stdoutBuf.slice(-maxLen);
			}
			if (this.stderrBuf.length > maxLen) {
				this.stderrBuf = this.stderrBuf.slice(-maxLen);
			}
		};

		this.process.stdout?.on("data", (data: Buffer) => {
			onChunk(data.toString(), "stdout");
		});

		this.process.stderr?.on("data", (data: Buffer) => {
			onChunk(data.toString(), "stderr");

			const text = data.toString();
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

	private onUrl(url: string) {
		this.info = { ...this.info, url, status: "running" };
		const border = "═".repeat(url.length + 4);
		console.log(`\n  ╔${border}╗`);
		console.log(`  ║  🌐 Web UI: ${url}  ║`);
		console.log(`  ╚${border}╝\n`);
		this.urlResolve?.(url);
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
