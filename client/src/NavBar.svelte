<script>
  import Search from "./search.svelte";
  import User from "./User.svelte";
</script>

<style>
  .bg {
    width: 100%;
    height: var(--nav-bar-height);
    background: var(--hp-grey);
    position: relative;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 5px solid #00000026;
    background: linear-gradient(0, #404040, #414141);
    box-sizing: border-box;
  }
</style>

<div class="bg">
  <Search />
  <User />
</div>
