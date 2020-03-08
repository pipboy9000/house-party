<script context="module">
  let YouTubeIframeAPIReady = false;
</script>

<script>
  let player;
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
          onStateChange: onPlayerStateChange
        }
      });
    }
    if (YouTubeIframeAPIReady) {
      createPlayer(); // if the YT Script is ready, we can create our player
    }
  });

  function onPlayerReady() {
    var iframe = player.getIframe();
    console.log(iframe);
    debugger;
    iframe.style.width = "100%";
    iframe.style.maxWidth = "640px";
    var w = window.getComputedStyle(iframe).width;
    w = parseInt(w);
    w = Math.max(w, 640);

    var h = (w * 0.5625).toString() + "px";
    iframe.style.height = h;
  }

  function isMyScriptLoaded(url = "") {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length; i--; ) {
      if (scripts[i].src == url) return true;
    }
    return false;
  }
  function onPlayerStateChange({ data }) {
    dispatch("StateChange", data);
  }
  export function playVideo() {
    player.playVideo();
  }
</script>

<style>

</style>

<div id={divId} />
