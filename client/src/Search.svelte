<script>
  import { createEventDispatcher } from "svelte";
  import { onMount, onDestroy } from "svelte";
  import { searchStr, searchRes } from "./stores/search.js";

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
    if (throttle) {
      clearTimeout(throttle);
    }
    if (e.code === "Enter") sendSearchReq();
  }

  function sendSearchReq() {
    gapi.client.youtube.search
      .list({
        part: "snippet",
        maxResults: 25,
        q: $searchStr
      })
      .then(res => {
        console.log(res.result.items);
        searchRes.set(res.result.items);
      });
  }

  function search() {
    if (throttle) {
      clearTimeout(throttle);
    }
    throttle = setTimeout(() => {
      sendSearchReq();
    }, 500);
  }

  onMount(() => {
    input.focus();
    input.select();
  });
</script>

<style>
  .bg {
    width: 100vw;
    height: 100vh;
    display: grid;
    grid-template-rows: 56px auto;
    position: absolute;
    background: #00000059;
  }

  .bar {
    width: 100%;
    height: 100%;
    background: #202020ff;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    grid-column: 1 / 3;
    grid-row: 1 / 2;
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

  .items {
    width: 100%;
    max-width: 480px;
    padding: 10px;
    box-sizing: border-box;
    grid-column: 1 / 3;
    grid-row: 2 / 2;
    margin-left: auto;
    margin-right: auto;
    overflow-x: hidden;
    overflow-y: scroll;
  }

  .item:nth-child(1) {
    margin-top: 0;
  }

  .item {
    display: flex;
    align-items: end;
    width: 100%;
    background: white;
    height: 60px;
    margin-top: 10px;
    border-radius: 2px;
    overflow: hidden;
  }

  .item > img {
    height: 100%;
    min-width: 82px;
  }

  .item > .title {
    font-size: 12px;
  }

  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  ::-webkit-scrollbar-button {
    width: 10px;
    height: 10px;
  }
  ::-webkit-scrollbar-thumb {
    background: #fff;
    border: 37px none #ffffff;
    border-radius: 50px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #ffffff;
  }
  ::-webkit-scrollbar-thumb:active {
    background: #000000;
  }
  ::-webkit-scrollbar-track {
    background: #ffffff3d;
    border: 0px none #ffffff;
    border-radius: 18px;
  }
  ::-webkit-scrollbar-track:hover {
    background: #666666;
  }
  ::-webkit-scrollbar-track:active {
    background: #333333;
  }
  ::-webkit-scrollbar-corner {
    background: transparent;
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
  <div class="items">
    {#each $searchRes as item, i}
      <div class="item">
        <img
          alt={item.snippet.title}
          src={item.snippet.thumbnails.default.url} />
        <div class="title">{item.snippet.title}</div>
      </div>
    {/each}
  </div>
</div>
