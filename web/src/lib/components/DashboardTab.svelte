<script lang="ts">
import { onMount } from "svelte";
import type {
	DailyRewardState,
	DailyRewardTier,
	Transaction,
	TransferRecipient,
	User,
} from "$lib/api";
import {
	claimDailyBonus,
	fetchMe,
	fetchMeSummary,
	fetchTransfer,
	fetchTransferRecipients,
	fetchUserByUsername,
	getTelegramInitData,
} from "$lib/api";
import { copyToClipboard, fmtId, formatIdInput, parseId } from "$lib/format";
import CheckIcon from "$lib/icons/CheckIcon.svelte";
import GiftIcon from "$lib/icons/GiftIcon.svelte";

let rewardTiers = $state<DailyRewardTier[]>([]);

let loading = $state(true);
let claiming = $state(false);
let user = $state<User | null>(null);
let transactions = $state<Transaction[]>([]);
let rank = $state<number | null>(null);
let error = $state("");
let balanceKey = $state(0);

let dailyState = $derived(getDailyRewardState(rewardTiers));

let showTransfer = $state(false);
let transferMode = $state<"friends" | "id">("id");
let transferId = $state("");
let transferAmount = $state("");
let transferError = $state("");
let transferLoading = $state(false);
let recipients = $state<TransferRecipient[]>([]);
let recipientsLoading = $state(false);
let selectedRecipient = $state<TransferRecipient | null>(null);

let copiedUserId = $state<number | null>(null);
let claimedReward = $state<{
	bipki: number;
	megabipki: number;
	streak: number;
} | null>(null);
let claimTimer: ReturnType<typeof setTimeout> | null = null;
let resolvedUser = $state<{
	id: number;
	name: string | null;
	username: string | null;
} | null>(null);
let resolveTimer: ReturnType<typeof setTimeout> | null = null;

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
		rewardTiers = me.dailyRewardTiers;
	} catch (e) {
		error = String(e);
	} finally {
		loading = false;
	}
}

async function pollSummary() {
	const id = getTelegramInitData();
	if (!id || !user) return;
	try {
		const summary = await fetchMeSummary(id);
		user.bipki = summary.bipki;
		user.megabipki = summary.megabipki;
		user.lastDailyBonus = summary.lastDailyBonus;
		user.dailyRewardStreak = summary.dailyRewardStreak;
		rank = summary.rank;
	} catch {
		// silent — keep stale data on network error
	}
}

async function handleDaily() {
	const id = getTelegramInitData();
	if (!id || claiming) return;
	claiming = true;
	try {
		const result = await claimDailyBonus(id);
		if (claimTimer) clearTimeout(claimTimer);
		claimedReward = result;
		claimTimer = setTimeout(() => (claimedReward = null), 2800);
		balanceKey++;
		await load();
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		window.Telegram?.WebApp?.showAlert(msg);
	} finally {
		claiming = false;
	}
}

async function loadRecipients() {
	const id = getTelegramInitData();
	if (!id) return;
	recipientsLoading = true;
	try {
		recipients = await fetchTransferRecipients(id);
		if (recipients.length > 0) transferMode = "friends";
	} catch {
		recipients = [];
	} finally {
		recipientsLoading = false;
	}
}

function selectRecipient(r: TransferRecipient) {
	selectedRecipient = selectedRecipient?.id === r.id ? null : r;
	transferId = fmtId(r.id);
	transferError = "";
}

async function handleCopyId(rawId: number) {
	await copyToClipboard(String(rawId));
	copiedUserId = rawId;
	setTimeout(() => {
		if (copiedUserId === rawId) copiedUserId = null;
	}, 1500);
}

function getTransferUserId(): number | null {
	if (resolvedUser) return resolvedUser.id;
	return parseId(transferId) || null;
}

