<!-- This is the default page, *and* it's the People screen -->
<script lang="ts">
  import type { LayoutData } from "./$types";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";

  const props = $props<{ data: LayoutData, children: () => any }>();
  const currentPath = $derived($page.url.pathname);

  const gotoEveryone = () => goto("/people/everyone");
  const gotoFriends = () => goto("/people/friends");
  const gotoBookmarks = () => goto("/people/bookmarks");
  const gotoSearch = () => goto("/people/search");
</script>

<div id="root">
  <div id="header">
    <h2>People</h2>
    <nav id="button-row">
      <button
        type="button"
        class="nav-button"
        class:selected={currentPath === "/people/everyone"}
        onclick={gotoEveryone}
      >
        Everyone
      </button>
      <button
        type="button"
        class="nav-button"
        class:selected={currentPath === "/people/friends"}
        onclick={gotoFriends}
      >
        Friends
      </button>
      <button
        type="button"
        class="nav-button"
        class:selected={currentPath === "/people/bookmarks"}
        onclick={gotoBookmarks}
      >
        Bookmarks
      </button>
      <div class="spreader"></div>
      <button
        type="button"
        class="nav-button"
        class:selected={currentPath === "/people/search"}
        onclick={gotoSearch}
      >
        <img src="/fa/magnifying-glass.svg" alt="Search">
        Character Search
      </button>
    </nav>
  </div>
  <div id="content"> 
    {@render props.children()}
  </div>
</div>

<style lang="scss">
  #root {
    display: grid;
    grid-template-rows: min-content 1fr;
    grid-template-areas: 
      "header" 
      "content";

    height: 100%;
  }

  #content {
    grid-area: "content";
    display: flex;
    flex-direction: column; 
    overflow: scroll;
    overflow-x: clip;
    padding: 12px;
    flex-grow: none;
    flex-basis: content;
    bottom: 0px;

    &::-webkit-scrollbar {
      position: absolute;
      width: 8px;

      &-track {
        background: #ffffff00;
        &:hover {
          background: var(--color-gray-11);
        }
      }

      &-thumb {
        background: var(--color-gray-11);
        border-radius: 8px;

        &:hover {
          background: var(--color-gray-12);
        }
      }
    }
  }

  #header {
    grid-area: "header";
    display: flex;
    flex-direction: column;

    padding: 8px 12px;
    gap: 12px;

    background: var(--color-gray-11);

    h2 {
      font-size: 24px;
      font-weight: 400;
      margin: 0px;
      margin-top: 2px;
    }
  }

  #button-row {
    display: flex;
    flex-direction: row;
    padding: 0px;
    gap: 8px;
    align-self: stretch;
  }

  .nav-button {
    box-sizing: border-box;
    display: flex;
    flex-direction: row;
    align-items: center;
    
    font-size: 14px;
    line-height: normal;
    padding: 4px 8px;
    gap: 8px;

    background: var(--color-gray-10);
    border: 1px solid var(--color-gray-9);
    border-radius: 2px;
    color: inherit;
    font: inherit;
    cursor: pointer;

    &.selected {
      background: var(--color-gray-9);
    }

    img {
      width: 14px;
      height: 14px;
    }

    &:hover:not(.selected) {
      background: var(--color-gray-9);
    }
  }

  .spreader {
    flex: 1;
  }
</style>
