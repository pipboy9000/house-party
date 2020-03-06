<script>
  import { createEventDispatcher } from "svelte";
  import { onMount, onDestroy } from "svelte";
  import { searchStr, searchRes } from "./stores/search.js";
  import { parseDuration } from "./utils.js";
  import { addVideo } from "./socket.js";

  const str = "";

  const dispatch = createEventDispatcher();

  let input;

  let throttle;

  function close() {
    dispatch("close");
  }

  function catchClick(e) {
    e.stopPropagation();
  }

  function catchEnter(e) {
    if (throttle) {
      clearTimeout(throttle);
    }
    if (e.code === "Enter") sendSearchReq();
  }

  function sendSearchReq() {
    gapi.client.youtube.search
      .list({
        part: "id",
        maxResults: 25,
        q: $searchStr
      })
      .then(res => {
        let ids = "";
        res.result.items.forEach(video => {
          ids += video.id.videoId + ",";
        });
        ids = ids.slice(0, -1);

        gapi.client.youtube.videos
          .list({
            maxResults: 25,
            part: "contentDetails,snippet",
            id: ids
          })
          .then(details => {
            //format duration
            details.result.items.forEach(item => {
              item.contentDetails.duration = parseDuration(
                item.contentDetails.duration
              );
            });
            searchRes.set(details.result.items);
          });
      });
  }

  function search() {
    if (throttle) {
      clearTimeout(throttle);
    }
    throttle = setTimeout(() => {
      sendSearchReq();
    }, 500);
  }

  function add(video) {
    let vidObj = {
      videoId: video.id,
      title: video.snippet.title,
      duration: video.contentDetails.duration,
      thumbnail: video.snippet.thumbnails.default.url
    };
    addVideo(vidObj);
  }

  onMount(() => {
    input.focus();
    input.select();
  });
</script>

<style>
  .bg {
    width: 100vw;
    height: 100vh;
    display: grid;
    grid-template-rows: 56px auto;
    position: absolute;
    background: #00000059;
    z-index: 9999;
  }

  .bar {
    width: 100%;
    height: 100%;
    background: #202020ff;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    grid-column: 1 / 3;
    grid-row: 1 / 2;
    border-bottom: 2px solid #18181882;
    box-shadow: 0px 0px 5px #000000bf;
  }

  .search {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    max-width: 300px;
  }

  input {
    background: #141414;
    border: 1px solid #0a0a0a;
    border-radius: 2px;
    padding: 3px;
    margin: 0;
    margin-left: 30px;
    color: #ffffffe8;
    font-family: "Paytone One";
    padding-left: 15px;
    font-size: 18px;
    padding-bottom: 6px;
  }

  input:focus {
    outline: none;
  }

  .items {
    width: 100%;
    max-width: 540px;
    padding: 10px;
    box-sizing: border-box;
    grid-column: 1 / 3;
    grid-row: 2 / 2;
    margin-left: auto;
    margin-right: auto;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .item:nth-child(1) {
    margin-top: 0;
  }

  .item {
    width: 100%;
    background: white;
    height: 76px;
    max-height: 76px;
    margin-top: 10px;
    border-radius: 14px 84px 84px 14px;
    overflow: hidden;
    display: grid;
    grid-template-columns: 100px auto 76px;
    /* font-family: "Oswald", sans-serif;
    font-family: "Noto Sans", sans-serif;
    font-family: "Poppins", sans-serif;
    font-family: "Varela Round", sans-serif; */
    font-family: "Titillium Web", sans-serif;
  }

  .item > .thumb {
    height: 100%;
    min-width: 100%;
    background-position: center;
    grid-column: 1 / 2;
  }

  .item > .middle {
    grid-template-rows: 65% auto;
    height: 100%;
    max-height: 100%;
    width: 100%;
    display: grid;
  }

  .item > .right {
    display: flex;
    align-items: center;
    justify-content: center;
    grid-column: 3 / 4;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }

  .right > i {
    width: 50px;
    height: 50px;
    background: #70c4ff;
    align-items: center;
    text-align: center;
    line-height: 50px;
    border-radius: 50px;
    color: white;
  }

  .title {
    font-family: "Paytone one";
    font-size: 16px;
    color: #4a4a4a;
    line-height: 19px;
    text-overflow: ellipsis;
    padding-left: 10px;
    padding-top: 8px;
    display: flex;
    align-items: center;
  }

  .title > span {
    -webkit-box-orient: vertical;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
  }

  .details {
    color: #878787;
    font-size: 14px;
    padding-left: 10px;
  }

  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  ::-webkit-scrollbar-button {
    width: 10px;
    height: 10px;
  }
  ::-webkit-scrollbar-thumb {
    background: #fff;
    border: 37px none #ffffff;
    border-radius: 50px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #ffffff;
  }
  ::-webkit-scrollbar-thumb:active {
    background: #000000;
  }
  ::-webkit-scrollbar-track {
    background: #ffffff3d;
    border: 0px none #ffffff;
    border-radius: 18px;
  }
  ::-webkit-scrollbar-track:hover {
    background: #666666;
  }
  ::-webkit-scrollbar-track:active {
    background: #333333;
  }
  ::-webkit-scrollbar-corner {
    background: transparent;
  }
</style>

<div class="bg" on:click={close}>
  <div class="bar">
    <div class="search">
      <input
        placeholder="Search"
        bind:this={input}
        bind:value={$searchStr}
        on:click={catchClick}
        on:keydown={catchEnter}
        on:input={search} />
    </div>
  </div>
  <div class="items">
    {#each $searchRes as item, i}
      <div class="item">
        <div
          class="thumb"
          alt={item.snippet.title}
          style="background-image: url({item.snippet.thumbnails.default.url})" />
        <div class="middle">
          <div class="title">
            <span>{item.snippet.title}</span>
          </div>
          <div class="details">{item.contentDetails.duration}</div>
        </div>
        <div class="right" on:click={add(item)}>
          <i class="fas fa-plus" />
        </div>
      </div>
    {/each}
  </div>
</div>
