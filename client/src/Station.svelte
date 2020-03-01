<script>
  import { station } from "./stores/station.js";
  import { onMount, onDestroy } from "svelte";
  import { location } from "svelte-spa-router";
  import { fp } from "./stores/fingerprint.js";
  import { getRandomColor } from "./utils.js";
  import * as socket from "./socket.js";
  import Player from "./Player.svelte";

  export let params = {}; //URL params

  let player;

  let bgColor = getRandomColor();

  let colorChange;

  const STATUS = {
    SEARCHING: {
      msg: "Finding Station..."
    },
    CREATING_NEW: {
      msg: "Starting a new station..."
    },
    NOT_FOUND: {
      msg: "Station not found :("
    },
    OK: {
      msg: "Tuned in"
    }
  };

  let status = STATUS.SEARCHING;

  function connect() {
    if (!$fp) return;
    let targetId = $location.replace("/", "");
    if (targetId) {
      if (!$station || $station.error || $station.id != targetId) {
        status = STATUS.SEARCHING;
        socket.joinStation(targetId);
      }
    }
  }

  onMount(() => {
    connect();
    // colorChange = setInterval(() => {
    //   bgColor = getRandomColor();
    // }, 1500);
  });

  //if url changed
  const us_location = location.subscribe(loc => {
    connect();
  });

  //app was opened with station id url, we wait for fingerprint to load and then we join the station
  const us_fp = fp.subscribe(_fp => {
    connect();
  });

  const us_station = station.subscribe(_station => {
    if (!_station) return;
    let targetId = params.stationId;
    if (_station.error) {
      status = STATUS.NOT_FOUND;
    } else if (_station && _station.id == targetId) {
      status = STATUS.OK;
    }
  });

  onDestroy(() => {
    us_location();
    us_fp();
    us_station();
    clearInterval(colorChange);
  });
</script>

<style>
  .bg {
    color: white;
    width: 100%;
    height: 100%;
  }

  h1 {
    padding: 0;
    margin: 0;
    font-family: "Paytone One";
  }

  .top {
    padding-top: 80px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .player {
    display: flex;
    justify-content: center;
  }

  .buttons {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .addBtn {
    width: 20vw;
    height: 20vw;
    max-width: 100px;
    max-height: 100px;
  }
</style>

<div class="bg" style="background: {bgColor}">
  {#if !$station}
    <h1>Loading</h1>
  {:else if $station.error}
    <h1>Error: {$station.error}</h1>
  {:else}
    <div class="top">
      <h1>Listening to: {$station.id}</h1>
      <h1>{status.msg}</h1>
      <!-- <div class="playBtn" on:click={player.playVideo}>></div> -->
    </div>
    <div class="player">
      <Player bind:this={player} />
    </div>
    <div class="buttons">
      <div class="addBtn">
        <svg viewBox="0 0 100 100">
          <g fill="transparent" stroke="white" stroke-width="4">
            <circle cx="50" cy="50" r="45" />
          </g>
          <g transform="scale(0.6)" transform-origin="center center">
            <path
              fill="white"
              d="m 10 10 h 80 v 10 h -80 z m 0 20 h 80 v 10 h -80 z m 0 20 h50 v
              10 h -50 z m 70 0 h 10 v 10 h 10 v 10 h -10 v 10 h -10 v -10 h -10
              v -10 h 10 z M 10 70 h 50 v 10 h-50 z" />
          </g>
        </svg>
      </div>
    </div>
  {/if}
</div>
