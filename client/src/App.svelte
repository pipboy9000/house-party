<script>
  import Router from "svelte-spa-router";
  import Settings from "./settings.svelte";
  import { routes } from "./routes.js";
</script>

<style>
  :global(body, h1) {
    padding: 0;
    margin: 0;
  }
</style>

<Settings />
<Router {routes} />
