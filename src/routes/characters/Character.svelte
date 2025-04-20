<script lang="ts">
  import { getAvatar } from "$lib/util";

  const { character, choice } = $props<{
    character: string;
    choice: (e: { character: string }) => Promise<void>;
  }>();

  async function onclick() {
    await choice({ character });
  }
</script>

<button class="char-container" {onclick} type="button">
  <img alt="Character Avatar" src={getAvatar(character)} />
  <p>{character}</p>
</button>

<style lang="scss">
  .char-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 8px;
    gap: 12px;
    width: fill;
    overflow-wrap: anywhere;

    background: #1f1f1f;
    border: 1px solid #141414;
    border-radius: 4px;

    cursor: pointer;
    font: inherit;
    color: inherit;
  }

  * {
    user-select: none;
  }
</style>