async function handleTransfer() {
	const id = getTelegramInitData();
	if (!id || !transferId || !transferAmount || transferLoading) return;
	const toId = getTransferUserId();
	if (!toId) return;
	transferLoading = true;
	transferError = "";
	try {
		await fetchTransfer(id, toId, Number(transferAmount));
		balanceKey++;
		showTransfer = false;
		transferId = "";
		transferAmount = "";
		selectedRecipient = null;
		resolvedUser = null;
		await load();
	} catch (e) {
		transferError = e instanceof Error ? e.message : String(e);
	} finally {
		transferLoading = false;
	}
}

async function resolveUsername(raw: string) {
	if (!raw.startsWith("@")) {
		resolvedUser = null;
		return;
	}
	const initData = getTelegramInitData();
	if (!initData) return;
	try {
		const user = await fetchUserByUsername(initData, raw);
		resolvedUser = user;
	} catch {
		resolvedUser = null;
	}
}

function getDailyRewardState(tiers: DailyRewardTier[]): DailyRewardState {
	if (!user || tiers.length === 0)
		return { claimed: 0, next: 1, canClaim: false, tiers };

	const today = new Date().toISOString().slice(0, 10);
	const lastDate = user.lastDailyBonus?.slice(0, 10) ?? null;

	if (!lastDate) return { claimed: 0, next: 1, canClaim: true, tiers };

	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	const yesterdayStr = yesterday.toISOString().slice(0, 10);

	const dbStreak = user.dailyRewardStreak ?? 0;

	if (lastDate === today)
		return {
			claimed: dbStreak,
			next: Math.min(dbStreak + 1, tiers.length + 1),
			canClaim: false,
			tiers,
		};

	if (lastDate === yesterdayStr)
		return {
			claimed: dbStreak,
			next: Math.min(dbStreak + 1, tiers.length + 1),
			canClaim: true,
			tiers,
		};

	return { claimed: 0, next: 1, canClaim: true, tiers };
}

function copyableIdSpan(rawId: number, copiedId: number | null): string {
	return copiedId === rawId ? "✓ Скопировано" : `#${fmtId(rawId)}`;
}

