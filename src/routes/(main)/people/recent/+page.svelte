<script lang="ts">
  import { characters } from "$lib/data";
  import { getRecents } from "$lib/rust";
  import { currentSession } from "$lib/session";
  import Character from "../Character.svelte";
  import type { Character as TCharacter } from "$lib/types";

  let recents = $state<TCharacter[]>([]);

  $effect(() => {
    if ($currentSession) {
      getRecents($currentSession).then((v) => recents = v);
    }
  });

  const populatedRecents = $derived(recents.map((v) => {
    let char = $characters[v] ?? {};
    return {
      character: v,
      status: char.status ?? "offline",
      gender: char.gender ?? "none"
    };
  }));
</script>

<style lang="scss">
  .character-list {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    flex: 0 1 content;
    gap: 12px;
  }
</style>

<div id="recent" class="character-list">
  {#each populatedRecents as recent}
    <Character {...recent}/>
  {/each}
</div>
