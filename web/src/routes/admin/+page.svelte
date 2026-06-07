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

let _verified = $state(false);
let _notTgContext = $state(false);

let _stats = $state<Stats | null>(null);

function _fmtNum(n: number) {
	return n.toLocaleString("ru-RU");
}

onMount(async () => {
	const initData = getTelegramInitData();
	if (initData) {
		const result = await checkAdmin(initData);
		if (result.isAdmin) _verified = true;
	} else {
		_notTgContext = true;
	}

	try {
		_stats = await fetchStats();
	} catch {
		// stats are optional on admin page
	}
});

let token = $state("");
let msg = $state("");
let _broadcastResult = $state("");
let _broadcastError = $state("");
let _broadcastLoading = $state(false);

let addUserId = $state(0);
let addAmount = $state(0);
let addCurrency = $state("bipki");
let _addResult = $state("");
let _addError = $state("");
let _addLoading = $state(false);

let lookupId = $state(0);
let _lookupResult = $state("");
let _lookupError = $state("");
let _userData = $state("");

async function _handleBroadcast() {
	if (!token || !msg) return;
	_broadcastResult = "";
	_broadcastError = "";
	_broadcastLoading = true;
	try {
		const res = await broadcast(token, msg);
		_broadcastResult = `✅ Отправлено ${res.sent}, ошибок ${res.failed} из ${res.total}`;
	} catch (e) {
		_broadcastError = `❌ ${e instanceof Error ? e.message : String(e)}`;
	} finally {
		_broadcastLoading = false;
	}
}

async function _handleAddCoins() {
	if (!token || !addUserId || !addAmount) return;
	_addResult = "";
	_addError = "";
	_addLoading = true;
	try {
		await addCoins(token, addUserId, addAmount, addCurrency);
		_addResult = `✅ Добавлено ${addAmount} ${addCurrency} пользователю ${addUserId}`;
	} catch (e) {
		_addError = `❌ ${e instanceof Error ? e.message : String(e)}`;
	} finally {
		_addLoading = false;
	}
}

async function _handleLookup() {
	if (!token || !lookupId) return;
	_lookupResult = "";
	_lookupError = "";
	try {
		const data = await fetchUser(lookupId);
		_userData = JSON.stringify(data, null, 2);
		_lookupResult = "✅ Пользователь найден";
	} catch (e) {
		_userData = "";
		_lookupError = `❌ ${e instanceof Error ? e.message : String(e)}`;
	}
}
</script>

