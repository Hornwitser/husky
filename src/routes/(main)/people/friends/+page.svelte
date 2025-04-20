<script lang="ts">
  import { friends, characters, syncFriends, syncCharacters } from "$lib/data";
  import { onMount } from "svelte";
  import Character from "../Character.svelte";

  const friendsWithStatus = $derived(
    $friends.map((v) => ({
      character: v,
      status: $characters[v]?.status ?? "offline",
      gender: $characters[v]?.gender ?? "none"
    }))
  );

  const groupOnlineFriends = $derived(
    friendsWithStatus.filter((v) => v.status !== "offline")
  );

  const groupOfflineFriends = $derived(
    friendsWithStatus.filter((v) => v.status === "offline")
  );

  onMount(() => {
    syncFriends();
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
{#each groupOnlineFriends as friend}
  <Character {...friend}/>
{/each}
</div>
<h3>Offline</h3>
<div id="offline" class="character-list">
  {#each groupOfflineFriends as friend}
  <Character {...friend}/>
  {/each}
</div>
