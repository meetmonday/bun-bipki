<script lang="ts">
import { onMount } from "svelte";
import {
	addCoins,
	broadcast,
	checkAdmin,
	fetchStats,
	fetchUser,
	getTelegramInitData,
	type Stats,
} from "$lib/api";

let verified = $state(false);
let notTgContext = $state(false);

let stats = $state<Stats | null>(null);

function fmtNum(n: number) {
	return n.toLocaleString("ru-RU");
}

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
});

let token = $state("");
let msg = $state("");
let broadcastResult = $state("");
let broadcastError = $state("");
let broadcastLoading = $state(false);

let addUserId = $state(0);
let addAmount = $state(0);
let addCurrency = $state("bipki");
let addResult = $state("");
let addError = $state("");
let addLoading = $state(false);

let lookupId = $state(0);
let lookupResult = $state("");
let lookupError = $state("");
let userData = $state("");

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

async function handleAddCoins() {
	if (!token || !addUserId || !addAmount) return;
	addResult = "";
	addError = "";
	addLoading = true;
	try {
		await addCoins(token, addUserId, addAmount, addCurrency);
		addResult = `✅ Добавлено ${addAmount} ${addCurrency} пользователю ${addUserId}`;
	} catch (e) {
		addError = `❌ ${e instanceof Error ? e.message : String(e)}`;
	} finally {
		addLoading = false;
	}
}

async function handleLookup() {
	if (!token || !lookupId) return;
	lookupResult = "";
	lookupError = "";
	try {
		const data = await fetchUser(lookupId);
		userData = JSON.stringify(data, null, 2);
		lookupResult = "✅ Пользователь найден";
	} catch (e) {
		userData = "";
		lookupError = `❌ ${e instanceof Error ? e.message : String(e)}`;
	}
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
				<div class="text-xs text-[var(--tg-theme-hint-color,#999)] mb-1 uppercase tracking-wider">Megabipki</div>
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

	<div class="glass-card rounded-2xl p-5 mb-4">
		<h2 class="text-base font-semibold mb-1">Эмиссия валюты</h2>
		<p class="text-xs text-[var(--tg-theme-hint-color,#999)] mb-4">Начислить валюту пользователю</p>
		<div class="flex gap-3 items-end flex-wrap">
			<div class="flex-1 min-w-[120px]">
				<label for="add-user-id" class="block text-xs text-[var(--tg-theme-hint-color,#999)] mb-1.5">ID пользователя</label>
				<input id="add-user-id" type="number" bind:value={addUserId} placeholder="Telegram ID"
					class="w-full px-4 py-3 rounded-xl bg-[var(--tg-theme-bg-color,#f5f5f7)] border border-[var(--tg-theme-section-separator-color,#e0e0e0)] text-sm text-[var(--tg-theme-text-color,#000)] placeholder:text-[var(--tg-theme-hint-color,#999)]/50 outline-none focus:border-[var(--tg-theme-accent-text-color,#40a7e3)] transition-colors"
				/>
			</div>
			<div class="flex-1 min-w-[100px]">
				<label for="add-amount" class="block text-xs text-[var(--tg-theme-hint-color,#999)] mb-1.5">Сумма</label>
				<input id="add-amount" type="number" bind:value={addAmount} placeholder="100"
					class="w-full px-4 py-3 rounded-xl bg-[var(--tg-theme-bg-color,#f5f5f7)] border border-[var(--tg-theme-section-separator-color,#e0e0e0)] text-sm text-[var(--tg-theme-text-color,#000)] placeholder:text-[var(--tg-theme-hint-color,#999)]/50 outline-none focus:border-[var(--tg-theme-accent-text-color,#40a7e3)] transition-colors"
				/>
			</div>
			<div class="min-w-[130px]">
				<label for="add-currency" class="block text-xs text-[var(--tg-theme-hint-color,#999)] mb-1.5">Валюта</label>
				<select id="add-currency" bind:value={addCurrency}
					class="w-full px-4 py-3 rounded-xl bg-[var(--tg-theme-bg-color,#f5f5f7)] border border-[var(--tg-theme-section-separator-color,#e0e0e0)] text-sm text-[var(--tg-theme-text-color,#000)] outline-none focus:border-[var(--tg-theme-accent-text-color,#40a7e3)] transition-colors"
				>
					<option value="bipki">Bipki 🪙</option>
					<option value="megabipki">Megabipki 💎</option>
				</select>
			</div>
			<button
				onclick={handleAddCoins}
				disabled={!token || !addUserId || !addAmount || addLoading}
				class="px-6 py-3 rounded-xl bg-[var(--color-gold)] text-white text-sm font-semibold hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
			>{addLoading ? "..." : "Начислить"}</button>
		</div>
		{#if addResult}
			<div class="mt-3 p-3 rounded-xl text-sm bg-[var(--color-emerald)]/10 text-[var(--color-emerald)]">{addResult}</div>
		{/if}
		{#if addError}
			<div class="mt-3 p-3 rounded-xl text-sm bg-[var(--color-ruby)]/10 text-[var(--color-ruby)]">{addError}</div>
		{/if}
	</div>

	<div class="glass-card rounded-2xl p-5 mb-4">
		<h2 class="text-base font-semibold mb-1">Поиск пользователя</h2>
		<p class="text-xs text-[var(--tg-theme-hint-color,#999)] mb-4">Просмотр информации о пользователе по ID</p>
		<div class="flex gap-3 items-end">
			<div class="flex-1 max-w-xs">
				<label for="lookup-id" class="block text-xs text-[var(--tg-theme-hint-color,#999)] mb-1.5">ID пользователя</label>
				<input id="lookup-id" type="number" bind:value={lookupId} placeholder="Telegram ID"
					class="w-full px-4 py-3 rounded-xl bg-[var(--tg-theme-bg-color,#f5f5f7)] border border-[var(--tg-theme-section-separator-color,#e0e0e0)] text-sm text-[var(--tg-theme-text-color,#000)] placeholder:text-[var(--tg-theme-hint-color,#999)]/50 outline-none focus:border-[var(--tg-theme-accent-text-color,#40a7e3)] transition-colors"
				/>
			</div>
			<button
				onclick={handleLookup}
				disabled={!token || !lookupId}
				class="px-6 py-3 rounded-xl bg-[var(--tg-theme-button-color,#40a7e3)] text-white text-sm font-semibold hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
			>Найти</button>
		</div>
		{#if lookupResult}
			<div class="mt-3 p-3 rounded-xl text-sm bg-[var(--color-emerald)]/10 text-[var(--color-emerald)]">{lookupResult}</div>
		{/if}
		{#if lookupError}
			<div class="mt-3 p-3 rounded-xl text-sm bg-[var(--color-ruby)]/10 text-[var(--color-ruby)]">{lookupError}</div>
		{/if}
		{#if userData}
			<pre class="mt-3 p-4 rounded-xl bg-[var(--tg-theme-bg-color,#f5f5f7)] text-xs text-[var(--tg-theme-hint-color,#999)] overflow-x-auto whitespace-pre-wrap font-mono">{userData}</pre>
		{/if}
	</div>
</div>
