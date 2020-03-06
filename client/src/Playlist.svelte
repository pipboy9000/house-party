<script>
  import { station } from "./stores/station.js";
</script>

<style>

</style>

<div class="list">
  {#each $station.playlist as item}
    <div class="title">{item.title}</div>
  {/each}
</div>
