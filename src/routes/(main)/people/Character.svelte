<script lang="ts">
  import type { Character } from "$lib/types";
  import CharacterIcon from "$lib/CharacterIcon.svelte";
  import { goto } from "$app/navigation";

  const props = $props<{
    character: Character;
    status?: string;
    gender?: string;
  }>();

  const status = props.status ?? "offline";
  const gender = props.gender ?? "none";

  const gotoPrivateMessage = async () => {
    await goto(`/private-messages/${props.character}`);
  };
</script>

<style lang="scss">
  .character {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 0;
    padding-right: 6px;
    gap: 6px;
    height: 36px;
    width: fit-content;

    border-radius: 4px;
    background: rgba(67, 67, 67, 0.4);
    border: 1px solid var(--color-gray-9);
    color: inherit;
    font: inherit;
    cursor: pointer;

    &:hover {
      background: rgba(67, 67, 67, 0.6);
    }

    &[data-gender="none"] { color: #BFBFBF; }
    &[data-gender="Male"] { color: #3c9ae8; }
    &[data-gender="Male-herm"] { color: #2b4acb; }
    &[data-gender="Herm"] { color: #854eca; }
    &[data-gender="Shemale"] { color: #ab7ae0; }
    &[data-gender="Female"] { color: #e0529c; }
    &[data-gender="Cunt-boy"] { color: #8bbb11; }
    &[data-gender="Transgender"] { color: #d87a16; }

    .character-name {
      font-size: 14px;
      font-weight: 500;
      margin: 0;
      white-space: nowrap;
    }
  }
</style>

<button
  type="button"
  class="character"
  data-gender={gender}
  onclick={gotoPrivateMessage}
>
  <CharacterIcon character={props.character} {status} iconSize={34} statusSize={8} />
  <p class="character-name">{props.character}</p>
</button>
