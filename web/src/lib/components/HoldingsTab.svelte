<script lang="ts">
import { onMount } from "svelte";
import { fetchMe, getTelegramInitData } from "$lib/api";

let _loading = $state(true);

async function load() {
	_loading = true;
	error = "";
	const id = getTelegramInitData();
	if (!id) {
		error = "Не удалось получить контекст Telegram. Откройте через Mini App.";
		_loading = false;
		return;
	}
	try {
		const me = await fetchMe(id);
		user = me.user;
		transactions = me.transactions;
		rank = me.rank;
		isAdmin = me.isAdmin;
	} catch (e) {
		error = String(e);
	} finally {
		_loading = false;
	}
}

onMount(() => {
	load();
	const interval = setInterval(load, 15_000);
	return () => clearInterval(interval);
});

function _fmtNum(n: number) {
	return n.toLocaleString("ru-RU");
}

function _fmtDate(iso: string) {
	return new Date(iso).toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

function _badge(type: string) {
	if (type === "transfer") return "bg-tg-yellow/20 text-tg-yellow";
	if (type === "daily_bonus") return "bg-tg-green/20 text-tg-green";
	if (type === "admin_add" || type === "web_admin")
		return "bg-tg-accent/20 text-tg-accent";
	if (type === "admin_remove") return "bg-tg-red/20 text-tg-red";
	return "bg-tg-hint/20 text-tg-hint";
}

function _typeLabel(type: string) {
	switch (type) {
		case "transfer":
			return "Перевод";
		case "daily_bonus":
			return "Бонус";
		case "admin_add":
			return "Начисление";
		case "web_admin":
			return "Начисление";
		case "admin_remove":
			return "Списание";
		default:
			return type;
	}
}
</script>

{#if loading && !user}
	<div class="text-center py-12 text-tg-hint">Загрузка...</div>
{:else if error && !user}
	<div class="bg-tg-red/10 border border-tg-red/20 rounded-xl p-4 text-sm text-tg-red">{error}</div>
{:else if user}
	<div class="flex items-center justify-between mb-6">
		<div>
			<p class="text-tg-hint text-sm">Добро пожаловать</p>
			<h2 class="text-xl font-bold">{user.name ?? user.username ?? `#${user.id}`}</h2>
		</div>
		<div class="text-right text-sm text-tg-hint">
			<div class="bg-tg-card border border-tg-border rounded-lg px-3 py-1.5">
				<span class="text-tg-accent font-semibold">#{fmtNum(rank!)}</span>
				<span class="text-tg-hint"> в топе</span>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
		<div class="rounded-xl p-5 relative overflow-hidden" style="background: linear-gradient(135deg, #2b5278 0%, #1a3a5c 100%);">
			<div class="text-3xl mb-2">🪙</div>
			<div class="text-xs text-tg-hint mb-1">Bipki</div>
			<div class="text-3xl font-bold">{fmtNum(user.bipki)}</div>
		</div>
		<div class="rounded-xl p-5 relative overflow-hidden" style="background: linear-gradient(135deg, #5d4b8a 0%, #3d2d6a 100%);">
			<div class="text-3xl mb-2">💎</div>
			<div class="text-xs text-tg-hint mb-1">Megabipki</div>
			<div class="text-3xl font-bold">{fmtNum(user.megabipki)}</div>
		</div>
	</div>

	<div class="text-xs text-tg-hint mb-6">
		Зарегистрирован: {fmtDate(user.createdAt)}
	</div>

	<section>
		<h3 class="text-base font-semibold mb-3">📋 История операций</h3>
		<div class="bg-tg-card border border-tg-border rounded-xl overflow-hidden">
			{#if transactions.length}
				<table class="w-full text-sm">
					<thead>
						<tr class="text-tg-hint text-xs uppercase tracking-wider border-b border-tg-border">
							<th class="p-3 text-left font-medium">Тип</th>
							<th class="p-3 text-right font-medium">Сумма</th>
							<th class="p-3 text-right font-medium hidden sm:table-cell">Дата</th>
						</tr>
					</thead>
					<tbody>
						{#each transactions as tx}
							<tr class="border-b border-tg-border last:border-0 hover:bg-tg-card-hover transition-colors">
								<td class="p-3">
									<span class="inline-block px-2 py-0.5 rounded text-xs font-semibold {badge(tx.type)}">{typeLabel(tx.type)}</span>
								</td>
								<td class="p-3 text-right font-medium {tx.fromUserId ? (tx.toUserId === user.id ? 'text-tg-green' : 'text-tg-red') : 'text-tg-accent'}">
									{tx.fromUserId ? (tx.toUserId === user.id ? '+' : '-') : '+'}{fmtNum(tx.amount)} {tx.currency === 'bipki' ? '🪙' : '💎'}
								</td>
								<td class="p-3 text-right text-tg-hint text-xs hidden sm:table-cell">
									{new Date(tx.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<div class="p-6 text-center text-tg-hint text-sm">История операций пуста</div>
			{/if}
		</div>
	</section>
{/if}
