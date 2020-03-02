<script>
  import { createEventDispatcher } from "svelte";
  import { onMount, onDestroy } from "svelte";
  import { searchStr } from "./stores/search.js";

  const str = "";

  const dispatch = createEventDispatcher();

  let input;

  let throttle;

  function close() {
    dispatch("close");
  }

  function catchClick(e) {
    e.stopPropagation();
  }

  function catchEnter(e) {
    if (e.code === "Enter") joinStation();
  }

  function search() {
    if (throttle) {
      clearTimeout(throttle);
    }
    throttle = setTimeout(() => {
      console.log($searchStr);
    }, 500);
  }

  onMount(() => {
    input.focus();
    input.select();
  });
</script>

<style>
  .bg {
    width: 100%;
    height: 100%;
    display: flex;
    position: absolute;
    background: #00000059;
    flex-direction: column;
  }

  .bar {
    width: 100%;
    height: 56px;
    background: #202020ff;
    display: flex;
    align-items: center;
  }

  .search {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    max-width: 300px;
  }

  input {
    background: #141414;
    border: 1px solid #0a0a0a;
    border-radius: 2px;
    padding: 3px;
    margin: 0;
    margin-left: 30px;
    color: #ffffffe8;
    font-family: "Paytone One";
    padding-left: 15px;
    font-size: 18px;
    padding-bottom: 6px;
  }

  input:focus {
    outline: none;
  }
</style>

<div class="bg" on:click={close}>
  <div class="bar">
    <div class="search">
      <input
        placeholder="Search"
        bind:this={input}
        bind:value={$searchStr}
        on:click={catchClick}
        on:keydown={catchEnter}
        on:input={search} />
    </div>
  </div>
</div>
