<script>
  import { station } from "./stores/station.js";
</script>

<style>
  .bg {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin-top: 30px;
  }

  .container {
    max-width: 580px;
  }

  .title {
    font-family: "Paytone One";
    font-size: 24px;
  }
</style>

{#if $station.nowPlaying}
  <div class="bg">
    <div class="container">
      <div class="nowPlaying">Now Playing:</div>
      <div class="title">{$station.nowPlaying.title}</div>

      {#if $station.state != 'playing'}
        <div class="state">{$station.state}</div>
      {/if}
    </div>
  </div>
{/if}
