<!-- Character selection screen -->
<script lang="ts">
  import { getOwnCharacters } from "$lib/rust";
  import { friends, syncFriends, characters, syncCharacters } from "$lib/data";
  import { onMount } from "svelte";
  import { writable, derived } from "svelte/store";
  import { startSession } from "$lib/rust";
  import Characters from "./Characters.svelte";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";
  import CharacterIcon from "$lib/CharacterIcon.svelte";
  import { iconSizes } from "$lib/CharacterIcon.svelte";

  // Remember the recent characters
  const recentCharacters = writable<string[]>(
    browser ? JSON.parse(window.localStorage.getItem("characters") ?? "[]") : []
  );

  if (browser) {
    recentCharacters.subscribe((v) => {
      window.localStorage.setItem("characters", JSON.stringify(v));
    });
  }

  // Characters list can't be gotten from page.ts
  // Svelte doesn't provide the "window" which causes Tauri to explode.
  let own_characters = $state<string[]>([]);
  
  const onlineFriends = derived([friends, characters], ([$friends, $characters]) => 
    $friends.filter((friend) => $characters[friend]?.status === "online")
  );

  onMount(async () => {
    own_characters = await getOwnCharacters();
    await syncFriends();
    await syncCharacters();
  });

  async function choice({ character }: { character: string }) {
    let newRecent = $recentCharacters.filter((v) => v !== character);
    if (newRecent.unshift(character) > 6) newRecent.pop();
    $recentCharacters = newRecent;
    await startSession(character);
    await goto("/people/everyone", {replaceState: true, state: []});
  }

  const gotoPrivateMessage = (friend: string) => async () => {
    await goto(`/private-messages/${friend}`);
  };
</script>

<style lang="scss">
  #characters-container {
    position: absolute;
    overflow: clip scroll;
    left: max(min(calc(50% - 340px), 20%), 0px);
    right: max(min(calc(50% - 340px), 20%), 0px);
    bottom: 128px;
    top: 64px;

    scrollbar-width: thin;

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

  #recent {
    overflow: hidden;
  }

  #divider {
    left: 32px;
    right: 32px;
    height: 2px;
    border-radius: 2px;
    margin: 12px 24px;

    background: rgba(67, 67, 67, 0.4);
    align-self: stretch;
  }

  #friends-container {
    position: absolute;
    display: flex;
    flex-direction: column;
    
    bottom: 0px;
    left: 0px;
    right: 0px;

    padding: 16px 24px;
    gap: 8px;

    background-color: var(--color-gray-11);

    h3 {
      user-select: none;

      font-size: 16px;
      font-style: normal;
      font-weight: 500;
      line-height: 19px;
      margin: 0px;

      color: rgba(255, 255, 255, 0.87);
    }

    #friends {
      display: flex;
      flex-direction: row;
      gap: 8px;

      button {
        width: 32px;
        height: 32px;
        padding: 0;
        background: none;
        border: none;
        cursor: pointer;
      }
    }
  }
</style>

<div id="characters-container">
  {#if $recentCharacters.length > 0}
    <div id="recent">
      <Characters characters={$recentCharacters} {choice}/>
    </div>
    <div id="divider"></div>
  {/if}
  <Characters characters={own_characters} {choice}/>
</div>
{#if $onlineFriends.length > 0 }
  <div id="friends-container">
    <h3>Online Friends</h3>
    <div id="friends">
      <!--Friends go in here-->
      {#each $onlineFriends as friend}
        <button onclick={gotoPrivateMessage(friend)}>
          <CharacterIcon character={friend} {...iconSizes.small}/>
        </button>
      {/each}
    </div>
  </div>
{/if}
