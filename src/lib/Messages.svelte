<script lang="ts">
  import type { Message, MessageChannel } from "$lib/types";
  import { getMessages } from "$lib/rust";
  import CharacterIcon from "./CharacterIcon.svelte";
  import { intoHTML, parseBBCode } from "./formatting";

  const { channel } = $props<{ channel: MessageChannel }>();
  let messages = $state<Message[]>([]);

  // Compare only the first message since getMessages implementation guarantees this is sufficient
  const areMessagesEqual = (a: Message[], b: Message[]): boolean => {
    if (a.length !== b.length) return false;
    if (a.length === 0 && b.length === 0) return true;
    if (a.length === 0 || b.length === 0) return false;
    
    const firstA = a[0];
    const firstB = b[0];
    
    return firstA.character === firstB.character && 
           firstA.content.type === firstB.content.type &&
           (firstA.content.content === firstB.content.content ||
            (Array.isArray(firstA.content.content) && 
             Array.isArray(firstB.content.content) &&
             firstA.content.content.length === firstB.content.content.length &&
             firstA.content.content.every((item, j) => item === firstB.content.content[j])));
  };

  $effect(() => {
    const fetchMessages = async () => {
      const newMessages = await getMessages(channel);
      // Only update if messages have actually changed
      if (!areMessagesEqual(newMessages, messages)) {
        messages = newMessages;
      }
    };

    // Initial fetch
    fetchMessages();
    
    // Set up interval for subsequent fetches
    const intervalId = setInterval(fetchMessages, 1000);

    // Cleanup function runs when effect re-runs or component unmounts
    return () => {
      clearInterval(intervalId);
    };
  });

  const joinRolls = (rolls: string[]): string => {
    return rolls.join("+");
  };

  const format = (content: string): string => {
    // This shouldn't actually be in here.
    const nodes = parseBBCode(content);
    return nodes.map(node => intoHTML(node)).join("");
  };
</script>

{#each messages as message}
  <div class="message">
    <CharacterIcon character={message.character} />
    <div class="content message-{message.content.type}">
      <div class="character-name">{message.character}</div>
      <div class="message-content">
        {#if message.content.type == "roll"}
          <img src="/fa/dice.svg" class="dice" alt="dice" />
          <!-- I'd prefer to be able to syntax-highlight these, perhaps. Can use CSS:after.content to do joining. -->
          <span class="rolls">{joinRolls(message.content.content[0])}</span> =&gt;
          <span class="result">{message.content.content[2]}</span>
        {:else if message.content.type == "bottle"}
          <img src="/fa/dice.svg" class="dice" alt="dice" />
          bottle =&gt;
          <span class="formatting-character">{message.content.content}</span>
        {:else if message.content.type == "emote"}
          <img src="/fa/asterisk.svg" class="emote" alt="asterisk" />
          <i>{@html format(message.content.content)}</i>
        {:else}
          {@html format(message.content.content)}
        {/if}
      </div>
    </div>
  </div>
{/each}

<style lang="scss">
  .message {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 8px;
    padding: 4px 12px;

    &:hover {
      background: rgba(67, 67, 67, 0.2);
    }
  }

  .content {
    display: grid;
    grid-template-areas: 
      "name"
      "message";
    gap: 2px;
    flex: 1;
    min-width: 0; // Prevents flex items from overflowing
    margin-top: 4px; // Align with the icon

    .character-name {
      grid-area: name;
      font-weight: 500;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.9);
      line-height: 1;
      margin-top: -4px; // Counter the content margin to align with icon
    }

    img.dice, img.emote {
      width: 12px;
      height: 12px;
      margin: 0 4px;
      filter: invert(100%);
      opacity: 0.8;
    }

    &.message-roll, &.message-bottle {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 4px;

      .rolls {
        font-family: monospace;
      }

      .result {
        font-weight: 500;
      }
    }
  }
</style>
