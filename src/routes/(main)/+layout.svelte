<script lang="ts">
  import type { LayoutData } from "./$types";
  import Sidebar from "./Sidebar.svelte";

  const props = $props<{ data: LayoutData, children: () => any }>();
</script>

<div id="container">
  <Sidebar people={props.data.people} character={props.data.character} channel={props.data.channel} />
  <div id="main">
    {@render props.children()}
  </div>
</div>

<style lang="scss">
  #container {
    display: grid;
    grid-template-columns: 240px 1fr;
    grid-template-areas: "sidebar main";
    height: 100vh;
    overflow: hidden;
  }

  #main {
    grid-area: main;
    overflow: hidden;
  }
</style>
