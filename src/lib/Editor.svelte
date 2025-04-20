<script lang="ts">
  import { intoHTML, parseBBCode, buildBBCode } from "./formatting";


  let { textRaw, textFormatted, send } = $props<{ textRaw: string, textFormatted: string, send: (text: string) => void }>();

  let textbox: HTMLElement & ElementContentEditable;
  let isInitialized = false;

  // Initialize the textbox content only once
  $effect(() => {
    if (textbox && !isInitialized) {
      textbox.textContent = textRaw;
      isInitialized = true;
    }
  });

  function sendProxy(raw: string) {
    send(buildBBCode(parseBBCode(raw, true)));
    textRaw = '';
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      if (event.shiftKey) {
        // Allow Shift+Enter to create a new line
        return;
      }
      
      // Send on plain Enter
      event.preventDefault();
      if (textRaw.trim()) {
        sendProxy(textRaw);
      }
    }
  }

  function oninput(event: Event) {
    const target = event.target as HTMLElement;
    
    // Save cursor position before updating textRaw
    const selection = window.getSelection();
    if (selection && textbox.contains(selection.anchorNode)) {
      textbox.dataset.selectionStart = getTextOffset(selection.anchorNode, selection.anchorOffset).toString();
      textbox.dataset.selectionEnd = getTextOffset(selection.focusNode, selection.focusOffset).toString();
      textbox.dataset.isCollapsed = selection.isCollapsed.toString();
    }
    
    textRaw = target.textContent || '';
  }

  function generateFormatter(tag: string) {
    return () => {
      let selection = window.getSelection();
      if (!selection || !textbox.contains(selection.anchorNode)) return;

      // Save the selection range information
      const isCollapsed = selection.isCollapsed;
      const selectionStart = Math.min(
        getTextOffset(selection.anchorNode, selection.anchorOffset),
        getTextOffset(selection.focusNode, selection.focusOffset)
      );
      const selectionEnd = Math.max(
        getTextOffset(selection.anchorNode, selection.anchorOffset),
        getTextOffset(selection.focusNode, selection.focusOffset)
      );

      // Update the raw text with the new BBCode tags
      const openTag = `[${tag}]`;
      const closeTag = `[/${tag}]`;
      textRaw = textRaw.slice(0, selectionStart) + 
                openTag + 
                textRaw.slice(selectionStart, selectionEnd) + 
                closeTag + 
                textRaw.slice(selectionEnd);

      // Store the new cursor/selection position for preview to restore
      textbox.dataset.selectionStart = (selectionStart + openTag.length).toString();
      textbox.dataset.selectionEnd = (selectionEnd + openTag.length).toString();
      textbox.dataset.isCollapsed = isCollapsed.toString();
    };
  }

  // Helper function to get text offset of a node+offset combination
  function getTextOffset(node: Node | null, offset: number): number {
    if (!node) return 0;
    
    let totalOffset = 0;
    const walker = document.createTreeWalker(textbox, NodeFilter.SHOW_TEXT);
    let currentNode = walker.nextNode();
    
    while (currentNode) {
      if (currentNode === node) {
        return totalOffset + offset;
      }
      totalOffset += (currentNode as Text).length;
      currentNode = walker.nextNode();
    }
    return totalOffset;
  }

  const formatItalic = generateFormatter('i');
  const formatBold = generateFormatter('b');
  const formatUnderline = generateFormatter('u');
  const formatStrike = generateFormatter('s');
  const formatSub = generateFormatter('sub');
  const formatSup = generateFormatter('sup');
  const formatSpoiler = generateFormatter('spoiler');
  const formatNoparse = generateFormatter('noparse');

  function preview() {
    // Save selection information from either the current selection or stored data
    let selectionStart = 0;
    let selectionEnd = 0;
    let isCollapsed = true;
    
    const selection = window.getSelection();
    if (selection && textbox.contains(selection.anchorNode)) {
      selectionStart = getTextOffset(selection.anchorNode, selection.anchorOffset);
      selectionEnd = getTextOffset(selection.focusNode, selection.focusOffset);
      isCollapsed = selection.isCollapsed;
    } else if (textbox.dataset.selectionStart) {
      selectionStart = parseInt(textbox.dataset.selectionStart);
      selectionEnd = parseInt(textbox.dataset.selectionEnd);
      isCollapsed = textbox.dataset.isCollapsed === 'true';
    }

    // Clear the stored selection data
    delete textbox.dataset.selectionStart;
    delete textbox.dataset.selectionEnd;
    delete textbox.dataset.isCollapsed;

    // Format the text as before
    const nodes = parseBBCode(textRaw, true);
    let virtualOffset = 0;
    let virtualText = textRaw;
    for (const node of nodes) {
      const isolemnlyswear = node as any;
      let innerLength = isolemnlyswear.content?.length ?? isolemnlyswear.character?.length;
      if (innerLength === undefined) continue;
      
      const sliceStart = virtualOffset + node.index;
      const sliceEnd = virtualOffset + node.index + innerLength;
      const formatted = intoHTML(node);
      virtualText = virtualText.slice(0, sliceStart) + formatted + virtualText.slice(sliceEnd);
      virtualOffset += formatted.length - innerLength;
    }
    textbox.innerHTML = virtualText;

    // Always restore selection, even for collapsed cursor
    const range = document.createRange();
    const startPos = findTextPosition(selectionStart);
    const endPos = findTextPosition(selectionEnd);
    
    if (startPos && endPos) {
      range.setStart(startPos.node, startPos.offset);
      range.setEnd(endPos.node, endPos.offset);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  // Helper function to find text node and offset for a given position
  function findTextPosition(targetOffset: number): { node: Node, offset: number } | null {
    let currentOffset = 0;
    const walker = document.createTreeWalker(textbox, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    
    while (node) {
      const nodeLength = (node as Text).length;
      if (currentOffset + nodeLength >= targetOffset) {
        return {
          node: node,
          offset: targetOffset - currentOffset
        };
      }
      currentOffset += nodeLength;
      node = walker.nextNode();
    }
    return null;
  }

  $effect(() => {
    preview();
  });
</script>

<div class="col" id="container" role="application" aria-label="Text Editor">
  <div class="input-row">
    <div
      id="textbox"
      contenteditable="true"
      bind:this={textbox}
      {oninput}
      {onkeydown}
      role="textbox"
      aria-multiline="true"
      tabindex="0"
    ></div>
    <button
      type="button"
      class="send-btn format-btn"
      onclick={() => textRaw.trim() && sendProxy(textRaw)}
      title="Send Message"
    >
      <img src="/fa/paper-plane-solid.svg" alt="send">
    </button>
  </div>
  <div id="formatting" class="row" role="toolbar" aria-label="Formatting Tools">
    <!-- Left side -->
    <button
      type="button"
      class="format-btn"
      onclick={formatItalic}
      title="Italic"
    >
      <img src="/fa/italic.svg" alt="italic">
    </button>
    <button
      type="button"
      class="format-btn"
      onclick={formatBold}
      title="Bold"
    >
      <img src="/fa/bold.svg" alt="bold">
    </button>
    <button
      type="button"
      class="format-btn"
      onclick={formatUnderline}
      title="Underline"
    >
      <img src="/fa/underline.svg" alt="underline">
    </button>
    <button
      type="button"
      class="format-btn"
      onclick={formatStrike}
      title="Strikethrough"
    >
      <img src="/fa/strikethrough.svg" alt="strikethrough">
    </button>
    <button
      type="button"
      class="format-btn"
      onclick={formatSub}
      title="Subscript"
    >
      <img src="/fa/subscript.svg" alt="subscript">
    </button>
    <button
      type="button"
      class="format-btn"
      onclick={formatSup}
      title="Superscript"
    >
      <img src="/fa/superscript.svg" alt="superscript">
    </button>
    <button
      type="button"
      class="format-btn"
      title="Color"
      disabled
    >
      <img src="/fa/eye-dropper.svg" alt="color">
    </button>
    <button
      type="button"
      class="format-btn"
      onclick={formatSpoiler}
      title="Spoiler"
    >
      <img src="/fa/eye-slash.svg" alt="spoiler">
    </button>
    <button
      type="button"
      class="format-btn"
      onclick={formatNoparse}
      title="No Parse"
    >
      <img src="/fa/text-slash.svg" alt="noparse">
    </button>
    <div class="spreader"></div>
    <!-- Right side -->
    <button
      type="button"
      class="format-btn"
      title="Preview"
      disabled
    >
      <img src="/fa/eye.svg" alt="preview">
    </button>
    <button
      type="button"
      class="format-btn"
      title="Roll Dice"
      disabled
    >
      <img src="/fa/dice.svg" alt="dice">
    </button>
    <button
      type="button"
      class="format-btn"
      title="Markdown Help"
      disabled
    >
      <img src="/fa/markdown.svg" alt="markdown">
    </button>
  </div>
</div>

<style lang="scss">
  #container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  #textbox {
    min-height: 64px;
    padding: 8px;
    background: var(--color-gray-11);
    border: 1px solid var(--color-gray-12);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.87);
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    resize: vertical;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  #formatting {
    display: flex;
    flex-direction: row;
    gap: 4px;
    padding: 4px;
    background: var(--color-gray-11);
    border: 1px solid var(--color-gray-12);
    border-radius: 4px;
  }

  .format-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;

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

  .spreader {
    flex: 1;
  }

  .input-row {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  #textbox {
    flex: 1;
    min-height: 64px;
    padding: 8px;
    background: var(--color-gray-11);
    border: 1px solid var(--color-gray-12);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.87);
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    resize: vertical;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  .send-btn {
    margin-top: 8px;
    
    &:hover:not(:disabled) {
      background-color: var(--color-primary);
      
      img {
        filter: brightness(0) invert(1);
      }
    }
  }
</style>
