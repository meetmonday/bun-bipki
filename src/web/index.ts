import { resolve, sep } from "node:path";
import { config } from "../config.ts";
import { logger } from "../services/logger.ts";
import { tunnelManager } from "../services/tunnel.ts";
import { json } from "./middleware.ts";
import { compileRoutes, type RouteDef } from "./router.ts";
import { adminCheckRoute } from "./routes/admin.ts";
import { broadcastRoute } from "./routes/broadcast.ts";
import { addCoinsRoute, removeCoinsRoute } from "./routes/coins.ts";
import { dailyRoute } from "./routes/daily.ts";
import { healthRoute } from "./routes/health.ts";
import { meRoute } from "./routes/me.ts";
import { meSummaryRoute } from "./routes/me-summary.ts";
import { statsRoute } from "./routes/stats.ts";
import { transactionsRoute } from "./routes/transactions.ts";
import { transferRecipientsRoute, transferRoute } from "./routes/transfer.ts";
import { tunnelRoute } from "./routes/tunnel.ts";
import {
	listUsersRoute,
	userByIdRoute,
	userByUsernameRoute,
} from "./routes/users.ts";

const routes: RouteDef[] = [
	healthRoute,
	statsRoute,
	listUsersRoute,
	userByIdRoute,
	userByUsernameRoute,
	transactionsRoute,
	tunnelRoute,
	broadcastRoute,
	addCoinsRoute,
	removeCoinsRoute,
	dailyRoute,
	transferRoute,
	transferRecipientsRoute,
	adminCheckRoute,
	meRoute,
	meSummaryRoute,
];

const resolveRoute = compileRoutes(routes);

const WEB_ROOT = resolve("web/build");

async function serveStatic(pathname: string): Promise<Response | null> {
	if (config.NODE_ENV !== "production") return null;

	const requested = resolve(WEB_ROOT, pathname.slice(1));
	if (requested !== WEB_ROOT && !requested.startsWith(WEB_ROOT + sep)) return null;

	const file = Bun.file(
		pathname === "/" ? `${WEB_ROOT}/index.html` : requested,
	);
	if (await file.exists()) {
		return new Response(file, {
			headers: {
				"Content-Type": file.type || "application/octet-stream",
			},
		});
	}

	const dirIndex = Bun.file(`${requested}/index.html`);
	if (await dirIndex.exists()) {
		return new Response(dirIndex, {
			headers: { "Content-Type": "text/html; charset=utf-8" },
		});
	}

	return null;
}

let server: ReturnType<typeof Bun.serve> | null = null;

interface WsData {
	upstream: WebSocket;
	buffer: (string | Blob)[];
}

export function startWebServer() {
	const port = config.WEB_PORT;

	if (config.CLOUDFLARE_TUNNEL_ENABLED && config.NODE_ENV !== "test") {
		const targetUrl = `http://localhost:${port}`;
		tunnelManager.start(targetUrl, config.CLOUDFLARE_TUNNEL_TOKEN || undefined);

		if (config.CLOUDFLARE_TUNNEL_URL) {
			tunnelManager.setUrl(config.CLOUDFLARE_TUNNEL_URL);
		}
	}

	server = Bun.serve({
		port,
		async fetch(req, server) {
			const url = new URL(req.url);
			const path = url.pathname;

			if (
				config.NODE_ENV === "development" &&
				req.headers.get("upgrade")?.toLowerCase() === "websocket"
			) {
				const upstreamUrl = `ws://localhost:5173${path}${url.search}`;
				const secWsProtocol =
					req.headers.get("sec-websocket-protocol") || undefined;
				const upstream = new WebSocket(upstreamUrl, secWsProtocol);
				upstream.onerror = () => {};

				const handshake = new Promise<void>((resolve, reject) => {
					const timer = setTimeout(
						() => reject(new Error("WebSocket handshake timed out")),
						5000,
					);
					upstream.onopen = () => {
						clearTimeout(timer);
						resolve();
					};
					upstream.onerror = () => {
						clearTimeout(timer);
						reject(new Error("Vite dev server not running on :5173"));
					};
				});

				try {
					await handshake;
				} catch (err) {
					logger.error(
						{
							upstreamUrl,
							err: err instanceof Error ? err.message : String(err),
						},
						"WebSocket relay: failed to connect to Vite",
					);
					upstream.close();
					return new Response(null, { status: 502 });
				}

				const buffer: (string | Blob)[] = [];
				upstream.onmessage = (event: MessageEvent) => {
					buffer.push(event.data);
				};

				const upgraded = server.upgrade(req, {
					data: { upstream, buffer },
				});

				if (!upgraded) {
					upstream.close();
					logger.error(
						{ path, host: req.headers.get("host") },
						"WebSocket relay: Bun rejected upgrade",
					);
					return new Response(null, { status: 400 });
				}

				return;
			}

			try {
				const matched = resolveRoute(req.method, path);
				if (matched) {
					return matched.handler(req, matched.params, url);
				}

				const staticRes = await serveStatic(path);
				if (staticRes) return staticRes;

				if (config.NODE_ENV === "development") {
					const upstreamUrl = `http://localhost:5173${url.pathname}${url.search}`;
					try {
						const headers = new Headers(req.headers);
						headers.set("host", "localhost:5173");
						const upstream = await fetch(upstreamUrl, {
							method: req.method,
							headers,
							body: req.body,
						});
						return new Response(upstream.body, upstream);
					} catch {
						return new Response(
							"SvelteKit dev server not running on :5173 — start with `bun dev:web`",
							{ status: 502 },
						);
					}
				}

				return new Response("Not Found", { status: 404 });
			} catch (err) {
				logger.error(
					{ err: err instanceof Error ? err.message : String(err) },
					"Web server error",
				);
				return json(
					{ error: err instanceof Error ? err.message : "Internal error" },
					500,
				);
			}
		},
		websocket: {
			open(ws) {
				const { upstream, buffer } = ws.data as WsData;
				upstream.onmessage = (event: MessageEvent) => {
					try {
						ws.send(event.data as string);
					} catch {
						upstream.close();
					}
				};
				for (const msg of buffer) {
					try {
						ws.send(msg as string);
					} catch {
						break;
					}
				}
				buffer.length = 0;
				upstream.onclose = () => {
					try {
						ws.close();
					} catch {}
				};
				upstream.onerror = () => {
					try {
						ws.close();
					} catch {}
				};
			},
			message(ws, msg) {
				try {
					(ws.data as WsData).upstream.send(msg);
				} catch {
					ws.close();
				}
			},
			close(ws) {
				try {
					(ws.data as WsData).upstream.close();
				} catch {}
			},
		},
	});

	logger.info({ port }, "Local API started");
}

export function stopWebServer() {
	server?.stop();
	server = null;
}