<div class="max-w-2xl mx-auto">
	<div class="mb-6 flex items-center justify-between">
		<a href="/" class="text-sm text-tg-hint hover:text-tg-accent transition-colors">← Dashboard</a>
		{#if verified}
			<span class="text-xs text-tg-green bg-tg-green/10 px-2 py-1 rounded">✓ Админ подтверждён</span>
		{/if}
	</div>

	<h1 class="text-2xl font-bold mb-6"><span class="text-tg-accent">⚙</span> Admin Panel</h1>

	{#if notTgContext}
		<div class="bg-tg-yellow/10 border border-tg-yellow/20 rounded-xl p-4 mb-6 text-sm text-tg-hint">
			⚠️ Не удалось получить контекст Telegram. Автоматическая авторизация недоступна.
			Админ-действия требуют <strong>WEB_SECRET</strong> ниже.
		</div>
	{/if}

	{#if stats}
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
			<div class="bg-tg-card border border-tg-border rounded-xl p-4">
				<div class="text-xs text-tg-hint mb-1">Пользователи</div>
				<div class="text-2xl font-bold">{fmtNum(stats.users.total)}</div>
			</div>
			<div class="bg-tg-card border border-tg-border rounded-xl p-4">
				<div class="text-xs text-tg-hint mb-1">Bipki</div>
				<div class="text-2xl font-bold">{fmtNum(stats.economy.totalBipki)}</div>
			</div>
			<div class="bg-tg-card border border-tg-border rounded-xl p-4">
				<div class="text-xs text-tg-hint mb-1">Megabipki</div>
				<div class="text-2xl font-bold">{fmtNum(stats.economy.totalMegabipki)}</div>
			</div>
			<div class="bg-tg-card border border-tg-border rounded-xl p-4">
				<div class="text-xs text-tg-hint mb-1">Транзакций сегодня</div>
				<div class="text-2xl font-bold">{fmtNum(stats.transactions.today)}</div>
			</div>
		</div>

		<div class="bg-tg-card border border-tg-border rounded-xl p-4 mb-6">
			<div class="flex items-center gap-2 text-sm">
				<span class="inline-block w-2 h-2 rounded-full {stats.tunnel.status === 'running' ? 'bg-tg-green' : stats.tunnel.status === 'error' ? 'bg-tg-red' : 'bg-tg-yellow'}"></span>
				<span class="text-tg-hint">Туннель:</span>
				<span>{stats.tunnel.url ? stats.tunnel.url.replace(/^https?:\/\//, "") : stats.tunnel.status === "starting" ? "Запуск..." : stats.tunnel.status === "error" ? "Ошибка" : "Выключен"}</span>
			</div>
		</div>
	{/if}

	<div class="bg-tg-card border border-tg-border rounded-xl p-6 mb-4">
		<h2 class="text-base font-semibold mb-4">🔐 Secret Token</h2>
		<input
			type="password"
			bind:value={token}
			placeholder="WEB_SECRET из .env"
			class="w-full px-3 py-2.5 rounded-lg bg-tg-bg border border-tg-border text-sm text-tg-text placeholder:text-tg-hint/50 outline-none focus:border-tg-primary transition-colors"
		/>
		<p class="text-xs text-tg-hint mt-1">Токен не сохраняется — передаётся с каждым запросом</p>
	</div>

	<div class="bg-tg-card border border-tg-border rounded-xl p-6 mb-4">
		<h2 class="text-base font-semibold mb-4">📢 Рассылка</h2>
		<label for="msg" class="block text-xs text-tg-hint mb-1">Сообщение всем пользователям</label>
		<textarea
			id="msg"
			bind:value={msg}
			placeholder="Текст сообщения..."
			class="w-full px-3 py-2.5 rounded-lg bg-tg-bg border border-tg-border text-sm text-tg-text placeholder:text-tg-hint/50 outline-none focus:border-tg-primary transition-colors resize-vertical min-h-[80px]"
		></textarea>
		<button
			onclick={handleBroadcast}
			disabled={!token || !msg || broadcastLoading}
			class="mt-3 px-5 py-2.5 rounded-lg bg-tg-accent text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
		>{broadcastLoading ? "Отправка..." : "Отправить"}</button>
		{#if broadcastResult}
			<div class="mt-3 p-3 rounded-lg text-sm bg-tg-green/10 text-tg-green border border-tg-green/20">{broadcastResult}</div>
		{/if}
		{#if broadcastError}
			<div class="mt-3 p-3 rounded-lg text-sm bg-tg-red/10 text-tg-red border border-tg-red/20">{broadcastError}</div>
		{/if}
	</div>

	<hr class="border-tg-border my-6" />

	<div class="bg-tg-card border border-tg-border rounded-xl p-6 mb-4">
		<h2 class="text-base font-semibold mb-4">💰 Добавить валюту</h2>
		<div class="flex gap-3 items-end flex-wrap">
			<div class="flex-1 min-w-[120px]">
				<label for="add-user-id" class="block text-xs text-tg-hint mb-1">User ID</label>
				<input type="number" id="add-user-id" bind:value={addUserId} placeholder="Telegram ID"
					class="w-full px-3 py-2.5 rounded-lg bg-tg-bg border border-tg-border text-sm text-tg-text placeholder:text-tg-hint/50 outline-none focus:border-tg-primary transition-colors"
				/>
			</div>
			<div class="flex-1 min-w-[100px]">
				<label for="add-amount" class="block text-xs text-tg-hint mb-1">Сумма</label>
				<input type="number" id="add-amount" bind:value={addAmount} placeholder="100"
					class="w-full px-3 py-2.5 rounded-lg bg-tg-bg border border-tg-border text-sm text-tg-text placeholder:text-tg-hint/50 outline-none focus:border-tg-primary transition-colors"
				/>
			</div>
			<div class="min-w-[120px]">
				<label for="add-currency" class="block text-xs text-tg-hint mb-1">Валюта</label>
				<select id="add-currency" bind:value={addCurrency}
					class="w-full px-3 py-2.5 rounded-lg bg-tg-bg border border-tg-border text-sm text-tg-text outline-none focus:border-tg-primary transition-colors"
				>
					<option value="bipki">Bipki</option>
					<option value="megabipki">Megabipki</option>
				</select>
			</div>
		</div>
		<button
			onclick={handleAddCoins}
			disabled={!token || !addUserId || !addAmount || addLoading}
			class="mt-3 px-5 py-2.5 rounded-lg bg-tg-accent text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
		>{addLoading ? "Загрузка..." : "Добавить"}</button>
		{#if addResult}
			<div class="mt-3 p-3 rounded-lg text-sm bg-tg-green/10 text-tg-green border border-tg-green/20">{addResult}</div>
		{/if}
		{#if addError}
			<div class="mt-3 p-3 rounded-lg text-sm bg-tg-red/10 text-tg-red border border-tg-red/20">{addError}</div>
		{/if}
	</div>

	<hr class="border-tg-border my-6" />

	<div class="bg-tg-card border border-tg-border rounded-xl p-6 mb-4">
		<h2 class="text-base font-semibold mb-4">📋 Информация о пользователе</h2>
		<div class="flex gap-3 items-end">
			<div class="flex-1 max-w-xs">
				<label for="lookup-id" class="block text-xs text-tg-hint mb-1">User ID</label>
				<input type="number" id="lookup-id" bind:value={lookupId} placeholder="Telegram ID"
					class="w-full px-3 py-2.5 rounded-lg bg-tg-bg border border-tg-border text-sm text-tg-text placeholder:text-tg-hint/50 outline-none focus:border-tg-primary transition-colors"
				/>
			</div>
		</div>
		<button
			onclick={handleLookup}
			disabled={!token || !lookupId}
			class="mt-3 px-5 py-2.5 rounded-lg bg-tg-accent text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
		>Найти</button>
		{#if lookupResult}
			<div class="mt-3 p-3 rounded-lg text-sm bg-tg-green/10 text-tg-green border border-tg-green/20">{lookupResult}</div>
		{/if}
		{#if lookupError}
			<div class="mt-3 p-3 rounded-lg text-sm bg-tg-red/10 text-tg-red border border-tg-red/20">{lookupError}</div>
		{/if}
		{#if userData}
			<pre class="mt-3 p-3 rounded-lg bg-tg-bg text-xs text-tg-hint overflow-x-auto whitespace-pre-wrap">{userData}</pre>
		{/if}
	</div>
</div>
