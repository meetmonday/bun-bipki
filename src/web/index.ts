import { resolve, sep } from "node:path";
import {
	getBotTokenSecretKey,
	validateAndParseInitData,
} from "@gramio/init-data";
import { desc, eq, sql } from "drizzle-orm";
import { config } from "../config.ts";
import { db } from "../db/index.ts";
import { transactionsTable, usersTable } from "../db/schema.ts";
import { tunnelManager } from "../services/tunnel.ts";

const initDataSecretKey = getBotTokenSecretKey(config.BOT_TOKEN);

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function requireSecret(req: Request) {
	const url = new URL(req.url);
	return url.searchParams.get("token") === config.WEB_SECRET;
}

async function handleStats() {
	const userCount = await db.$count(usersTable);

	const totals = await db
		.select({
			totalBipki: sql`COALESCE(SUM(${usersTable.bipki}), 0)`,
			totalMegabipki: sql`COALESCE(SUM(${usersTable.megabipki}), 0)`,
		})
		.from(usersTable)
		.get();

	const today = new Date().toISOString().slice(0, 10);
	const txToday = await db.$count(
		transactionsTable,
		sql`${transactionsTable.createdAt} >= ${today}`,
	);

	const topUsers = await db
		.select({
			id: usersTable.id,
			name: usersTable.name,
			username: usersTable.username,
			bipki: usersTable.bipki,
			megabipki: usersTable.megabipki,
		})
		.from(usersTable)
		.orderBy(desc(usersTable.bipki))
		.limit(10)
		.all();

	return json({
		users: { total: userCount },
		economy: {
			totalBipki: Number(totals?.totalBipki ?? 0),
			totalMegabipki: Number(totals?.totalMegabipki ?? 0),
		},
		transactions: { today: txToday },
		topUsers,
		tunnel: tunnelManager.getInfo(),
	});
}

async function handleUsers(url: URL) {
	const page = Number(url.searchParams.get("page") ?? "1");
	const limit = 20;
	const offset = (page - 1) * limit;

	const users = await db
		.select()
		.from(usersTable)
		.orderBy(desc(usersTable.createdAt))
		.limit(limit)
		.offset(offset)
		.all();

	const total = await db.$count(usersTable);

	return json({ users, total, page, pages: Math.ceil(total / limit) });
}

async function handleUserById(id: number) {
	const user = await db
		.select()
		.from(usersTable)
		.where(eq(usersTable.id, id))
		.get();

	if (!user) return json({ error: "User not found" }, 404);

	const transactions = await db
		.select()
		.from(transactionsTable)
		.where(
			sql`${transactionsTable.fromUserId} = ${id} OR ${transactionsTable.toUserId} = ${id}`,
		)
		.orderBy(desc(transactionsTable.createdAt))
		.limit(50)
		.all();

	return json({ user, transactions });
}

async function handleTransactions(url: URL) {
	const limit = Number(url.searchParams.get("limit") ?? "30");

	const transactions = await db
		.select()
		.from(transactionsTable)
		.orderBy(desc(transactionsTable.createdAt))
		.limit(limit)
		.all();

	return json({ transactions });
}

function handleTunnelStatus() {
	return json(tunnelManager.getInfo());
}

async function handleBroadcast(req: Request) {
	if (!config.WEB_SECRET || !requireSecret(req)) {
		return json({ error: "Unauthorized" }, 401);
	}

	const body = (await req.json()) as { message?: string };
	if (!body.message) return json({ error: "Message is required" }, 400);

	const users = await db.select({ id: usersTable.id }).from(usersTable).all();

	const { bot } = await import("../bot.ts");

	let sent = 0;
	let failed = 0;

	for (const user of users) {
		try {
			await bot.api.sendMessage(user.id, body.message, { suppress: true });
			sent++;
		} catch {
			failed++;
		}
	}

	return json({ sent, failed, total: users.length });
}

