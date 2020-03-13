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
  import NowPlaying from "./NowPlaying.svelte";
  import CooldownTimer from "./CooldownTimer.svelte";
  import Playlist from "./Playlist.svelte";
  import qs from "qs";
  import { user } from "./stores/user.js";
  import QRCode from "./QRCode.svelte";

  export let params = {}; //URL params

  let showSearch = false;

  $: showSearch = qs.parse($querystring).search;

  let player;

  let bgColor = getRandomColor();

  let colorChange;

  let qrCanvas;

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
    colorChange = setInterval(() => {
      bgColor = getRandomColor();
    }, 1500);
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

  function play(e) {
    player.playVideo(e.detail);
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
    position: fixed;
    width: 100vw;
    height: 100vh;
  }

  .container {
    color: white;
    width: 100%;
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
    padding-top: 50px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .buttons {
    z-index: 100;
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
    width: 80px;
    height: 80px;
    max-width: 100px;
    max-height: 100px;
    background: white;
    border-radius: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #606060;
    box-shadow: 0px 5px 12px #00000059;
  }

  .addBtnIcons {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
  }

  .addBtnIcons i {
    position: absolute;
  }

  .addBtnIcons i:nth-child(2) {
    font-size: 16px;
    margin-left: 30px;
  }

  .player {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-top: 30px;
  }

  .qrcode {
    margin-top: 20px;
    display: flex;
    justify-content: center;
    width: 100%;
  }
</style>

<div class="bg" style="background: {bgColor}" />
<div class="container">
  {#if !$station}
    <h1>Loading</h1>
  {:else if $station.error}
    <h1>Error: {$station.error}</h1>
  {:else}
    <div class="top">
      <h1>Listening to: {$station.id}</h1>
      <h1>{status.msg}</h1>
    </div>
    {#if $user.isAdmin}
      <div class="qrcode">
        <QRCode
          codeValue={'https://house-party.netlify.com/#' + $location}
          squareSize="200" />
      </div>
      <div class="player">
        <Player bind:this={player} />
      </div>
    {/if}

    <NowPlaying />
    <Playlist on:play={play} />

    <div class="buttons">
      <div class="addBtn" on:click={openSearch}>
        <CooldownTimer />
        <div class="addBtnIcons">
          <i class="fas fa-music" />
          <!-- <i class="fas fa-plus" /> -->
        </div>

      </div>
    </div>
  {/if}
</div>
{#if showSearch}
  <Search on:close={pop} />
{/if}
