<script lang="ts">
import { onMount } from "svelte";
import type { Transaction } from "$lib/api";
import { fetchMe, getTelegramInitData, type User } from "$lib/api";

let loading = $state(true);
let user = $state<User | null>(null);
let transactions = $state<Transaction[]>([]);
let error = $state("");

type Filter = "all" | "incoming" | "outgoing" | "bonus" | "admin";

let activeFilter = $state<Filter>("all");

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
	} catch (e) {
		error = String(e);
	} finally {
		loading = false;
	}
}

function getFiltered(): Transaction[] {
	if (!user) return [];
	return transactions.filter((tx) => {
		switch (activeFilter) {
			case "incoming":
				return (
					tx.toUserId === user.id &&
					tx.type !== "daily_bonus" &&
					tx.type !== "admin_add" &&
					tx.type !== "web_admin"
				);
			case "outgoing":
				return tx.fromUserId === user.id;
			case "bonus":
				return tx.type === "daily_bonus";
			case "admin":
				return (
					tx.type === "admin_add" ||
					tx.type === "web_admin" ||
					tx.type === "admin_remove"
				);
			default:
				return true;
		}
	});
}

function groupByDate(txs: Transaction[]): Map<string, Transaction[]> {
	const groups = new Map<string, Transaction[]>();
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	for (const tx of txs) {
		const date = new Date(tx.createdAt);
		let label: string;
		if (
			date.getFullYear() === today.getFullYear() &&
			date.getMonth() === today.getMonth() &&
			date.getDate() === today.getDate()
		) {
			label = "Сегодня";
		} else if (
			date.getFullYear() === yesterday.getFullYear() &&
			date.getMonth() === yesterday.getMonth() &&
			date.getDate() === yesterday.getDate()
		) {
			label = "Вчера";
		} else {
			label = date.toLocaleDateString("ru-RU", {
				day: "numeric",
				month: "long",
			});
		}
		const group = groups.get(label) ?? [];
		group.push(tx);
		groups.set(label, group);
	}
	return groups;
}

function fmtTime(iso: string) {
	return new Date(iso).toLocaleString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function typeIcon(type: string) {
	switch (type) {
		case "transfer":
			return "↗️";
		case "daily_bonus":
			return "🎁";
		case "admin_add":
		case "web_admin":
			return "🏛️";
		case "admin_remove":
			return "🏛️";
		default:
			return "•";
	}
}

function typeLabel(type: string) {
	switch (type) {
		case "transfer":
			return "Перевод";
		case "daily_bonus":
			return "Ежедневный бонус";
		case "admin_add":
		case "web_admin":
			return "Начисление";
		case "admin_remove":
			return "Списание";
		default:
			return type;
	}
}

const filters: { id: Filter; label: string }[] = [
	{ id: "all", label: "Все" },
	{ id: "incoming", label: "Входящие" },
	{ id: "outgoing", label: "Исходящие" },
	{ id: "bonus", label: "Бонусы" },
	{ id: "admin", label: "Системные" },
];

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
		<h1 class="serif-heading text-xl mb-5">История операций</h1>

		<div class="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
			{#each filters as f}
				<button
					onclick={() => (activeFilter = f.id)}
					class="shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200
						{activeFilter === f.id
							? 'bg-[var(--tg-theme-button-color,#40a7e3)] text-white'
							: 'bg-[var(--tg-theme-secondary-bg-color,#e8e8e8)] text-[var(--tg-theme-hint-color,#999)] hover:brightness-95'}"
				>
					{f.label}
				</button>
			{/each}
		</div>

		{#key activeFilter}
			{@const filtered = getFiltered()}
			{#if filtered.length}
				{#each [...groupByDate(filtered).entries()] as [dateLabel, txs]}
					<div class="mb-4">
						<p class="text-xs font-semibold text-[var(--tg-theme-hint-color,#999)] uppercase tracking-wider mb-2 px-1">
							{dateLabel}
						</p>
						<div class="space-y-1">
							{#each txs as tx}
								<div class="glass-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all duration-200 hover:brightness-95">
									<div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0
										{tx.fromUserId ? (tx.toUserId === user.id ? 'bg-[var(--color-emerald)]/10' : 'bg-[var(--color-ruby)]/10') : 'bg-[var(--color-gold)]/10'}">
										<span class="text-sm">{typeIcon(tx.type)}</span>
									</div>
									<div class="flex-1 min-w-0">
										<div class="text-sm font-medium truncate">{typeLabel(tx.type)}</div>
										<div class="text-xs text-[var(--tg-theme-hint-color,#999)]">
											{tx.fromUserId
												? (tx.toUserId === user.id ? 'От #' + tx.fromUserId : 'Кому #' + tx.toUserId)
												: 'Система'}
										</div>
									</div>
									<div class="text-right shrink-0">
										<div class="text-sm font-semibold
											{tx.fromUserId ? (tx.toUserId === user.id ? 'text-[var(--color-emerald)]' : 'text-[var(--color-ruby)]') : 'text-[var(--color-gold)]'}">
											{tx.fromUserId ? (tx.toUserId === user.id ? '+' : '-') : '+'}{fmtNum(tx.amount)}
										</div>
										<div class="text-xs text-[var(--tg-theme-hint-color,#999)]">
											{tx.currency === 'bipki' ? '🪙' : '💎'} {fmtTime(tx.createdAt)}
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			{:else}
				<div class="glass-card rounded-xl p-10 text-center mt-4">
					<div class="text-3xl mb-3 opacity-30">📭</div>
					<p class="text-sm text-[var(--tg-theme-hint-color,#999)]">Нет операций этого типа</p>
				</div>
			{/if}
		{/key}
	</div>
{/if}

<style>
	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-none {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
