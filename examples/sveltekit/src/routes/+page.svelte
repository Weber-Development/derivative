<script lang="ts">
  import { onMount } from "svelte";

  // Import on the client only, so the widget stays out of server rendering.
  onMount(() => import("@sweberdev/derivative/widget"));
</script>

<header style="display: flex; justify-content: space-between; padding: 1rem">
  <strong>Acme</strong>
  <derivative-widget src="/changelog.json" announce search></derivative-widget>
</header>
<main style="padding: 1rem"><h1>Dashboard</h1></main>
