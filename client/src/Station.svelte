<script>
  import { station } from "./stores/station.js";
  import { onMount, onDestroy } from "svelte";
  import { location } from "svelte-spa-router";
  import { fp } from "./stores/fingerprint.js";
  import * as socket from "./socket.js";

  export let params = {}; //URL params

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
  });
</script>

{#if !$station}
  <h1>Loading</h1>
{:else if $station.error}
  <h1>Error: {$station.error}</h1>
{:else}
  <h1>Listening to: {$station.id}</h1>
  <h1>{status.msg}</h1>
{/if}
