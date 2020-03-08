<script>
  import { user } from "./stores/user.js";
  import { onMount } from "svelte";

  export function setCooldown(duration) {}

  onMount(() => {});
</script>

<style>
  .timer {
    width: 100%;
    height: 100%;
    position: absolute;
    z-index: 9999;
  }

  .circle {
    fill: none;
    stroke-width: 5;
    stroke-linecap: round;
    stroke: red;
    stroke-dasharray: 100 100;
    stroke-dashoffset: 100;
  }
</style>

<svg class="timer" width="100" height="100">
  <circle class="circle" cx="50" cy="50" r="40" pathlength="100" />
</svg>
