<script lang="ts">
let { size = 16, strokeWidth = 2.5 }: { size?: number; strokeWidth?: number } =
	$props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
>
	<path d="M20 6 9 17l-5-5" />
</svg>
