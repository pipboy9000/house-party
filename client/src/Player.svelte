<script context="module">
  import { station } from "./stores/station.js";
  import { setPlayerState, videoError } from "./socket.js";
  import qs from "qs";
  let YouTubeIframeAPIReady = false;
</script>

<script>
  export let player;
  import { createEventDispatcher, onMount } from "svelte";
  const dispatch = createEventDispatcher();
  let divId = "player_" + parseInt(Math.random() * 100000).toString();
  export let videoId = "9xD-KJSjIxw";
  export let height = "390";
  export let width = "640";
  onMount(() => {
    let ytTagUrl = "https://www.youtube.com/iframe_api";
    if (!isMyScriptLoaded(ytTagUrl)) {
      // 2. This code loads the IFrame Player API code asynchronously.
      var tag = document.createElement("script");
      tag.src = ytTagUrl;
      var firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
    window.onYouTubeIframeAPIReady = function() {
      //console.log('hello')
      window.dispatchEvent(new Event("YouTubeIframeAPIReady"));
    };
    window.addEventListener("YouTubeIframeAPIReady", function() {
      if (YouTubeIframeAPIReady == false) {
        // first load of an YT Video on this project
        YouTubeIframeAPIReady = true; // now the Player can be created
        createPlayer();
      }
    });
    function createPlayer() {
      player = new YT.Player(divId, {
        height,
        width,
        videoId: videoId,
        enablejsapi: true,
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
          onError: onPlayerError
        }
      });
    }
    if (YouTubeIframeAPIReady) {
      createPlayer(); // if the YT Script is ready, we can create our player
    }
  });

  function onPlayerError(e) {
    let videoId = getVideoId();
    videoError(videoId);
  }

  function onPlayerReady() {
    //resize youtube player to fit window
    var iframe = player.getIframe();
    iframe.style.width = "100%";
    iframe.style.maxWidth = "640px";
    var w = window.getComputedStyle(iframe).width;
    w = parseInt(w);
    w = Math.max(w, 640);
    var h = (w * 0.5625).toString() + "px"; //0.5625 = 9 / 16
    iframe.style.height = h;
  }

  function isMyScriptLoaded(url = "") {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length; i--; ) {
      if (scripts[i].src == url) return true;
    }
    return false;
  }

  function getVideoId() {
    let qstr = player.getVideoUrl().split("/watch?")[1];
    let videoId = qs.parse(qstr).v;
    return videoId;
  }

  function onPlayerStateChange({ data }) {
    let videoId = getVideoId();
    setPlayerState(data, videoId);

    if (data == 0) {
      //video ended
      playNext();
    }
  }

  function playNext() {
    let currentVideoId = getVideoId();

    let idx = $station.playlist.findIndex(video => {
      return video.videoId == currentVideoId;
    });

    if (idx != -1 && idx < $station.playlist.length) {
      playVideo($station.playlist[idx + 1]);
    }
  }

  export function playVideo(video) {
    player.loadVideoById(video.videoId);
  }
</script>

<style>

</style>

<div id={divId} />
