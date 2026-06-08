<script lang="ts">
import { onMount } from "svelte";
import {
	addCoins,
	broadcast,
	checkAdmin,
	fetchStats,
	fetchUser,
	fetchUsers,
	getTelegramInitData,
	removeCoins,
	type Stats,
	type Transaction,
	type User,
	type UsersResponse,
} from "$lib/api";
import { fmtId } from "$lib/format";

let verified = $state(false);
let notTgContext = $state(false);

let stats = $state<Stats | null>(null);

function fmtNum(n: number) {
	return n.toLocaleString("ru-RU");
}

onMount(() => {
	document.title = "Bipki Bank · Админка";
});

onMount(async () => {
	const initData = getTelegramInitData();
	if (initData) {
		const result = await checkAdmin(initData);
		if (result.isAdmin) verified = true;
	} else {
		notTgContext = true;
	}

	try {
		stats = await fetchStats();
	} catch {
		// stats are optional on admin page
	}

	await loadUsers(1);
});

// --- Token ---
let token = $state("");

// --- Broadcast ---
let msg = $state("");
let broadcastResult = $state("");
let broadcastError = $state("");
let broadcastLoading = $state(false);

async function handleBroadcast() {
	if (!token || !msg) return;
	broadcastResult = "";
	broadcastError = "";
	broadcastLoading = true;
	try {
		const res = await broadcast(token, msg);
		broadcastResult = `✅ Отправлено ${res.sent}, ошибок ${res.failed} из ${res.total}`;
	} catch (e) {
		broadcastError = `❌ ${e instanceof Error ? e.message : String(e)}`;
	} finally {
		broadcastLoading = false;
	}
}

// --- User list ---
let usersData = $state<UsersResponse | null>(null);
let currentPage = $state(1);

async function loadUsers(page: number) {
	currentPage = page;
	usersData = await fetchUsers(page);
}

// --- Selected user detail ---
type UserDetail = {
	user: User;
	transactions: Transaction[];
};

let selectedUser = $state<UserDetail | null>(null);
let userLoading = $state(false);
let userError = $state("");

async function selectUser(id: number) {
	userLoading = true;
	userError = "";
	selectedUser = null;
	try {
		const data = await fetchUser(id);
		selectedUser = data;
	} catch (e) {
		userError = e instanceof Error ? e.message : "Ошибка загрузки";
	} finally {
		userLoading = false;
	}
}

function backToList() {
	selectedUser = null;
	userError = "";
	coinResult = "";
	coinError = "";
}

// --- Add/remove coins on selected user ---
let coinAmount = $state(0);
let coinCurrency = $state("bipki");
let coinAction = $state<"add" | "remove">("add");
let coinLoading = $state(false);
let coinResult = $state("");
let coinError = $state("");

async function handleCoinAction() {
	if (!token || !selectedUser || !coinAmount) return;
	coinResult = "";
	coinError = "";
	coinLoading = true;
	try {
		const fn = coinAction === "add" ? addCoins : removeCoins;
		await fn(token, selectedUser.user.id, coinAmount, coinCurrency);
		coinResult = `✅ ${coinAction === "add" ? "Начислено" : "Снято"} ${coinAmount} ${coinCurrency}`;
		// Refresh user data
		const data = await fetchUser(selectedUser.user.id);
		selectedUser = data;
	} catch (e) {
		coinError = `❌ ${e instanceof Error ? e.message : String(e)}`;
	} finally {
		coinLoading = false;
	}
}

function txLabel(tx: Transaction, userId: number) {
	if (tx.type === "transfer") {
		return tx.fromUserId === userId ? "Перевод →" : "Перевод ←";
	}
	if (tx.type === "daily_bonus") return "Ежедневный бонус";
	if (tx.type === "game_win") return `🎮 Выигрыш (${tx.description})`;
	if (tx.type === "game_lose") return `🎮 Проигрыш (${tx.description})`;
	if (tx.type === "admin_add") return "Админ начислил";
	if (tx.type === "admin_remove") return "Админ снял";
	if (tx.type === "web_admin") return "Веб-админ";
	return tx.type;
}

