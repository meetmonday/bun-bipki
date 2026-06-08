<script lang="ts">
import { onMount } from "svelte";
import { fetchMe, fetchStats, getTelegramInitData, type Stats } from "$lib/api";
import { copyToClipboard, fmtId } from "$lib/format";

let stats = $state<Stats | null>(null);
let myId = $state<number | null>(null);
let myRank = $state<number | null>(null);
let error = $state("");
let copiedUserId = $state<number | null>(null);

function fmtNum(n: number) {
	return n.toLocaleString("ru-RU");
}

function getMedal(i: number): string {
	if (i === 0) return "🥇";
	if (i === 1) return "🥈";
	if (i === 2) return "🥉";
	return "";
}

async function handleCopyId(rawId: number) {
	await copyToClipboard(String(rawId));
	copiedUserId = rawId;
	setTimeout(() => {
		if (copiedUserId === rawId) copiedUserId = null;
	}, 1500);
}

function getMedalClass(i: number): string {
	if (i === 0) return "text-[var(--color-gold)]";
	if (i === 1) return "text-[var(--color-silver)]";
	if (i === 2) return "text-amber-600";
	return "text-[var(--tg-theme-hint-color,#999)]";
}

async function loadMyInfo() {
	const id = getTelegramInitData();
	if (!id) return;
	try {
		const me = await fetchMe(id);
		myId = me.user.id;
		myRank = me.rank;
	} catch {
		// silent
	}
}

async function load() {
	try {
		stats = await fetchStats();
	} catch (e) {
		error = String(e);
	}
}

onMount(() => {
	loadMyInfo();
	load();
});
</script>

{#if error}
	<div class="text-center py-16">
		<div class="text-4xl mb-4 opacity-30">⚠️</div>
		<p class="text-sm text-[var(--tg-theme-hint-color,#999)]">{error}</p>
	</div>
{:else}
	<div class="animate-in">
		<div class="flex items-center justify-between mb-5">
			<h1 class="serif-heading text-xl">Топ пользователей</h1>
			<div class="glass-card rounded-xl px-3 py-1.5 text-xs flex items-center gap-2">
				<span class="text-[var(--tg-theme-hint-color,#999)]">Мой ранг</span>
				<span class="font-semibold text-[var(--tg-theme-accent-text-color,#40a7e3)]">{myRank ? '#' + fmtNum(myRank) : '—'}</span>
			</div>
		</div>

		{#if stats?.topUsers.length}
			<div class="glass-card rounded-2xl overflow-hidden">
				{#each stats.topUsers as user, i}
					{@const isMe = user.id === myId}
					<div
						class="flex items-center gap-3 px-4 py-3.5 transition-all duration-200
							{i < stats.topUsers.length - 1 ? 'border-b border-[var(--tg-theme-section-separator-color,#e0e0e0)]/50' : ''}
							{isMe ? 'bg-[var(--tg-theme-accent-text-color,#40a7e3)]/5' : 'hover:bg-[var(--tg-theme-secondary-bg-color,#e8e8e8)]/50'}
							{isMe ? 'animate-in' : ''}"
						class:relative={isMe}
					>
						{#if isMe}
							<div class="absolute inset-0 rounded-2xl border border-[var(--tg-theme-accent-text-color,#40a7e3)]/20 pointer-events-none"></div>
						{/if}

						<div class="w-8 text-center shrink-0">
							{#if i < 3}
								<span class="text-lg">{getMedal(i)}</span>
							{:else}
								<span class="text-sm font-semibold text-[var(--tg-theme-hint-color,#999)]">{i + 1}</span>
							{/if}
						</div>

						<div class="w-9 h-9 rounded-full bg-[var(--tg-theme-secondary-bg-color,#e8e8e8)] flex items-center justify-center shrink-0 text-sm font-semibold text-[var(--tg-theme-hint-color,#999)]">
							{(user.name ?? user.username ?? String(user.id)).charAt(0).toUpperCase()}
						</div>

						<div class="flex-1 min-w-0">
							<div class="text-sm font-medium truncate flex items-center gap-1.5">
								{user.name ?? user.username ?? `#${fmtId(user.id)}`}
								{#if isMe}
									<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--tg-theme-accent-text-color,#40a7e3)]/10 text-[var(--tg-theme-accent-text-color,#40a7e3)] font-semibold">Вы</span>
								{/if}
							</div>
							<div
								role="button"
								tabindex="0"
								onclick={() => handleCopyId(user.id)}
								onkeydown={(e) => e.key === "Enter" && handleCopyId(user.id)}
								class="text-xs cursor-pointer text-[var(--tg-theme-hint-color,#999)] hover:text-[var(--tg-theme-accent-text-color,#40a7e3)] transition-colors"
							>{copiedUserId === user.id ? "✓" : `#${fmtId(user.id)}`}</div>
						</div>

						<div class="text-right shrink-0">
							<div class="text-sm font-semibold">{fmtNum(user.bipki)}</div>
							<div class="text-xs text-[var(--tg-theme-hint-color,#999)]">{fmtNum(user.megabipki)} 💎</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="glass-card rounded-xl p-10 text-center">
				<div class="text-3xl mb-3 opacity-30">🏆</div>
				<p class="text-sm text-[var(--tg-theme-hint-color,#999)]">Пока нет пользователей</p>
			</div>
		{/if}
	</div>
{/if}
