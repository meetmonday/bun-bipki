<script lang="ts">
import { onMount } from "svelte";
import "../app.css";

let { children } = $props();

onMount(() => {
	window.Telegram?.WebApp.ready();
	document.documentElement.style.setProperty(
		"--tg-bottom-offset",
		`${window.Telegram?.WebApp?.bottomBarHeight ?? 0}px`,
	);
});
</script>

{@render children()}