function badge(type: string) {
	if (type === "transfer")
		return "bg-[var(--tg-theme-accent-text-color,#40a7e3)]/10 text-[var(--tg-theme-accent-text-color,#40a7e3)]";
	if (type === "daily_bonus")
		return "bg-[var(--color-emerald)]/10 text-[var(--color-emerald)]";
	if (type === "game_win")
		return "bg-[var(--color-emerald)]/10 text-[var(--color-emerald)]";
	if (type === "game_lose")
		return "bg-[var(--color-ruby)]/10 text-[var(--color-ruby)]";
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
		case "game_win":
			return "Выигрыш 🎮";
		case "game_lose":
			return "Проигрыш 🎮";
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
	const interval = setInterval(pollSummary, 15_000);
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
		<div class="grid grid-cols-2 gap-3 mb-6">
			<div class="rounded-2xl p-4 relative overflow-hidden" style="background: linear-gradient(135deg, #2b5278 0%, #1a3a5c 100%);">
				<div class="absolute top-0 right-0 w-24 h-24 opacity-10">
					<svg viewBox="0 0 100 100" fill="white"><circle cx="50" cy="50" r="40"/></svg>
				</div>
				<div class="relative z-10">
					<div class="text-xs font-medium text-white/60 mb-1 uppercase tracking-wider">Бипки</div>
					<div class="text-2xl font-bold text-white">{fmtNum(user.bipki)}</div>
				</div>
			</div>
			<div class="rounded-2xl p-4 relative overflow-hidden" style="background: linear-gradient(135deg, #5d4b8a 0%, #3d2d6a 100%);">
				<div class="absolute top-0 right-0 w-24 h-24 opacity-10">
					<svg viewBox="0 0 100 100" fill="white"><polygon points="50,5 95,35 78,90 22,90 5,35"/></svg>
				</div>
				<div class="relative z-10">
					<div class="text-xs font-medium text-white/60 mb-1 uppercase tracking-wider">Мегабипки</div>
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
				<span
					role="button"
					tabindex="0"
					onclick={() => handleCopyId(user.id)}
					onkeydown={(e) => e.key === "Enter" && handleCopyId(user.id)}
					class="font-mono text-xs cursor-pointer transition-colors hover:text-[var(--tg-theme-accent-text-color,#40a7e3)]"
				>{copiedUserId === user.id ? "✓ Скопировано" : `#${fmtId(user.id)}`}</span>
			</div>
		</div>

		<div class="rounded-2xl glass-card p-5 mb-6 relative overflow-hidden">
			<div class="absolute inset-0 noise-overlay rounded-2xl"></div>
			<div class="relative z-10">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-sm font-semibold">Ежедневные награды</h3>
					<span class="flex items-center gap-1 text-xs text-[var(--tg-theme-hint-color,#999)]">
						🔥 {dailyState.claimed > 0 ? dailyState.claimed : "—"}
					</span>
				</div>

				{#if claimedReward}
					<div class="daily-reward-popup">
						<div class="daily-reward-popup-inner">
							<span class="text-sm">🎉 День {claimedReward.streak}!</span>
							<span class="text-lg font-bold" style="color: var(--color-gold);">
								+{claimedReward.bipki} 🪙
								{#if claimedReward.megabipki > 0}
									+{claimedReward.megabipki} 💎
								{/if}
							</span>
						</div>
					</div>
				{/if}

				<div class="flex gap-1.5 mb-4">
					{#each dailyState.tiers as tier}
						{@const isClaimed = tier.day <= dailyState.claimed}
						{@const isActive = tier.day === dailyState.next && dailyState.canClaim}
						<div
							class="flex-1 flex flex-col items-center gap-1 rounded-xl px-1.5 py-3 transition-all duration-300
								{isActive
									? 'daily-col-active'
									: isClaimed
										? 'daily-col-claimed'
										: 'daily-col-future'}"
						>
							<span class="text-[10px] font-medium uppercase tracking-wider
								{isActive
									? 'text-[var(--color-gold-light)]'
									: 'text-[var(--tg-theme-hint-color,#999)]'}">
								День
							</span>
							<span class="text-lg leading-none {isActive ? 'daily-col-day-active' : isClaimed ? 'opacity-50' : ''}">
								{tier.day}
							</span>
							<div class="flex flex-col items-center gap-0.5 mt-1">
								<span class="text-[11px] font-medium {isActive ? 'text-[var(--color-gold)]' : isClaimed ? 'text-[var(--tg-theme-hint-color,#999)]' : ''}">
									🪙+{tier.bipki}
								</span>
								{#if tier.megabipki > 0}
									<span class="text-[11px] font-medium {isActive ? 'text-[var(--color-gold-light)]' : isClaimed ? 'text-[var(--tg-theme-hint-color,#999)]' : ''}">
										💎+{tier.megabipki}
									</span>
								{/if}
							</div>
							{#if isClaimed}
								<CheckIcon size={16} strokeWidth={3} style="color: var(--color-emerald);" />
							{/if}
						</div>
					{/each}
				</div>

				<button
					onclick={handleDaily}
					disabled={!dailyState.canClaim || claiming}
					class="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2
						{dailyState.canClaim && !claiming
							? 'daily-btn-claim'
							: 'bg-[var(--tg-theme-secondary-bg-color,#e8e8e8)] text-[var(--tg-theme-hint-color,#999)] cursor-not-allowed'}"
				>
					{#if claiming}
						Забираем...
					{:else if !dailyState.canClaim}
						<CheckIcon size={16} strokeWidth={3} /> Получено
					{:else}
						<GiftIcon size={16} strokeWidth={2} /> Забрать награду
					{/if}
				</button>
			</div>
		</div>

		<div class="rounded-2xl glass-card p-5 mb-6 relative overflow-hidden">
			<div class="relative z-10">
				<button
					onclick={() => {
						showTransfer = !showTransfer;
						if (showTransfer) loadRecipients();
					}}
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
						<div class="flex rounded-xl overflow-hidden border border-[var(--tg-theme-section-separator-color,#e0e0e0)]">
							<button
								onclick={() => { transferMode = "friends"; if (recipients.length === 0) loadRecipients(); }}
								class="flex-1 py-2 text-xs font-medium transition-all duration-200
									{transferMode === 'friends'
										? 'bg-[var(--tg-theme-button-color,#40a7e3)] text-white'
										: 'bg-[var(--tg-theme-secondary-bg-color,#e8e8e8)] text-[var(--tg-theme-hint-color,#999)]'}"
							>Друзья</button>
							<button
								onclick={() => { transferMode = "id"; selectedRecipient = null; resolvedUser = null; }}
								class="flex-1 py-2 text-xs font-medium transition-all duration-200
									{transferMode === 'id'
										? 'bg-[var(--tg-theme-button-color,#40a7e3)] text-white'
										: 'bg-[var(--tg-theme-secondary-bg-color,#e8e8e8)] text-[var(--tg-theme-hint-color,#999)]'}"
							>по ID / @</button>
						</div>

						{#if transferMode === "friends"}
							{#if recipientsLoading}
								<div class="flex justify-center py-4">
									<div class="w-5 h-5 rounded-full border-2 border-[var(--tg-theme-accent-text-color,#40a7e3)] border-t-transparent animate-spin"></div>
								</div>
							{:else if recipients.length === 0}
								<p class="text-xs text-[var(--tg-theme-hint-color,#999)] text-center py-4">
									Нет пользователей в общих чатах
								</p>
							{:else}
								<div class="max-h-48 overflow-y-auto space-y-1">
									{#each recipients as r}
										<button
											onclick={() => selectRecipient(r)}
											class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200
												{selectedRecipient?.id === r.id
													? 'bg-[var(--tg-theme-button-color,#40a7e3)]/10 border border-[var(--tg-theme-button-color,#40a7e3)]/30'
													: 'bg-[var(--tg-theme-secondary-bg-color,#e8e8e8)] hover:brightness-95 border border-transparent'}"
										>
											<div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--tg-theme-accent-text-color,#40a7e3)]/20 text-[var(--tg-theme-accent-text-color,#40a7e3)] text-xs font-bold">
												{r.name?.charAt(0) ?? r.username?.charAt(0) ?? String(r.id).charAt(0)}
											</div>
											<div class="flex-1 min-w-0">
												<div class="text-sm font-medium truncate">{r.name ?? r.username ?? copyableIdSpan(r.id, copiedUserId)}</div>
												<div class="text-xs text-[var(--tg-theme-hint-color,#999)]">
													{r.username ? `@${r.username}` : `#${fmtId(r.id)}`}
												</div>
											</div>
											<div class="text-xs font-semibold text-[var(--tg-theme-accent-text-color,#40a7e3)] shrink-0">
												{fmtNum(r.bipki)} 🪙
											</div>
										</button>
									{/each}
								</div>
							{/if}

							{#if selectedRecipient}
								<div class="pt-1">
									<div class="text-xs text-[var(--tg-theme-hint-color,#999)] mb-2">
										Перевод для <span class="font-medium text-[var(--tg-theme-text-color,#000)]">{selectedRecipient.name ?? copyableIdSpan(selectedRecipient.id, copiedUserId)}</span>
									</div>
									<input
										type="number"
										bind:value={transferAmount}
										placeholder="Сумма"
										class="w-full px-4 py-3 rounded-xl bg-[var(--tg-theme-bg-color,#f5f5f7)] border border-[var(--tg-theme-section-separator-color,#e0e0e0)] text-sm text-[var(--tg-theme-text-color,#000)] placeholder:text-[var(--tg-theme-hint-color,#999)]/50 outline-none focus:border-[var(--tg-theme-accent-text-color,#40a7e3)] transition-colors"
									/>
								</div>
							{/if}
						{/if}

						{#if transferMode === "id"}
							<input
								type="text"
								inputmode="text"
								value={transferId}
								oninput={(e) => {
									const raw = e.currentTarget.value;
									transferId = raw.startsWith("@") ? raw : formatIdInput(raw);
									if (resolveTimer) clearTimeout(resolveTimer);
									resolveTimer = setTimeout(() => resolveUsername(transferId), 400);
								}}
								placeholder="ID или @username"
								class="w-full px-4 py-3 rounded-xl bg-[var(--tg-theme-bg-color,#f5f5f7)] border border-[var(--tg-theme-section-separator-color,#e0e0e0)] text-sm text-[var(--tg-theme-text-color,#000)] placeholder:text-[var(--tg-theme-hint-color,#999)]/50 outline-none focus:border-[var(--tg-theme-accent-text-color,#40a7e3)] transition-colors"
							/>
							{#if resolvedUser}
								<div class="text-xs text-[var(--color-emerald)] flex items-center gap-1">
									✓ {resolvedUser.name ?? resolvedUser.username} — {fmtId(resolvedUser.id)}
								</div>
							{/if}
							<input
								type="number"
								bind:value={transferAmount}
								placeholder="Сумма"
								class="w-full px-4 py-3 rounded-xl bg-[var(--tg-theme-bg-color,#f5f5f7)] border border-[var(--tg-theme-section-separator-color,#e0e0e0)] text-sm text-[var(--tg-theme-text-color,#000)] placeholder:text-[var(--tg-theme-hint-color,#999)]/50 outline-none focus:border-[var(--tg-theme-accent-text-color,#40a7e3)] transition-colors"
							/>
						{/if}

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
									{tx.type === 'daily_bonus' ? '🎁' : tx.type === 'game_win' ? '🎉' : tx.type === 'game_lose' ? '😔' : tx.fromUserId ? (tx.toUserId === user.id ? '⬇️' : '⬆️') : '🏦'}
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
									{tx.currency === 'bipki' ? 'Бипки' : 'Мега'}
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

<style>
	.daily-col-active {
		background: color-mix(in srgb, var(--color-gold) 6%, transparent);
		border: 1.5px solid color-mix(in srgb, var(--color-gold) 50%, transparent);
		box-shadow: 0 0 12px color-mix(in srgb, var(--color-gold) 15%, transparent);
		transform: scale(1.04);
	}

	.daily-col-claimed {
		opacity: 0.55;
		background: color-mix(in srgb, var(--tg-theme-secondary-bg-color, #e8e8e8) 30%, transparent);
		border: 1px solid color-mix(in srgb, var(--tg-theme-section-separator-color, #e0e0e0) 20%, transparent);
	}

	.daily-col-future {
		border: 1px solid color-mix(in srgb, var(--tg-theme-section-separator-color, #e0e0e0) 40%, transparent);
	}

	.daily-col-day-active {
		font-family: var(--font-display, "Inter", sans-serif);
		font-size: 1.5rem;
		font-weight: 400;
		background: linear-gradient(135deg, var(--color-gold-light), var(--color-gold));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.daily-btn-claim {
		background: linear-gradient(135deg, var(--color-sapphire) 0%, #5a4bd6 50%, var(--color-gold-dark) 100%);
		background-size: 200% 100%;
		color: white;
		animation: daily-shimmer 3s ease-in-out infinite;
	}
	.daily-btn-claim:hover {
		filter: brightness(1.1);
	}
	.daily-btn-claim:active {
		transform: scale(0.97);
	}

	.daily-reward-popup {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 20;
		background: color-mix(in srgb, var(--tg-theme-button-color, #40a7e3) 12%, var(--tg-theme-bg-color, #f5f5f7));
		border-radius: 1rem;
		animation: reward-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}

	.daily-reward-popup-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		animation: reward-bounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}

	@keyframes reward-in {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes reward-bounce {
		from {
			opacity: 0;
			transform: translateY(12px) scale(0.8);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes daily-shimmer {
		0%,
		100% {
			background-position: 0% 50%;
		}
		50% {
			background-position: 100% 50%;
		}
	}
</style>
