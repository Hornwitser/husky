<script lang="ts">
  import { bookmarks, characters, syncBookmarks, syncCharacters } from "$lib/data";
  import { onMount } from "svelte";
  import Character from "../Character.svelte";

  const bookmarksWithStatus = $derived(
    $bookmarks.map((v) => ({
      character: v,
      status: $characters[v]?.status ?? "offline",
      gender: $characters[v]?.gender ?? "none"
    }))
  );

  const groupOnlineBookmarks = $derived(
    bookmarksWithStatus.filter((v) => v.status !== "offline")
  );

  const groupOfflineBookmarks = $derived(
    bookmarksWithStatus.filter((v) => v.status === "offline")
  );

  onMount(() => {
    syncBookmarks();
    syncCharacters();
  });
</script>

<style lang="scss">
  .character-list {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    flex: 0 1 content;
    gap: 12px;
  }

  h3 {
    margin-bottom: 4px;

    &:first-child {
      margin-top: 0px;
    }
  }
</style>

<h3>Online</h3>
<div id="online" class="character-list">
{#each groupOnlineBookmarks as bookmark}
  <Character {...bookmark}/>
{/each}
</div>
<h3>Offline</h3>
<div id="offline" class="character-list">
  {#each groupOfflineBookmarks as bookmark}
  <Character {...bookmark}/>
  {/each}
</div>