async function handleMe(req: Request) {
	const body = (await req.json()) as { initData?: string };
	if (!body.initData) {
		return json({ error: "initData is required" }, 400);
	}

	const result = validateAndParseInitData(body.initData, initDataSecretKey);
	if (!result) {
		return json({ error: "Invalid init data" }, 401);
	}
	if (!result.user) {
		return json({ error: "No user in init data" }, 401);
	}

	const userId = result.user.id;

	const user = await db
		.select()
		.from(usersTable)
		.where(eq(usersTable.id, userId))
		.get();

	if (!user) {
		return json({ error: "User not found" }, 404);
	}

	const transactions = await db
		.select()
		.from(transactionsTable)
		.where(
			sql`${transactionsTable.fromUserId} = ${userId} OR ${transactionsTable.toUserId} = ${userId}`,
		)
		.orderBy(desc(transactionsTable.createdAt))
		.limit(20)
		.all();

	const rankResult = await db
		.select({ count: sql`COUNT(*)` })
		.from(usersTable)
		.where(sql`${usersTable.bipki} > ${user.bipki}`)
		.get();

	const rank = Number(rankResult?.count ?? 0) + 1;

	const isAdmin = config.ADMIN_IDS.includes(userId);

	return json({ user, transactions, rank, isAdmin });
}

async function handleAdminCheck(req: Request) {
	const body = (await req.json()) as { initData?: string };
	if (!body.initData) {
		return json({ isAdmin: false, reason: "no_init_data" });
	}

	const result = validateAndParseInitData(body.initData, initDataSecretKey);
	if (!result) {
		return json({ isAdmin: false, reason: "invalid_init_data" });
	}
	if (!result.user) {
		return json({ isAdmin: false, reason: "no_user_in_init_data" });
	}

	const isAdmin = config.ADMIN_IDS.includes(result.user.id);
	return json({
		isAdmin,
		reason: isAdmin ? "ok" : "not_in_admin_ids",
		user: { id: result.user.id, first_name: result.user.first_name },
	});
}

async function handleAddCoins(req: Request) {
	if (!config.WEB_SECRET || !requireSecret(req)) {
		return json({ error: "Unauthorized" }, 401);
	}

	const body = (await req.json()) as {
		userId?: number;
		amount?: number;
		currency?: string;
	};

	if (!body.userId || !body.amount || !body.currency) {
		return json({ error: "userId, amount, and currency are required" }, 400);
	}

	const { addCoins } = await import("../services/economy.ts");

	try {
		await addCoins(
			body.userId,
			body.amount,
			body.currency as "bipki" | "megabipki",
			"web_admin",
		);
		return json({ success: true });
	} catch (err) {
		return json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			400,
		);
	}
}

async function handleDaily(req: Request) {
	const body = (await req.json()) as { initData?: string };
	if (!body.initData) {
		return json({ error: "initData is required" }, 400);
	}

	const result = validateAndParseInitData(body.initData, initDataSecretKey);
	if (!result?.user) {
		return json({ error: "Invalid init data" }, 401);
	}

	const { claimDailyBonus } = await import("../services/economy.ts");

	try {
		const bonus = await claimDailyBonus(result.user.id);
		return json(bonus);
	} catch (err) {
		return json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			400,
		);
	}
}

async function handleTransfer(req: Request) {
	const body = (await req.json()) as {
		initData?: string;
		toUserId?: number;
		amount?: number;
	};

	if (!body.initData || !body.toUserId || !body.amount) {
		return json({ error: "initData, toUserId, and amount are required" }, 400);
	}

	const result = validateAndParseInitData(body.initData, initDataSecretKey);
	if (!result?.user) {
		return json({ error: "Invalid init data" }, 401);
	}

	const fromUserId = result.user.id;
	const toUserId = body.toUserId;
	if (fromUserId === toUserId) {
		return json({ error: "Cannot transfer to yourself" }, 400);
	}

	const { transfer } = await import("../services/economy.ts");

	try {
		await transfer(fromUserId, toUserId, body.amount);
		return json({ success: true });
	} catch (err) {
		return json(
			{ error: err instanceof Error ? err.message : "Transfer failed" },
			400,
		);
	}
}

const WEB_ROOT = resolve("web/build");

