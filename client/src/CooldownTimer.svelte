<script>
  import { user } from "./stores/user.js";
  import { onMount, onDestroy } from "svelte";
  import { cooldown } from "./stores/cooldownTimer.js";
  import { tick } from "svelte";

  let circle;

  let usCooldown;

  onMount(() => {
    usCooldown = cooldown.subscribe(cd => {
      if (cd.show) {
        let duration = cd.duration;
        circle.style.transition =
          "stroke-dashoffset " +
          duration +
          "ms linear, stroke " +
          duration +
          "ms linear";
        circle.style.strokeDashoffset = "-99";
        circle.style.stroke = "#5dff43d5";
        return cd;
      } else {
        circle.style.transition = "";
        circle.style.strokeDashoffset = 0;
        circle.stroke = "#ff9438d5";
      }
    });
  });

  onDestroy(() => {
    usCooldown();
    cooldown.set({ show: false, duration: -1 });
  });
</script>

<style>
  .timer {
    width: 100%;
    height: 100%;
    display: contents;
    visibility: hidden;
  }
  .red {
    width: 100%;
    height: 100%;
    position: absolute;
    z-index: 9999;
    overflow: visible;
  }

  .circle {
    fill: none;
    stroke-width: 7;
    stroke-linecap: round;
    stroke: #ff9538d5;
    stroke-dasharray: 100 100;
    stroke-dashoffset: 0;
  }
</style>

<div class="timer" style="visibility: {$cooldown.show ? 'visible' : 'hidden'}">
  <svg class="red" width="100" height="100">
    <circle
      bind:this={circle}
      class="circle"
      cx="40"
      cy="40"
      r="33"
      pathlength="100" />
  </svg>
</div>
