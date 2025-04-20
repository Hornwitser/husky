<script lang="ts">
  import Character from "./Character.svelte";

  const { characters, choice } = $props<{
    characters: string[];
    choice: (e: { character: string }) => void;
  }>();
</script>

<style lang="scss">
  #characters {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px + 24px, 1fr));
    grid-auto-rows: auto;
    gap: 12px;
  }
</style>

<div id="characters">
  {#each characters as character}
    <Character {character} {choice} />
  {/each}
</div>
