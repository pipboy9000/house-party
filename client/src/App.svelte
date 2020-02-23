<script>
  import Router from "svelte-spa-router";
  import { routes } from "./routes.js";
</script>

<style>
  :global(body) {
    padding: 0;
    margin: 0;
  }
</style>

<Router />

<Router {routes} />
