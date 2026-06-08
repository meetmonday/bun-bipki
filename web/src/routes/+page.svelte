<script lang="ts">
import DashboardTab from "$lib/components/DashboardTab.svelte";
import LeaderboardTab from "$lib/components/LeaderboardTab.svelte";
import TransactionsTab from "$lib/components/TransactionsTab.svelte";
import ArrowDownUpIcon from "$lib/icons/ArrowDownUpIcon.svelte";
import TrophyIcon from "$lib/icons/TrophyIcon.svelte";
import WalletIcon from "$lib/icons/WalletIcon.svelte";

type Tab = "dashboard" | "transactions" | "leaderboard";

let activeTab = $state<Tab>("dashboard");

const tabTitles: Record<Tab, string> = {
	dashboard: "Bipki Bank · Кошелёк",
	transactions: "Bipki Bank · История",
	leaderboard: "Bipki Bank · Топ",
};

$effect(() => {
	document.title = tabTitles[activeTab];
});

const tabs = [
	{ id: "dashboard" as Tab, icon: WalletIcon, label: "Счёт" },
	{ id: "transactions" as Tab, icon: ArrowDownUpIcon, label: "История" },
	{ id: "leaderboard" as Tab, icon: TrophyIcon, label: "Топ" },
];
</script>

<div class="flex flex-col min-h-dvh bg-[var(--tg-theme-bg-color,#f5f5f7)] noise-overlay relative overflow-hidden">
	<main class="flex-1 overflow-y-auto px-4 pt-4 pb-20">
		{#key activeTab}
			{#if activeTab === "dashboard"}
				<DashboardTab />
			{:else if activeTab === "transactions"}
				<TransactionsTab />
			{:else}
				<LeaderboardTab />
			{/if}
		{/key}
	</main>

	<nav class="fixed bottom-0 left-0 right-0 flex bg-[var(--tg-theme-bottom-bar-bg-color,var(--tg-theme-bg-color,#fff))] border-t border-[var(--tg-theme-section-separator-color,#e0e0e0)] px-3 pt-1 pb-[env(safe-area-inset-bottom,8px)] z-10">
		{#each tabs as tab}
			<button
				onclick={() => (activeTab = tab.id)}
				class="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-medium transition-all duration-200
					{activeTab === tab.id
						? 'text-[var(--tg-theme-accent-text-color,#40a7e3)]'
						: 'text-[var(--tg-theme-hint-color,#999)]'}"
			>
				<tab.icon size={20} strokeWidth={1.5} />
				<span>{tab.label}</span>
			</button>
		{/each}
	</nav>
</div>
