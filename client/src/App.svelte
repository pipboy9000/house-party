<script>
  import Router from "svelte-spa-router";
  import Settings from "./settings.svelte";
  import { routes } from "./routes.js";
  import { onMount, onDestroy } from "svelte";
  import { push, pop, replace } from "svelte-spa-router";
  import { location } from "svelte-spa-router";
  import NavBar from "./NavBar.svelte";

  onMount(() => {
    //in case app was open through a messy url, this code clears it up and also makes back button go back to home
    let stationId = $location.split("/")[1];
    if (stationId) {
      replace("/");
      push("/" + stationId);
    }
  });
</script>

<style>
  :global(html, body, h1) {
    padding: 0;
    margin: 0;
    max-height: 100vh;
    overflow: hidden;
  }

  :global(:root) {
    --hp-grey: #363636;
    --nav-bar-height: 70px;
  }
</style>

<NavBar />
<Router {routes} />
