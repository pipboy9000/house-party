<script>
  import { fp } from "./stores/fingerprint.js";
  import { push } from "svelte-spa-router";
  import * as socket from "./socket.js";
  import { getRandomColor } from "./utils.js";
  import { onMount, onDestroy } from "svelte";

  let joinId;
  let colorChange;
  let bgColor = getRandomColor();

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

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
    font-family: "Rubik", sans-serif;
    font-family: "Modak", cursive;
    font-family: "Abril Fatface", cursive;
  }

  .buttons {
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
    color: #585858;
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
    max-width: 60%;
    height: 100%;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: bottom center;
    margin-bottom: 20px;
  }
</style>

<main style="background: {bgColor}">
  {#if !$fp}
    <div class="loading">
      <h1>Loading</h1>
    </div>
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
