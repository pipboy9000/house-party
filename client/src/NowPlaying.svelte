<script>
  import { station } from "./stores/station.js";
</script>

<style>

</style>

<div class="nowPlaying">Now Playing:</div>
<div class="title">{$station.nowPlaying.title}</div>

{#if $station.state != 'playing'}
  <div class="state">{$station.state}</div>
{/if}