function txSign(tx: Transaction, userId: number) {
	return tx.fromUserId === userId ? "−" : "+";
}

function txDate(dateStr: string) {
	return new Date(dateStr).toLocaleString("ru-RU");
}
</script>

<div class="min-h-screen px-4 pt-4 pb-8 max-w-2xl mx-auto">
	<div class="mb-6 flex items-center justify-between">
		<a href="/" class="text-sm text-[var(--tg-theme-hint-color,#999)] hover:text-[var(--tg-theme-accent-text-color)] transition-colors flex items-center gap-1">
			<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
			На главную
		</a>
		{#if verified}
			<span class="text-xs text-[var(--color-emerald)] bg-[var(--color-emerald)]/10 px-3 py-1.5 rounded-full font-medium">Админ подтверждён</span>
		{/if}
	</div>

	<div class="mb-8">
		<h1 class="serif-heading text-2xl mb-1">Панель управления</h1>
		<p class="text-sm text-[var(--tg-theme-hint-color,#999)]">Управление ботом и валютой</p>
	</div>

	{#if notTgContext}
		<div class="glass-card rounded-2xl p-4 mb-6 text-sm text-[var(--tg-theme-hint-color,#999)] flex items-center gap-3">
			<span class="text-lg">⚠️</span>
			<span>Не удалось получить контекст Telegram. Авторизация через <strong>WEB_SECRET</strong> ниже.</span>
		</div>
	{/if}

	{#if stats}
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
			<div class="glass-card rounded-2xl p-4">
				<div class="text-xs text-[var(--tg-theme-hint-color,#999)] mb-1 uppercase tracking-wider">Пользователи</div>
				<div class="text-2xl font-bold serif-heading">{fmtNum(stats.users.total)}</div>
			</div>
			<div class="glass-card rounded-2xl p-4">
				<div class="text-xs text-[var(--tg-theme-hint-color,#999)] mb-1 uppercase tracking-wider">Bipki</div>
				<div class="text-2xl font-bold serif-heading gradient-text">{fmtNum(stats.economy.totalBipki)}</div>
			</div>
			<div class="glass-card rounded-2xl p-4">
				<div class="text-xs text-[var(--tg-theme-hint-color,#999)] mb-1 uppercase tracking-wider">Мегабипки</div>
				<div class="text-2xl font-bold serif-heading gradient-text-sapphire">{fmtNum(stats.economy.totalMegabipki)}</div>
			</div>
			<div class="glass-card rounded-2xl p-4">
				<div class="text-xs text-[var(--tg-theme-hint-color,#999)] mb-1 uppercase tracking-wider">Сегодня</div>
				<div class="text-2xl font-bold serif-heading">{fmtNum(stats.transactions.today)}</div>
			</div>
		</div>

		<div class="glass-card rounded-2xl p-4 mb-6">
			<div class="flex items-center gap-2 text-sm">
				<span
					class="inline-block w-2 h-2 rounded-full
						{stats.tunnel.status === 'running' ? 'bg-[var(--color-emerald)]' : stats.tunnel.status === 'error' ? 'bg-[var(--color-ruby)]' : 'bg-[var(--color-gold)]'}"
				></span>
				<span class="text-[var(--tg-theme-hint-color,#999)]">Туннель:</span>
				<span class="text-sm">
					{stats.tunnel.url ? stats.tunnel.url.replace(/^https?:\/\//, "") : stats.tunnel.status === "starting" ? "Запуск..." : stats.tunnel.status === "error" ? "Ошибка" : "Выключен"}
				</span>
			</div>
		</div>
	{/if}

	<div class="glass-card rounded-2xl p-5 mb-4">
		<h2 class="text-base font-semibold mb-4 flex items-center gap-2">
			<svg class="w-4 h-4 text-[var(--tg-theme-hint-color,#999)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
			Ключ доступа
		</h2>
		<input
			type="password"
			bind:value={token}
			placeholder="WEB_SECRET из .env"
			class="w-full px-4 py-3 rounded-xl bg-[var(--tg-theme-bg-color,#f5f5f7)] border border-[var(--tg-theme-section-separator-color,#e0e0e0)] text-sm text-[var(--tg-theme-text-color,#000)] placeholder:text-[var(--tg-theme-hint-color,#999)]/50 outline-none focus:border-[var(--tg-theme-accent-text-color,#40a7e3)] transition-colors"
		/>
		<p class="text-xs text-[var(--tg-theme-hint-color,#999)] mt-2">Токен передаётся с каждым запросом, не сохраняется локально</p>
	</div>

	<div class="glass-card rounded-2xl p-5 mb-4">
		<h2 class="text-base font-semibold mb-1">Рассылка</h2>
		<p class="text-xs text-[var(--tg-theme-hint-color,#999)] mb-4">Отправить сообщение всем пользователям бота</p>
		<textarea
			id="msg"
			bind:value={msg}
			placeholder="Текст сообщения..."
			class="w-full px-4 py-3 rounded-xl bg-[var(--tg-theme-bg-color,#f5f5f7)] border border-[var(--tg-theme-section-separator-color,#e0e0e0)] text-sm text-[var(--tg-theme-text-color,#000)] placeholder:text-[var(--tg-theme-hint-color,#999)]/50 outline-none focus:border-[var(--tg-theme-accent-text-color,#40a7e3)] transition-colors resize-vertical min-h-[90px]"
		></textarea>
		<div class="flex items-center justify-between mt-3">
			<button
				onclick={handleBroadcast}
				disabled={!token || !msg || broadcastLoading}
				class="px-6 py-2.5 rounded-xl bg-[var(--tg-theme-button-color,#40a7e3)] text-white text-sm font-semibold hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
			>{broadcastLoading ? "Отправка..." : "Отправить"}</button>
			<span class="text-xs text-[var(--tg-theme-hint-color,#999)]">{stats ? `${fmtNum(stats.users.total)} получателей` : ''}</span>
		</div>
		{#if broadcastResult}
			<div class="mt-3 p-3 rounded-xl text-sm bg-[var(--color-emerald)]/10 text-[var(--color-emerald)]">{broadcastResult}</div>
		{/if}
		{#if broadcastError}
			<div class="mt-3 p-3 rounded-xl text-sm bg-[var(--color-ruby)]/10 text-[var(--color-ruby)]">{broadcastError}</div>
		{/if}
	</div>

	<!-- User management -->
	<div class="glass-card rounded-2xl p-5 mb-4">
		{#if selectedUser}
			<!-- User detail view -->
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-base font-semibold">{selectedUser.user.name ?? "—"}</h2>
				<button onclick={backToList}
					class="text-xs text-[var(--tg-theme-hint-color,#999)] hover:text-[var(--tg-theme-accent-text-color)] transition-colors flex items-center gap-1"
				>
					<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
					К списку
				</button>
			</div>

			<div class="text-xs text-[var(--tg-theme-hint-color,#999)] space-y-1 mb-4">
				<div class="flex gap-2">
					<span class="w-24 shrink-0">ID:</span>
					<span class="font-mono">{fmtId(selectedUser.user.id)}</span>
				</div>
				<div class="flex gap-2">
					<span class="w-24 shrink-0">Username:</span>
					<span>{selectedUser.user.username ? `@${selectedUser.user.username}` : "—"}</span>
				</div>
				<div class="flex gap-2">
					<span class="w-24 shrink-0">Язык:</span>
					<span>{selectedUser.user.languageCode ?? "—"}</span>
				</div>
				<div class="flex gap-2">
					<span class="w-24 shrink-0">Регистрация:</span>
					<span>{txDate(selectedUser.user.createdAt)}</span>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-3 mb-4">
				<div class="rounded-xl bg-[var(--tg-theme-bg-color,#f5f5f7)] p-3 text-center">
					<div class="text-lg font-bold serif-heading">{fmtNum(selectedUser.user.bipki)}</div>
					<div class="text-xs text-[var(--tg-theme-hint-color,#999)]">🪙 Бипки</div>
				</div>
				<div class="rounded-xl bg-[var(--tg-theme-bg-color,#f5f5f7)] p-3 text-center">
					<div class="text-lg font-bold serif-heading">{fmtNum(selectedUser.user.megabipki)}</div>
					<div class="text-xs text-[var(--tg-theme-hint-color,#999)]">💎 Мегабипки</div>
				</div>
			</div>

			<!-- Add/Remove coins -->
			<div class="flex gap-2 mb-3">
				<button
					onclick={() => coinAction = "add"}
					class="flex-1 py-2 rounded-xl text-sm font-semibold transition-all {coinAction === 'add' ? 'bg-[var(--color-gold)] text-white' : 'bg-[var(--tg-theme-bg-color,#f5f5f7)] text-[var(--tg-theme-text-color,#000)]'}"
				>➕ Начислить</button>
				<button
					onclick={() => coinAction = "remove"}
					class="flex-1 py-2 rounded-xl text-sm font-semibold transition-all {coinAction === 'remove' ? 'bg-[var(--color-ruby)] text-white' : 'bg-[var(--tg-theme-bg-color,#f5f5f7)] text-[var(--tg-theme-text-color,#000)]'}"
				>➖ Снять</button>
			</div>

			<div class="flex gap-2 items-end mb-3">
				<div class="flex-1">
					<input type="number" bind:value={coinAmount} placeholder="Сумма"
						class="w-full px-4 py-3 rounded-xl bg-[var(--tg-theme-bg-color,#f5f5f7)] border border-[var(--tg-theme-section-separator-color,#e0e0e0)] text-sm text-[var(--tg-theme-text-color,#000)] placeholder:text-[var(--tg-theme-hint-color,#999)]/50 outline-none focus:border-[var(--tg-theme-accent-text-color,#40a7e3)] transition-colors"
					/>
				</div>
				<select bind:value={coinCurrency}
					class="px-4 py-3 rounded-xl bg-[var(--tg-theme-bg-color,#f5f5f7)] border border-[var(--tg-theme-section-separator-color,#e0e0e0)] text-sm text-[var(--tg-theme-text-color,#000)] outline-none focus:border-[var(--tg-theme-accent-text-color,#40a7e3)] transition-colors"
				>
					<option value="bipki">🪙</option>
					<option value="megabipki">💎</option>
				</select>
				<button
					onclick={handleCoinAction}
					disabled={!token || !coinAmount || coinLoading}
					class="px-5 py-3 rounded-xl text-white text-sm font-semibold transition-all {coinAction === 'add' ? 'bg-[var(--color-gold)]' : 'bg-[var(--color-ruby)]'} hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
				>{coinLoading ? "..." : "✅"}</button>
			</div>

			{#if coinResult}
				<div class="mb-3 p-3 rounded-xl text-sm bg-[var(--color-emerald)]/10 text-[var(--color-emerald)]">{coinResult}</div>
			{/if}
			{#if coinError}
				<div class="mb-3 p-3 rounded-xl text-sm bg-[var(--color-ruby)]/10 text-[var(--color-ruby)]">{coinError}</div>
			{/if}

			<!-- Transactions -->
			<h3 class="text-sm font-semibold mb-2">История транзакций</h3>
			<div class="space-y-1">
				{#each selectedUser.transactions as tx}
					<div class="text-xs px-3 py-2 rounded-lg bg-[var(--tg-theme-bg-color,#f5f5f7)] flex items-center gap-2">
						<span class="shrink-0 {tx.fromUserId === selectedUser.user.id ? 'text-[var(--color-ruby)]' : 'text-[var(--color-emerald)]'} font-mono">
							{txSign(tx, selectedUser.user.id)}{tx.amount}
						</span>
						<span class="text-[var(--tg-theme-hint-color,#999)]">{tx.currency === "bipki" ? "🪙" : "💎"}</span>
						<span class="text-[var(--tg-theme-hint-color,#999)]">{txLabel(tx, selectedUser.user.id)}</span>
						<span class="ml-auto text-[var(--tg-theme-hint-color,#999)]/60">{txDate(tx.createdAt)}</span>
					</div>
				{/each}
				{#if selectedUser.transactions.length === 0}
					<div class="text-xs text-[var(--tg-theme-hint-color,#999)] px-3 py-2">Нет транзакций</div>
				{/if}
			</div>
		{:else if userLoading}
			<div class="text-center py-8 text-sm text-[var(--tg-theme-hint-color,#999)]">Загрузка...</div>
		{:else if userError}
			<div class="p-3 rounded-xl text-sm bg-[var(--color-ruby)]/10 text-[var(--color-ruby)] mb-3">{userError}</div>
			<button onclick={backToList}
				class="text-sm text-[var(--tg-theme-accent-text-color)] hover:underline"
			>← К списку</button>
		{:else}
			<!-- User list -->
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-base font-semibold">Пользователи</h2>
				{#if usersData}
					<span class="text-xs text-[var(--tg-theme-hint-color,#999)]">{usersData.total} всего</span>
				{/if}
			</div>

			<div class="space-y-1">
				{#each usersData?.users ?? [] as user}
					<button
						onclick={() => selectUser(user.id)}
						class="w-full text-left px-4 py-3 rounded-xl bg-[var(--tg-theme-bg-color,#f5f5f7)] hover:bg-[var(--tg-theme-secondary-bg-color,#e8e8ed)] transition-colors flex items-center gap-3"
					>
						<div class="w-8 h-8 rounded-full bg-[var(--tg-theme-button-color,#40a7e3)]/10 flex items-center justify-center text-xs font-semibold text-[var(--tg-theme-button-color,#40a7e3)] shrink-0">
							{(user.name ?? "?")[0]}
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-sm font-medium truncate">{user.name ?? "—"}</div>
							<div class="text-xs text-[var(--tg-theme-hint-color,#999)] truncate">
								{user.username ? `@${user.username}` : fmtId(user.id)}
							</div>
						</div>
						<div class="text-right shrink-0">
							<div class="text-sm font-semibold serif-heading">{fmtNum(user.bipki)}</div>
							<div class="text-xs text-[var(--tg-theme-hint-color,#999)]">🪙</div>
						</div>
					</button>
				{/each}
			</div>

			<!-- Pagination -->
			{#if usersData && usersData.pages > 1}
				<div class="flex items-center justify-center gap-2 mt-4">
					<button
						onclick={() => loadUsers(currentPage - 1)}
						disabled={currentPage <= 1}
						class="px-3 py-1.5 rounded-lg text-sm bg-[var(--tg-theme-bg-color,#f5f5f7)] hover:bg-[var(--tg-theme-secondary-bg-color,#e8e8ed)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
					>◀</button>
					<span class="text-xs text-[var(--tg-theme-hint-color,#999)]">{currentPage}/{usersData.pages}</span>
					<button
						onclick={() => loadUsers(currentPage + 1)}
						disabled={currentPage >= usersData.pages}
						class="px-3 py-1.5 rounded-lg text-sm bg-[var(--tg-theme-bg-color,#f5f5f7)] hover:bg-[var(--tg-theme-secondary-bg-color,#e8e8ed)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
					>▶</button>
				</div>
			{/if}
		{/if}
	</div>
</div>
