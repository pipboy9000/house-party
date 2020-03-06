<script>

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
    stroke-width: 15;
    stroke-linecap: round;
    stroke: red;
    stroke-dasharray: 100 100;
  }
</style>

<svg class="timer" width="100" height="100">
  <circle class="circle" cx="50" cy="50" r="40" pathlength="100" />
</svg>
