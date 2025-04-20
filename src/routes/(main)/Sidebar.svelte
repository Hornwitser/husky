<script lang="ts">
  import { sessions, currentSession } from "$lib/session";
  import CharacterIcon from "$lib/CharacterIcon.svelte";
  import { goto } from "$app/navigation";
  import type { Channel, Character } from "$lib/types";

  const props = $props<{
    people: boolean;
    character: Character;
    channel: Channel;
  }>();

  let pmCharacter = $state("");

  const mainCharacter = $derived($currentSession!);
  const otherSessions = $derived($sessions.slice(1));

  const ICON_LARGE = {
    iconSize: 56,
    statusSize: 12
  } as const;

  const ICON_SMALL = {
    iconSize: 32,
    statusSize: 8
  } as const;

  const gotoCharacters = async () => {
    await goto("/characters");
  };

  const gotoNewPM = async () => {
    await goto(`/private-messages/${pmCharacter}/`);
  };
</script>

<style lang="scss">
  #sidebar {
    display: flex;
    flex-direction: column;
    width: 240px;
    height: 100%;
    background: var(--color-gray-11);
    border-right: 1px solid var(--color-gray-12);
  }

  #character-header {
    display: flex;
    flex-direction: row;
    padding: 12px;
    gap: 12px;
    border-bottom: 1px solid var(--color-gray-12);

    a {
      color: inherit;
      text-decoration: none;
      font-size: 18px;
      font-weight: 500;
      line-height: 22px;
    }
  }

  #alt-characters {
    display: flex;
    flex-direction: row;
    gap: 8px;
  }

  .sidebar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    border-radius: 4px;

    &:hover:not(:disabled) {
      background-color: var(--color-gray-12);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    img {
      width: 16px;
      height: 16px;
    }
  }

  .add-button {
    @extend .sidebar-button;
  }

  #sidebar-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 12px;
    gap: 24px;

    #people {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      text-decoration: none;
      color: inherit;
      border-radius: 4px;
      transition: background-color 0.2s;

      &:hover {
        background-color: var(--color-gray-12);
      }

      &.selected {
        background-color: var(--color-gray-9);
      }

      img {
        width: 16px;
        height: 16px;
      }

      p {
        margin: 0;
      }
    }
  }

  .section-header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;

    h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
    }
  }

  #new-pm {
    width: 100%;
    padding: 4px 8px;
    background: var(--color-gray-10);
    border: 1px solid var(--color-gray-9);
    border-radius: 4px;
    color: inherit;
    font: inherit;

    &::placeholder {
      color: var(--color-gray-7);
    }
  }

  #sidebar-footer {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding: 12px;
    border-top: 1px solid var(--color-gray-12);
  }
</style>

<div id="sidebar">
  <div id="character-header">
    <CharacterIcon character={mainCharacter} {...ICON_LARGE} />
    <div id="header-col">
      <!-- This is just so that we can stack the name and alt profiles -->
      <a href="_blank">{mainCharacter}</a>
      <div id="alt-characters">
        {#each otherSessions as session}
          <CharacterIcon character={session} {...ICON_SMALL} />
        {/each}
        <button
          type="button"
          class="add-button"
          onclick={gotoCharacters}
          title="Add Character"
        >
          <img src="/fa/plus.svg" alt="add" />
        </button>
      </div>
    </div>
  </div>
  <div id="sidebar-main">
    <a
      href="/people/everyone"
      id="people"
      class:selected={props.people}
    >
      <img src="/fa/user.svg" alt="person" />
      <p>People</p>
    </a>
    <div id="private-messages">
      <div id="private-messages-header" class="section-header">
        <h4>Private Messages</h4>
        <button
          type="button"
          class="add-button"
          onclick={gotoNewPM}
          title="Add Private Message"
          disabled={!pmCharacter}
        >
          <img src="/fa/plus.svg" alt="add" />
        </button>
      </div>
      <input
        placeholder="Character Name..."
        name="new-pm"
        id="new-pm"
        bind:value={pmCharacter}
      />
    </div>
    <div id="channels">
      <div id="channels-header" class="section-header">
        <h4>Channels</h4>
        <button
          type="button"
          class="add-button"
          onclick={() => {}}
          title="Add Channel"
          disabled
        >
          <img src="/fa/plus.svg" alt="add" />
        </button>
      </div>
    </div>
  </div>
  <div id="sidebar-footer">
    <button type="button" class="sidebar-button" onclick={() => {}} title="Settings">
      <img src="/fa/gear.svg" alt="Settings" />
    </button>
    <button type="button" class="sidebar-button" onclick={() => {}} title="Ads">
      <img src="/fa/rectangle-ad.svg" alt="Ads" />
    </button>
    <button type="button" class="sidebar-button" onclick={() => {}} title="Logs">
      <img src="/fa/file-lines.svg" alt="Logs" />
    </button>
    <button type="button" class="sidebar-button" onclick={() => {}} title="Console">
      <img src="/fa/terminal.svg" alt="Console" />
    </button>
    <button type="button" class="sidebar-button" onclick={() => {}} title="Sign Out">
      <img src="/fa/right-from-bracket.svg" alt="Sign-Out" />
    </button>
  </div>
</div>
