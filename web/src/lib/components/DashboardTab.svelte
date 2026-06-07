<script lang="ts">
import { onMount } from "svelte";
import type { Transaction, User } from "$lib/api";
import {
	claimDailyBonus,
	fetchMe,
	fetchTransfer,
	getTelegramInitData,
} from "$lib/api";

let loading = $state(true);
let claiming = $state(false);
let user = $state<User | null>(null);
let transactions = $state<Transaction[]>([]);
let rank = $state<number | null>(null);
let error = $state("");
let balanceKey = $state(0);

let showTransfer = $state(false);
let transferId = $state("");
let transferAmount = $state("");
let transferError = $state("");
let transferLoading = $state(false);

let dailyResult = $state<{ bipki: number; megabipki: number } | null>(null);

function fmtNum(n: number) {
	return n.toLocaleString("ru-RU");
}

async function load() {
	loading = true;
	error = "";
	const id = getTelegramInitData();
	if (!id) {
		error = "Не удалось получить контекст Telegram. Откройте через Mini App.";
		loading = false;
		return;
	}
	try {
		const me = await fetchMe(id);
		user = me.user;
		transactions = me.transactions;
		rank = me.rank;
	} catch (e) {
		error = String(e);
	} finally {
		loading = false;
	}
}

async function handleDaily() {
	const id = getTelegramInitData();
	if (!id || claiming) return;
	claiming = true;
	try {
		const result = await claimDailyBonus(id);
		dailyResult = result;
		balanceKey++;
		await load();
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		window.Telegram?.WebApp?.showAlert(msg);
	} finally {
		claiming = false;
		setTimeout(() => (dailyResult = null), 3000);
	}
}

async function handleTransfer() {
	const id = getTelegramInitData();
	if (!id || !transferId || !transferAmount || transferLoading) return;
	transferLoading = true;
	transferError = "";
	try {
		await fetchTransfer(id, Number(transferId), Number(transferAmount));
		balanceKey++;
		showTransfer = false;
		transferId = "";
		transferAmount = "";
		await load();
	} catch (e) {
		transferError = e instanceof Error ? e.message : String(e);
	} finally {
		transferLoading = false;
	}
}

function canClaimBonus(): boolean {
	if (!user?.lastDailyBonus) return true;
	const last = new Date(user.lastDailyBonus);
	const now = new Date();
	return (
		last.getFullYear() !== now.getFullYear() ||
		last.getMonth() !== now.getMonth() ||
		last.getDate() !== now.getDate()
	);
}

function badge(type: string) {
	if (type === "transfer")
		return "bg-[var(--tg-theme-accent-text-color,#40a7e3)]/10 text-[var(--tg-theme-accent-text-color,#40a7e3)]";
	if (type === "daily_bonus")
		return "bg-[var(--color-emerald)]/10 text-[var(--color-emerald)]";
	if (type === "admin_add" || type === "web_admin")
		return "bg-[var(--color-gold)]/10 text-[var(--color-gold)]";
	if (type === "admin_remove")
		return "bg-[var(--color-ruby)]/10 text-[var(--color-ruby)]";
	return "text-[var(--tg-theme-hint-color,#999)]";
}

function typeLabel(type: string) {
	switch (type) {
		case "transfer":
			return "Перевод";
		case "daily_bonus":
			return "Бонус";
		case "admin_add":
		case "web_admin":
			return "Начисление";
		case "admin_remove":
			return "Списание";
		default:
			return type;
	}
}