async function serveStatic(pathname: string): Promise<Response | null> {
	if (config.NODE_ENV !== "production") return null;

	// path traversal protection
	const requested = resolve(WEB_ROOT, pathname.slice(1));
	if (!requested.startsWith(WEB_ROOT + sep)) return null;

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

	// SPA fallback — try index.html inside the directory
	const dirIndex = Bun.file(`${requested}/index.html`);
	if (await dirIndex.exists()) {
		return new Response(dirIndex, {
			headers: { "Content-Type": "text/html; charset=utf-8" },
		});
	}

	return null;
}

let server: ReturnType<typeof Bun.serve> | null = null;

export function startWebServer() {
	const port = config.WEB_PORT;

	if (config.CLOUDFLARE_TUNNEL_ENABLED && config.NODE_ENV !== "test") {
		const targetUrl = `http://localhost:${port}`;
		tunnelManager.start(targetUrl, config.CLOUDFLARE_TUNNEL_TOKEN || undefined);
	}

	server = Bun.serve({
		port,
		async fetch(req, server) {
			const url = new URL(req.url);
			const path = url.pathname;

			// Forward WebSocket (Vite HMR) to dev server
			if (
				config.NODE_ENV === "development" &&
				req.headers.get("upgrade")?.toLowerCase() === "websocket"
			) {
				try {
					const upstream = new WebSocket(
						`ws://localhost:5173${path}${url.search}`,
					);
					await new Promise<void>((resolve, reject) => {
						upstream.onopen = () => resolve();
						upstream.onerror = () =>
							reject(new Error("Vite dev server not running on :5173"));
					});
					server.upgrade(req, { data: { upstream } });
					return;
				} catch {
					return new Response(null, { status: 502 });
				}
			}

			try {
				if (path === "/api/stats" && req.method === "GET") {
					return await handleStats();
				}
				if (path === "/api/users" && req.method === "GET") {
					return await handleUsers(url);
				}
				if (path === "/api/transactions" && req.method === "GET") {
					return await handleTransactions(url);
				}
				if (path === "/api/tunnel" && req.method === "GET") {
					return handleTunnelStatus();
				}
				if (path === "/api/broadcast" && req.method === "POST") {
					return await handleBroadcast(req);
				}
				if (path === "/api/coins/add" && req.method === "POST") {
					return await handleAddCoins(req);
				}
				if (path === "/api/daily" && req.method === "POST") {
					return await handleDaily(req);
				}
				if (path === "/api/transfer" && req.method === "POST") {
					return await handleTransfer(req);
				}
				if (path === "/api/admin/check" && req.method === "POST") {
					return await handleAdminCheck(req);
				}
				if (path === "/api/me" && req.method === "POST") {
					return await handleMe(req);
				}

				const userIdMatch = path.match(/^\/api\/users\/(\d+)$/);
				if (userIdMatch && req.method === "GET") {
					return await handleUserById(Number(userIdMatch[1]));
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
				console.error("Web server error:", err);
				return json(
					{ error: err instanceof Error ? err.message : "Internal error" },
					500,
				);
			}
		},
		websocket: {
			open(ws) {
				ws.data.upstream.onmessage = (event: MessageEvent) => {
					ws.send(event.data);
				};
				ws.data.upstream.onclose = () => ws.close();
				ws.data.upstream.onerror = () => ws.close();
			},
			message(ws, msg) {
				ws.data.upstream.send(msg);
			},
			close(ws) {
				ws.data.upstream.close();
			},
		},
	});

	console.log(`\n  ╔══════════════════════════════════╗`);
	console.log(`  ║  🌐 Local API: http://localhost:${port}  ║`);
	console.log(`  ║  📊 Dashboard: /                  ║`);
	console.log(`  ║  ⚙️ Admin:     /admin              ║`);
	console.log(`  ╚══════════════════════════════════╝\n`);
	console.log(
		`  ⏳ Cloudflare Tunnel запускается... URL появится ниже когда туннель будет готов\n`,
	);
}

export function stopWebServer() {
	server?.stop();
	server = null;
}
