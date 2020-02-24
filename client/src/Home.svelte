<script>
  import { fp } from "./stores/fingerprint.js";
  import { push } from "svelte-spa-router";
  import * as socket from "./socket.js";

  let joinId;

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
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
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
  }

  .btn {
    width: 360px;
    height: 80px;
    align-items: center;
    justify-content: space-around;
    background: gray;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: space-evenly;
  }

  input {
    text-transform: uppercase;
  }
</style>

<main>
  {#if !$fp}
    <h1>Loading</h1>
  {:else}
    <h1>House Party</h1>
    <div class="buttons">
      <div class="btn" on:click={newStation}>New Station</div>
      <div class="btn" on:click={joinStation}>
        Join Station
        <input
          bind:value={joinId}
          on:click={catchClick}
          on:keydown={catchEnter} />
      </div>
    </div>
  {/if}
</main>
