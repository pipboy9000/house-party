<script>
  import { station } from "./stores/station.js";
  import { onMount, onDestroy } from "svelte";
  import { fp } from "./stores/fingerprint.js";
  import { getRandomColor } from "./utils.js";
  import * as socket from "./socket.js";
  import { push, pop, replace } from "svelte-spa-router";
  import { location, querystring } from "svelte-spa-router";
  import Player from "./Player.svelte";
  import Search from "./Search.svelte";
  import CooldownTimer from "./CooldownTimer.svelte";
  import Playlist from "./Playlist.svelte";
  import qs from "qs";
  import { user } from "./stores/user.js";

  export let params = {}; //URL params

  let showSearch = false;

  $: showSearch = qs.parse($querystring).search;

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

  function openSearch() {
    let urlParams = qs.parse($querystring);
    if (urlParams.hasOwnProperty("search")) {
      urlParams.search = true;
      replace($location + "?" + qs.stringify(urlParams));
    } else {
      urlParams.search = true;
      push($location + "?" + qs.stringify(urlParams));
    }
  }

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
    position: absolute;
    padding-bottom: 120px;
    display: flex;
    flex-direction: column;
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
    margin-top: 30px;
  }

  .buttons {
    position: fixed;
    width: 100%;
    margin-bottom: 20px;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .addBtn {
    position: relative;
    width: 20vw;
    height: 20vw;
    max-width: 100px;
    max-height: 100px;
  }

  .coolDown {
    width: 100%;
    height: 100%;
    position: absolute;
    background: red;

    border-radius: 70px;
    background: conic-gradient(10% red, yellow, lime, aqua, blue);
  }

  svg {
    position: absolute;
    width: 100%;
    height: 100%;
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
    {#if $user.isAdmin}
      <div class="player">
        <Player bind:this={player} />
      </div>
    {/if}

    <Playlist />

    <div class="buttons">
      <div class="addBtn" on:click={openSearch}>
        <CooldownTimer />
        <svg viewBox="0 0 100 100">
          <mask id="mask">
            <rect x="0" y="0" width="100" height="100" fill="white" />
            <g transform="scale(0.6)" transform-origin="center center">
              <path
                fill="black"
                d="m 10 10 h 80 v 10 h -80 z m 0 20 h 80 v 10 h -80 z m 0 20 h50
                v 10 h -50 z m 70 0 h 10 v 10 h 10 v 10 h -10 v 10 h -10 v -10 h
                -10 v -10 h 10 z M 10 70 h 50 v 10 h-50 z" />
            </g>
          </mask>
          <circle cx="50" cy="50" r="45" mask="url(#mask)" fill="white" />
        </svg>
      </div>
    </div>
  {/if}
</div>
{#if showSearch}
  <Search on:close={pop} />
{/if}
