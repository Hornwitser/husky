<script lang="ts">
  import { characters } from "$lib/data";
  import Character from "../Character.svelte";
  import type { Character as TCharacter } from "$lib/types";

  let searchQuery = $state("");
  
  const searchResults = $derived(
    Object.entries($characters)
      .filter(([name]) => name.toLowerCase().includes(searchQuery.toLowerCase()))
      .map(([name, char]) => ({
        character: name,
        status: char?.status ?? "offline",
        gender: char?.gender ?? "none"
      }))
  );
</script>

<style lang="scss">
  .search-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .search-input {
    padding: 8px 12px;
    font-size: 14px;
    border: 1px solid var(--color-gray-9);
    border-radius: 4px;
    background: var(--color-gray-10);
    color: white;
    width: 100%;
    max-width: 400px;

    &:focus {
      outline: none;
      border-color: var(--color-gray-8);
    }
  }

  .character-list {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 12px;
  }
</style>

<div class="search-container">
  <input
    type="text"
    class="search-input"
    placeholder="Search characters..."
    bind:value={searchQuery}
  />
  
  <div class="character-list">
    {#each searchResults as character}
      <Character {...character} />
    {/each}
  </div>
</div>
