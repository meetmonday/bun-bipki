<script lang="ts">
import DashboardTab from "$lib/components/DashboardTab.svelte";
import LeaderboardTab from "$lib/components/LeaderboardTab.svelte";
import TransactionsTab from "$lib/components/TransactionsTab.svelte";

type Tab = "dashboard" | "transactions" | "leaderboard";

let activeTab = $state<Tab>("dashboard");
let prevTab = $state<Tab>("dashboard");

function switchTab(tab: Tab) {
	prevTab = activeTab;
	activeTab = tab;
}
</script>

<div class="flex flex-col min-h-screen bg-[var(--tg-theme-bg-color,#f5f5f7)] noise-overlay relative overflow-hidden">
	{#key activeTab}
		<main class="flex-1 overflow-y-auto px-4 pt-4 pb-2">
			{#if activeTab === "dashboard"}
				<DashboardTab />
			{:else if activeTab === "transactions"}
				<TransactionsTab />
			{:else}
				<LeaderboardTab />
			{/if}
		</main>
	{/key}

	<nav class="flex-none flex bg-[var(--tg-theme-bottom-bar-bg-color,var(--tg-theme-bg-color,#fff))] border-t border-[var(--tg-theme-section-separator-color,#e0e0e0)] px-3 pt-1 pb-[env(safe-area-inset-bottom,8px)] z-10">
		{#each [
			{ id: "dashboard" as Tab, icon: "wallet", label: "Счёт" },
			{ id: "transactions" as Tab, icon: "arrows", label: "История" },
			{ id: "leaderboard" as Tab, icon: "trophy", label: "Топ" },
		] as tab}
			<button
				onclick={() => switchTab(tab.id)}
				class="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-medium transition-all duration-200
					{activeTab === tab.id
						? 'text-[var(--tg-theme-accent-text-color,#40a7e3)]'
						: 'text-[var(--tg-theme-hint-color,#999)]'}"
			>
				{#if tab.icon === "wallet"}
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
						<path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
						<path d="M18 12a2 2 0 1 0 0 4h4v-4Z" />
					</svg>
				{:else if tab.icon === "arrows"}
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 5v14" />
						<path d="M19 12l-7 7-7-7" />
					</svg>
				{:else}
					<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
						<path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
						<path d="M4 22h16" />
						<path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
						<path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
						<path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
					</svg>
				{/if}
				<span>{tab.label}</span>
			</button>
		{/each}
	</nav>
</div>
