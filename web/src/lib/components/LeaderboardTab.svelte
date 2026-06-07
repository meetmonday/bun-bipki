<script lang="ts">
import { onMount } from "svelte";
import { fetchStats, type Stats } from "$lib/api";

let _stats = $state<Stats | null>(null);
let _error = $state("");

function _fmtNum(n: number) {
	return n.toLocaleString("ru-RU");
}

async function load() {
	try {
		_stats = await fetchStats();
	} catch (e) {
		_error = String(e);
	}
}

onMount(() => {
	load();
	const id = setInterval(load, 15_000);
	return () => clearInterval(id);
});
</script>

{#if error}
	<div class="bg-tg-red/10 border border-tg-red/20 rounded-lg p-3 text-sm text-tg-red mb-6">{error}</div>
{/if}

<section>
	<h2 class="text-lg font-semibold mb-4">🏆 Топ пользователей</h2>
	<div class="bg-tg-card border border-tg-border rounded-xl overflow-hidden text-sm">
		<table class="w-full border-collapse">
			<thead>
				<tr class="bg-tg-card-hover text-tg-hint text-xs uppercase tracking-wider">
					<th class="p-3 text-left font-medium">#</th>
					<th class="p-3 text-left font-medium">Имя</th>
					<th class="p-3 text-right font-medium">Bipki</th>
					<th class="p-3 text-right font-medium">Mega</th>
				</tr>
			</thead>
			<tbody>
				{#if stats?.topUsers.length}
					{#each stats.topUsers as user, i}
						<tr class="border-t border-tg-border hover:bg-tg-card-hover transition-colors">
							<td class="p-3">{i + 1}</td>
							<td class="p-3">{user.name ?? user.username ?? `#${user.id}`}</td>
							<td class="p-3 text-right">{fmtNum(user.bipki)}</td>
							<td class="p-3 text-right">{fmtNum(user.megabipki)}</td>
						</tr>
					{/each}
				{:else}
					<tr><td colspan="4" class="p-6 text-center text-tg-hint">Нет данных</td></tr>
				{/if}
			</tbody>
		</table>
	</div>
</section>
