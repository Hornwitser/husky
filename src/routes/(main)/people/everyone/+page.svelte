<script lang="ts">
  import { getRecents } from "$lib/rust";
  import { currentSession } from "$lib/session";
  import {
    friends,
    bookmarks,
    characters,
    syncBookmarks,
    syncCharacters,
    syncFriends,
  } from "$lib/data";
  import { onMount } from "svelte";
  import Character from "../Character.svelte";
  import type { Character as TCharacter } from "$lib/types";
  import uniqWith from "lodash.uniqwith";

  type CharacterData = {
    character: TCharacter;
    status: string;
    gender: string;
  };

  let recents = $state<TCharacter[]>([]);

  $effect(() => {
    if ($currentSession) {
      getRecents($currentSession).then((v) => (recents = v));
    }
  });

  const populatedRecents = $derived(recents.map((v) => {
    let char = $characters[v] ?? {};
    return {
      character: v,
      status: char.status ?? "offline",
      gender: char.gender ?? "none",
    };
  }));

  const bookmarksWithStatus = $derived($bookmarks.map((v) => ({
    character: v,
    status: $characters[v]?.status ?? "offline",
    gender: $characters[v]?.gender ?? "none",
  })));

  const friendsWithStatus = $derived($friends.map((v) => ({
    character: v,
    status: $characters[v]?.status ?? "offline",
    gender: $characters[v]?.gender ?? "none",
  })));

  // Now merge and sort all of the arrays, with the following rules.
  // Sort first: Looking, online, {away, idle}, busy, do-not-disturb
  // Sort second: Friend, bookmark, recent
  // Sort third: Name (alphabetical)
  // To implement this, we can actually sort each array by 1 & 3
  // And then merge all sorted arrays with 1 & 2
  const statusValues: Record<string, number> = {
    looking: 0,
    online: 1,
    away: 2,
    idle: 2,
    busy: 3,
  };

  function merge(a1: CharacterData[], a2: CharacterData[]): CharacterData[] {
    let newBounds = a1.length + a2.length;
    let newArray: CharacterData[] = new Array(newBounds);
    let pos1 = 0;
    let pos2 = 0;
    for (let i = 0; i < newBounds; i++) {
      let v1 = a1[pos1];
      let v2 = a2[pos2];
      if (v1 === undefined) {
        newArray[i] = v2;
        pos2++;
      } else if (v2 === undefined) {
        newArray[i] = v1;
        pos1++;
      } else if (v1.character == v2.character) {
        newArray[i] = v1;
        pos1++;
        pos2++;
        newBounds--;
      } else if (statusValues[v1.status] <= statusValues[v2.status]) {
        // If they're equal, it'll be a1 first anyway.
        newArray[i] = v1;
        pos1++;
      } else {
        newArray[i] = v2;
        pos2++;
      }
    }
    newArray.length = newBounds;
    return newArray;
  }

  function compare(v1: CharacterData, v2: CharacterData): number {
    let s1 = statusValues[v1.status];
    let s2 = statusValues[v2.status];
    return s1 == s2 ? v1.character.localeCompare(v2.character) : s1 - s2;
  }

  // TODO: Fix sorting; it's broken and I don't know why.
  const sortedAll = $derived(uniqWith(
    [
      friendsWithStatus.sort(compare),
      bookmarksWithStatus.sort(compare),
      populatedRecents.sort(compare),
    ].reduce(merge),
    (a: CharacterData, b: CharacterData) => a.character == b.character
  ));

  const sortedOnline = $derived(sortedAll.filter((v) => v.status !== "offline"));
  const sortedOffline = $derived(sortedAll.filter((v) => v.status === "offline"));

  onMount(() => {
    syncBookmarks();
    syncFriends();
    syncCharacters();
  });
</script>

<h3>Online</h3>
<div id="online" class="character-list">
  {#each sortedOnline as character}
    <Character {...character} />
  {/each}
</div>
<h3>Offline</h3>
<div id="offline" class="character-list">
  {#each sortedOffline as character}
    <Character {...character} />
  {/each}
</div>

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
