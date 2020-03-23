<script>
  import Search from "./search.svelte";
</script>

<style>
  .bg {
    width: 100%;
    height: var(--nav-bar-height);
    background: var(--hp-grey);
    position: fixed;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>

<div class="bg">
  <Search />
</div>