function fmtTime(iso: string) {
	return new Date(iso).toLocaleString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

onMount(() => {
	load();
	const interval = setInterval(load, 15_000);
	return () => clearInterval(interval);
});
</script>

{#if loading && !user}
	<div class="flex flex-col items-center justify-center py-24 gap-3">
<div class="w-8 h-8 rounded-full border-2 border-[var(--tg-theme-accent-text-color,#40a7e3)] border-t-transparent animate-spin"></div>
    <span class="text-sm text-[var(--tg-theme-hint-color,#999)]">Загрузка...</span>
	</div>
{:else if error && !user}
	<div class="text-center py-16">
		<div class="text-4xl mb-4 opacity-30">⚠️</div>
		<p class="text-sm text-[var(--tg-theme-hint-color,#999)]">{error}</p>
	</div>
{:else if user}
	<div class="animate-in">
		{#key balanceKey}
			<div class="mb-8 text-center">
				<p class="text-xs font-medium text-[var(--tg-theme-hint-color,#999)] uppercase tracking-widest mb-1">Баланс</p>
				<div class="balance-number gradient-text mb-1" style="animation: count-up 0.8s ease-out">
					{fmtNum(user.bipki)}
				</div>
				<p class="text-sm text-[var(--tg-theme-hint-color,#999)]">
					Bipki
				</p>
			</div>
		{/key}

		<div class="grid grid-cols-2 gap-3 mb-6">
			<div class="rounded-2xl p-4 relative overflow-hidden" style="background: linear-gradient(135deg, #2b5278 0%, #1a3a5c 100%);">
				<div class="absolute top-0 right-0 w-24 h-24 opacity-10">
					<svg viewBox="0 0 100 100" fill="white"><circle cx="50" cy="50" r="40"/></svg>
				</div>
				<div class="relative z-10">
					<div class="text-xs font-medium text-white/60 mb-1 uppercase tracking-wider">Bipki</div>
					<div class="text-2xl font-bold text-white">{fmtNum(user.bipki)}</div>
				</div>
			</div>
			<div class="rounded-2xl p-4 relative overflow-hidden" style="background: linear-gradient(135deg, #5d4b8a 0%, #3d2d6a 100%);">
				<div class="absolute top-0 right-0 w-24 h-24 opacity-10">
					<svg viewBox="0 0 100 100" fill="white"><polygon points="50,5 95,35 78,90 22,90 5,35"/></svg>
				</div>
				<div class="relative z-10">
					<div class="text-xs font-medium text-white/60 mb-1 uppercase tracking-wider">Megabipki</div>
					<div class="text-2xl font-bold text-white">{fmtNum(user.megabipki)}</div>
				</div>
			</div>
		</div>

		<div class="flex items-center justify-between mb-6 gap-2">
			<div class="glass-card rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
				<span class="text-[var(--tg-theme-hint-color,#999)]">Ранг</span>
				<span class="font-semibold text-[var(--tg-theme-accent-text-color,#40a7e3)]">#{fmtNum(rank!)}</span>
			</div>
			<div class="glass-card rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
				<span class="text-[var(--tg-theme-hint-color,#999)]">ID</span>
				<span class="font-mono text-xs">#{user.id}</span>
			</div>
		</div>

		<div class="rounded-2xl glass-card p-5 mb-6 relative overflow-hidden">
			<div class="absolute inset-0 noise-overlay rounded-2xl"></div>
			<div class="relative z-10">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-sm font-semibold">Ежедневный бонус</h3>
					<span class="text-xs text-[var(--tg-theme-hint-color,#999)]">+100 🪙 + 1 💎</span>
				</div>
				<div class="flex items-center gap-3">
					<div class="flex-1">
						{#if !canClaimBonus()}
							<div class="text-xs text-[var(--tg-theme-hint-color,#999)]">
								Выдан сегодня. Возвращайтесь завтра!
							</div>
						{:else if dailyResult}
							<div class="text-sm font-semibold text-[var(--color-emerald)] animate-in">
								+{dailyResult.bipki} 🪙 +{dailyResult.megabipki} 💎
							</div>
						{:else}
							<div class="text-xs text-[var(--tg-theme-hint-color,#999)]">
								Заберите ежедневный бонус
							</div>
						{/if}
					</div>
					<button
						onclick={handleDaily}
						disabled={!canClaimBonus() || claiming}
						class="shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
							{canClaimBonus() && !claiming
								? 'bg-[var(--tg-theme-button-color,#40a7e3)] text-white hover:brightness-110 active:scale-95'
								: 'bg-[var(--tg-theme-secondary-bg-color,#e8e8e8)] text-[var(--tg-theme-hint-color,#999)] cursor-not-allowed'}"
					>
						{claiming ? '...' : dailyResult ? '✓' : 'Забрать'}
					</button>
				</div>
			</div>
		</div>

		<div class="rounded-2xl glass-card p-5 mb-6 relative overflow-hidden">
			<div class="relative z-10">
				<button
					onclick={() => (showTransfer = !showTransfer)}
					class="w-full flex items-center justify-between"
				>
					<h3 class="text-sm font-semibold">Перевод</h3>
					<svg
						class="w-4 h-4 text-[var(--tg-theme-hint-color,#999)] transition-transform duration-200"
						class:rotate-180={showTransfer}
						viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
					><path d="m6 9 6 6 6-6"/></svg>
				</button>

				{#if showTransfer}
					<div class="mt-4 space-y-3 animate-in">
						<input
							type="number"
							bind:value={transferId}
							placeholder="ID получателя"
							class="w-full px-4 py-3 rounded-xl bg-[var(--tg-theme-bg-color,#f5f5f7)] border border-[var(--tg-theme-section-separator-color,#e0e0e0)] text-sm text-[var(--tg-theme-text-color,#000)] placeholder:text-[var(--tg-theme-hint-color,#999)]/50 outline-none focus:border-[var(--tg-theme-accent-text-color,#40a7e3)] transition-colors"
						/>
						<input
							type="number"
							bind:value={transferAmount}
							placeholder="Сумма"
							class="w-full px-4 py-3 rounded-xl bg-[var(--tg-theme-bg-color,#f5f5f7)] border border-[var(--tg-theme-section-separator-color,#e0e0e0)] text-sm text-[var(--tg-theme-text-color,#000)] placeholder:text-[var(--tg-theme-hint-color,#999)]/50 outline-none focus:border-[var(--tg-theme-accent-text-color,#40a7e3)] transition-colors"
						/>
						<button
							onclick={handleTransfer}
							disabled={!transferId || !transferAmount || transferLoading}
							class="w-full py-3 rounded-xl bg-[var(--tg-theme-button-color,#40a7e3)] text-white text-sm font-semibold hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
						>{transferLoading ? 'Отправка...' : 'Отправить'}</button>
						{#if transferError}
							<p class="text-xs text-[var(--color-ruby)]">{transferError}</p>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<section>
			<div class="flex items-center justify-between mb-3">
				<h3 class="text-sm font-semibold">Последние операции</h3>
				<span class="text-xs text-[var(--tg-theme-hint-color,#999)]">{transactions.length}</span>
			</div>

			{#if transactions.length}
				<div class="space-y-1">
					{#each transactions.slice(0, 5) as tx}
						<div class="glass-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all duration-200 hover:brightness-95">
							<div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0
								{tx.fromUserId ? (tx.toUserId === user.id ? 'bg-[var(--color-emerald)]/10' : 'bg-[var(--color-ruby)]/10') : 'bg-[var(--color-gold)]/10'}">
								<span class="text-sm">
									{tx.type === 'daily_bonus' ? '🎁' : tx.fromUserId ? (tx.toUserId === user.id ? '⬇️' : '⬆️') : '🏦'}
								</span>
							</div>
							<div class="flex-1 min-w-0">
								<div class="text-sm font-medium truncate">{typeLabel(tx.type)}</div>
								<div class="text-xs text-[var(--tg-theme-hint-color,#999)]">{fmtTime(tx.createdAt)}</div>
							</div>
							<div class="text-right shrink-0">
								<div class="text-sm font-semibold
									{tx.fromUserId ? (tx.toUserId === user.id ? 'text-[var(--color-emerald)]' : 'text-[var(--color-ruby)]') : 'text-[var(--color-gold)]'}">
									{tx.fromUserId ? (tx.toUserId === user.id ? '+' : '-') : '+'}{fmtNum(tx.amount)}
								</div>
								<div class="text-xs text-[var(--tg-theme-hint-color,#999)]">
									{tx.currency === 'bipki' ? 'Bipki' : 'Mega'}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="glass-card rounded-xl p-8 text-center">
					<p class="text-sm text-[var(--tg-theme-hint-color,#999)]">История операций пуста</p>
					<p class="text-xs text-[var(--tg-theme-hint-color,#999)]/60 mt-1">Начните с ежедневного бонуса!</p>
				</div>
			{/if}
		</section>
	</div>
{/if}
