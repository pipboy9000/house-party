<script>
  import { station } from "./stores/station.js";
</script>

<style>
  .wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .list {
    width: 100%;
    max-width: 500px;
  }

  .item {
    margin-top: 6px;
    width: 100%;
    height: 70px;
    display: grid;
    grid-template: 70px / 70px auto 70px;
    background: white;
    color: #3e3e3e;
    font-family: "Paytone One";
    border-radius: 3px;
    overflow: hidden;
  }

  .item:nth-child(1) {
    margin-top: 0;
  }

  .middle {
    font-size: 14px;
    padding-top: 5px;
    padding-left: 10px;
  }

  .right {
    display: flex;
    color: #6d6d6d;
    align-items: center;
    justify-content: center;
    font-size: 38px;
    color: #6d6d6d;
    flex-direction: column;
    font-size: 50px;
    position: relative;
  }

  .likes {
    font-size: 14px;
    position: absolute;
    width: 20px;
    height: 20px;
    text-align: center;
    line-height: 20px;
    background: white;
    color: #70c4ff;
    border-radius: 50px;
    border: 2px solid white;
  }

  .arrows {
    position: absolute;
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 100%;
    height: 100%;
    fill: #cbcbcb;
  }

  .upArrow {
    padding: 10px;
    padding-bottom: 2px;
  }

  .downArrow {
    padding: 10px;
    padding-top: 2px;
  }
</style>

<div class="wrapper">
  <div class="list">
    {#each $station.playlist as item}
      <div class="item">
        <div
          class="thumbnail"
          style="background-image: url({item.thumbnail})" />
        <div class="middle">
          <div class="title">{item.title}</div>
          <div class="duration">{item.duration}</div>
        </div>
        <div class="right">
          <div class="arrows">
            <svg
              class="upArrow"
              viewBox="-303.065673828125 -455.04998779296875 286.13134765625
              167.04998779296875">
              <g transform="rotate(180 0 0)" fill="">
                <path
                  d="M41 288h238c21.4 0 32.1 25.9 17 41L177 448c-9.4 9.4-24.6
                  9.4-33.9 0L24 329c-15.1-15.1-4.4-41 17-41z" />
              </g>
            </svg>
            <svg
              class="downArrow"
              viewBox="16.934316635131836 288 286.13134765625 167.04998779296875">
              <g>
                <path
                  d="M41 288h238c21.4 0 32.1 25.9 17 41L177 448c-9.4 9.4-24.6
                  9.4-33.9 0L24 329c-15.1-15.1-4.4-41 17-41z" />
              </g>
            </svg>
            <!-- <i class="fas fa-sort-up" />
            <i class="fas fa-sort-down" /> -->
          </div>
          <div class="likes">+5</div>
        </div>
      </div>
    {/each}
  </div>
</div>
