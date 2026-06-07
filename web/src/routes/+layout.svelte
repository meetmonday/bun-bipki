<script lang="ts">
import "../app.css";
// biome-ignore lint/correctness/noUnusedVariables: used via {@render children()}
let { children } = $props();
</script>

{@render children()}
