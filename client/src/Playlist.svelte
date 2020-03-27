<script>
  import { station } from "./stores/station.js";
  import { user } from "./stores/user.js";
  import { fp } from "./stores/fingerprint.js";
  import { like, dislike, clearLike, clearDislike } from "./socket.js";
  import { flip } from "svelte/animate";
  import { fade } from "svelte/transition";

  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  function play(video) {
    dispatch("play", video);
  }

  function likedByMe(video) {
    return video.likes.hasOwnProperty($fp);
  }
  function dislikedByMe(video) {
    return video.dislikes.hasOwnProperty($fp);
  }

  function getLikes(video) {
    return Object.keys(video.likes).length - Object.keys(video.dislikes).length;
  }

  function upArrow(video) {
    if (likedByMe(video)) {
      clearLike(video.uid);
    } else {
      like(video.uid);
    }
  }

  function downArrow(video) {
    if (dislikedByMe(video)) {
      clearDislike(video.uid);
    } else {
      dislike(video.uid);
    }
  }
</script>

<style>
  .wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px;
    box-sizing: border-box;
    margin-top: 10px;
    padding-bottom: 120px;
  }

  .list {
    width: 100%;
    max-width: 580px;
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
    box-shadow: 0px 2px 5px #00000038;
    position: relative;
  }

  .item:nth-child(1) {
    margin-top: 0;
  }

  .middle {
    font-size: 15px;
    display: grid;
    grid-template-rows: 1fr 26px;
  }

  .title {
    margin-top: 6px;
    margin-left: 10px;
    display: flex;
    align-items: center;
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

  .green {
    fill: #5dff43;
  }

  .red {
    fill: #ff3838;
  }

  .duration {
    display: inline-block;
    margin-left: 14px;
    font-size: 14px;
    line-height: 26px;
    color: gray;
    font-family: "Dosis";
    font-family: "Luckiest Guy";
    font-family: "Paytone One";
    font-family: "Catamaran";
    font-family: "Baloo 2", cursive;
  }
  .error {
    margin-left: 5px;
    border-radius: 10px;
    font-size: 15px;
    float: right;
    color: #ff4b4b;
    /* font-family: "Dosis";
    font-family: "Luckiest Guy";
    font-family: "Paytone One"; */
    font-family: "Catamaran";
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

    font-family: "Dosis";
    font-family: "Luckiest Guy";
    font-family: "Paytone One";
    font-family: "Baloo 2", cursive;
    font-family: "Catamaran";
  }

  .nowPlaying {
    background: #2190ff;
    color: white;
  }
</style>

<div class="wrapper">
  {#if $station && $station.playlist}
    <div class="list">
      {#each $station.playlist as item (item.uid)}
        <div
          animate:flip
          transition:fade
          class="item"
          class:nowPlaying={$station.nowPlaying && $station.nowPlaying.uid == item.uid}>
          {#if $user.isAdmin}
            <div
              style="width:100%; height:100%; position:absolute; cursor: pointer"
              on:click={play(item)} />
          {/if}
          <div
            class="thumbnail"
            style="background-image: url({item.thumbnail})" />
          <div class="middle">
            <div class="title">{item.title}</div>
            <div>
              <div
                class="duration"
                class:nowPlaying={$station.nowPlaying && $station.nowPlaying.uid == item.uid}>
                {item.duration}
              </div>
              {#if item.error}
                <div
                  class="error"
                  class:nowPlaying={$station.nowPlaying && $station.nowPlaying.uid == item.uid}>
                  <i class="fas fa-exclamation-circle" />
                </div>
              {/if}
            </div>
          </div>
          <div class="right">
            <div class="arrows">
              <svg
                on:click={upArrow(item)}
                class="upArrow"
                class:green={likedByMe(item)}
                viewBox="-303.065673828125 -455.04998779296875 286.13134765625
                167.04998779296875">
                <g transform="rotate(180 0 0)">
                  <path
                    d="M41 288h238c21.4 0 32.1 25.9 17 41L177 448c-9.4 9.4-24.6
                    9.4-33.9 0L24 329c-15.1-15.1-4.4-41 17-41z" />
                </g>
              </svg>
              <svg
                on:click={downArrow(item)}
                class="downArrow"
                class:red={dislikedByMe(item)}
                viewBox="16.934316635131836 288 286.13134765625
                167.04998779296875">
                <g>
                  <path
                    d="M41 288h238c21.4 0 32.1 25.9 17 41L177 448c-9.4 9.4-24.6
                    9.4-33.9 0L24 329c-15.1-15.1-4.4-41 17-41z" />
                </g>
              </svg>
            </div>
            <div
              class="likes"
              class:nowPlaying={$station.nowPlaying && $station.nowPlaying.uid == item.uid}>
              {getLikes(item)}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
