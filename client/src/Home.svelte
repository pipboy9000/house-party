<script>
  import { fp } from "./stores/fingerprint.js";
  import { push } from "svelte-spa-router";
  import * as socket from "./socket.js";
  import { getRandomColor } from "./utils.js";
  import { onMount, onDestroy } from "svelte";

  let joinId;
  let colorChange;
  let bgColor = getRandomColor();
  let params;

  onMount(() => {
    colorChange = setInterval(() => {
      bgColor = getRandomColor();
    }, 1500);
  });

  onDestroy(() => {
    clearInterval(colorChange);
  });

  function newStation() {
    socket.newStation();
  }

  function joinStation() {
    push(`/${joinId.toUpperCase()}`);
  }

  function catchClick(e) {
    e.stopPropagation();
  }

  function catchEnter(e) {
    if (e.code === "Enter") joinStation();
  }
</script>

<style>
  main {
    text-align: center;
    margin: 0 auto;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    width: 100%;
  }

  .top {
    height: 50vh;
    min-height: 190px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .bottom {
    height: 50vh;
    min-height: 190px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .buttons {
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 80vw;
    width: 310px;
  }

  .btn {
    width: 100%;
    height: 50px;
    background: #ffffff05;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    color: #fff;
    font-size: 18px;
    font-family: "Dosis";
    font-family: "Catamaran";
    font-family: "Luckiest Guy";
    font-family: "Paytone One";
    text-align: left;
    padding: 5px;
    border: 4px solid white;
    border-radius: 120px;
    cursor: pointer;
  }

  .btn:hover {
    background: #ffffff30;
  }

  input {
    text-transform: uppercase;
    margin: 0;
    border-radius: 5px;
    border: 1px solid #e9e9e9;
    padding: 3px;
    text-align: center;
    color: var(--hp-gray);
    font-size: 20px;
    letter-spacing: 5px;
    width: calc(4ch + 60px);
  }

  input:focus {
    outline: none;
  }

  .logo {
    background-image: url(/images/logo.png);
    width: 280px;
    max-width: 65%;
    height: 100%;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: bottom center;
    margin-bottom: 20px;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
    color: white;
    width: 100%;
    height: 100%;
    font-weight: 100;
    position: fixed;
    font-family: "Dosis";
    font-family: "Catamaran";
    font-family: "Luckiest Guy";
    font-family: "Paytone One";
  }
</style>

<main style="background: {bgColor}">
  {#if !$fp}
    <div class="loading">Loading...</div>
  {/if}
  <div class="home" hidden={!$fp}>
    <div class="top">
      <div class="logo" />
    </div>
    <div class="bottom">
      <div class="buttons">
        <div class="btn" on:click={newStation}>
          <span>New Station</span>
        </div>
        <div class="btn" on:click={joinStation}>
          <span>Join Station</span>
          <input
            maxlength="4"
            bind:value={joinId}
            on:click={catchClick}
            on:keydown={catchEnter} />
        </div>
      </div>
    </div>
  </div>
</main>
