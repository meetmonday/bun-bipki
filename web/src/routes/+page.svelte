<script lang="ts">
import HoldingsTab from "$lib/components/HoldingsTab.svelte";
import LeaderboardTab from "$lib/components/LeaderboardTab.svelte";

let activeTab = $state("holdings");

function goAdmin() {
	window.location.href = "/admin";
}
</script>

<div class="max-w-6xl mx-auto">
	<header class="mb-6">
		<h1 class="text-2xl font-bold flex items-center gap-2">
			<span class="text-tg-accent">✦</span> Bipki Bot
		</h1>
	</header>

	<div class="flex gap-1 mb-6 bg-tg-card border border-tg-border rounded-xl p-1 overflow-x-auto">
		<button
			onclick={() => (activeTab = "holdings")}
			class="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap
				{activeTab === 'holdings' ? 'bg-tg-accent text-white shadow-sm' : 'text-tg-hint hover:text-tg-text hover:bg-tg-card-hover'}"
		>
			💼 Владения
		</button>
		<button
			onclick={() => (activeTab = "top")}
			class="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap
				{activeTab === 'top' ? 'bg-tg-accent text-white shadow-sm' : 'text-tg-hint hover:text-tg-text hover:bg-tg-card-hover'}"
		>
			🏆 Топ
		</button>
		<button
			onclick={goAdmin}
			class="flex-none px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap text-tg-hint hover:text-tg-text hover:bg-tg-card-hover"
		>
			⚙️ Админка
		</button>
	</div>

	{#if activeTab === "holdings"}
		<HoldingsTab />
	{:else if activeTab === "top"}
		<LeaderboardTab />
	{/if}
</div>
