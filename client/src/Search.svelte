<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  function close() {
    dispatch("close");
  }
</script>

<style>
  .bg {
    width: 100%;
    height: 100%;
    display: flex;
    position: absolute;
    background: #00000020;
    flex-direction: column;
  }
</style>

<div class="bg" on:click={close}>
  <h1>Search</h1>
  <input />
</div>
