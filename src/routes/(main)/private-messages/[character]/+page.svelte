<script lang="ts">
  import CharacterIcon from "$lib/CharacterIcon.svelte";
  import { characters } from "$lib/data";
  import Editor from "$lib/Editor.svelte";
  import { currentSession } from "$lib/session";
  import type { PageData } from "./$types";
  import Messages from "$lib/Messages.svelte";
  import { sendMessage } from "$lib/rust";

  const { data } = $props<{ data: PageData }>();

  // This is actually a really bad idea
  // I should be passing down the selected session from the layout where the sidebar is drawn
  // No sidebar? No session selection, therefore don't care.
  // Need a session but no sidebar? Put it in the path. Add another selector. Anything.
  const thisCharacter = $derived($currentSession!);
  const characterData = $derived($characters[data.character]);

  let textRaw = $state("");
  let textFormatted = $state("");

  async function send(text: string) {
    if (text.trim()) {
      await sendMessage(thisCharacter, { recipient: data.character }, text);
      textRaw = "";
      textFormatted = "";
    }
  }
</script>

<div id="container" class="col">
  <!-- Header -->
  <div id="header">
    <CharacterIcon
      character={data.character}
      status={characterData?.status || "offline"}
    />
    <h3>{data.character}</h3>
    <img src="/fa/angle-down.svg" alt="info" id="info" />
    <div class="spreader"></div>
    <div class="clickable">
      <img src="/fa/magnifying-glass.svg" alt="search" id="search" />
    </div>
    <div class="clickable">
      <img src="/fa/ellipsis-vertical.svg" alt="more" id="vdot" />
    </div>
  </div>
  <!-- Body (Messages container) -->
  <div id="messages" class="spreader">
    <Messages
      channel={{
        own_character: thisCharacter,
        other_character: data.character,
      }}
    />
  </div>
  <!-- Message input -->
  <div id="input">
    <Editor {textRaw} {textFormatted} {send} />
  </div>
</div>

<style lang="scss">
  #header {
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 8px 12px;
    gap: 8px;

    height: 48px;
    background-color: var(--color-gray-12);
  }

  #search {
    width: 16px;
    height: 16px;
  }

  #vdot {
    width: 16px;
    height: 16px;
  }

  #info {
    width: 12px;
    height: 12px;
  }

  #container {
    height: 100%;
  }
</style>
