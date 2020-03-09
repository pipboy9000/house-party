<script>
  import { push } from "svelte-spa-router";

  let show = false;

  function showSettings() {
    show = true;
  }

  function hideSettings() {
    show = false;
  }
</script>

<style>
  .buttons {
    display: flex;
    flex-direction: column;
    position: fixed;
    right: 0;
    margin: 20px;
    cursor: pointer;
    z-index: 999;
  }

  i {
    font-size: 35px;
    color: white;
  }

  .settings-bg {
    position: absolute;
    width: 100%;
    height: 100%;
    background: #00000045;
  }
</style>

<div class="buttons">
  <i class="fas fa-sliders-h" on:click={showSettings} />
</div>

{#if show}
  <div class="settings-bg" on:click={hideSettings} />
{/if}
