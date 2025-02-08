// Node tags:
// [b][i][u][s][color=][sup][sub][url=][user][icon][eicon][spoiler][noparse]
// Simple combinatorial nodes:
// - b
// - i
// - u
// - s
// - sup
// - sub
// - spoiler (untested in f-chat-proper)
// - noparse*
// Node types which can't have any other formatting combination (external) or nesting (internal)
// - eicon
// - icon
// - user
// Node types with attributes
// - url
// - color
// Additional considerations:
// - url, which has broken formatting combinations, and cannot be nested with itself
// - color, which overrides the inner color in nesting
// - noparse has no internal combinations, for obvious reasons

// This isn't introspection, but I don't mind.
const booleanTags = ["b", "i", "u", "s", "sup", "sub", "spoiler"] as const;
export type BooleanTag = typeof booleanTags[number];

const validColors = ["red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink", "black", "brown", "white", "gray"] as const;
export type ValidColor = typeof validColors[number];

const exclusiveTags = ["eicon", "character", "character_icon"] as const;
export type ExclusiveTag = typeof exclusiveTags[number];

const recognizedTags = [...booleanTags, ...exclusiveTags, "noparse", "url", "color"] as const;
export type RecognizedTag = typeof recognizedTags[number];

// Node types
export type ContentNode = { content: string }
export type ExclusiveRichNode = 
  | { eicon: string }
  | { character: string }
  | { character_icon: string }
export type CombiningRichNode = ContentNode & {[K in BooleanTag]?: boolean} & {
  noparse?: boolean, // This probably shouldn't actually appear, unless I want to apply code-formatting.
  url?: string,
  color?: ValidColor
}

export type RichNode = ExclusiveRichNode | CombiningRichNode

// We can make a nice linear parser, because it's just a big FSM (with nested states)
// And the state-nesting is just a stack, because all tags are optimistically balanced.
// We can either capture:
// - The opening tag, for BBCode
const tagOpening = /^\[([a-z_]+)(=[^\]]+)?\]/
// - The closing tag, for BBCode, including the quick-closing [/] tag I'm adding
const nextTagClosing = /\[\/([a-z_]*)\]/
const tagClosing = /^\[\/([a-z_]*)\]/
// - The noparse closing tag, for convenience in differentiating it when closing
const noparseClosing = /\[\/(noparse)?\]/
// Then, we can parse everything by:
// Checking for an opening tag, and adding it onto the formatting stack
// Checking for a closing tag, and searching down from the top of the stack for the same tag-type. 
// - If found, remove all elements above it.
// - Else, it's potentially malformed, and we can treat it as standard inner-text
// For markdown we do the same, but we assume it's a closing tag first, and pessimistically stop our search if we reach BBCode in the stack

// Parse BBCode into RichText, optionally including Markdown.
// Convert markdown with the following mappings:
// - Bold text into b
// - Italic text into i
// - Underlined text into u, using __ as the opening and closing tag
// - Strikethrough text into s, using ~~ as the opening and closing tag
// - Spoiler text into spoiler, using || as the opening and closing tag
// - Emote text into eicon
// Additionally, when parsing color tags, convert "grey" into "gray"
// For each change in formatting, create a new RichNode containing the subsequent text, and add it to the output array.
// When parsing a tag associated with ExclusiveRichNode, insert the subsequent text into the ExclusiveRichNode, for example:
// [eicon]test[/eicon] -> { eicon: "test" }
// [character]test[/character] -> { character: "test" }
// [character_icon]test[/character_icon] -> { character_icon: "test" }
// When parsing a tag associated with CombiningRichNode, insert the subsequent text into the CombiningRichNode, for example:
// [b]test[/b] -> { b: true, content: "test" }
// The same is true for Markdown tags, for example:
// **test** -> { b: true, content: "test" }
// We can be naive about BBCode formatting tags because we assume that the input is well-formed and nested tags are balanced.
// This is not true for Markdown, so we should first parse the Markdown into BBCode, and then parse the BBCode into RichText.
// Because the BBCode tags are balanced, we can follow simple rules:
// - For each new RichNode, we can reuse the previous RichNode's formatting if it exists. If the previous RichNode is an ExclusiveRichNode, we can't reuse its formatting, 
// so we should find the next-previous RichNode that is a CombiningRichNode, and combine the formatting.
// - When we see a BBCode tag, we can immediately insert a new RichNode into the output array, using the subsequent text as the content, and adding the new formatting.
// - When we see a closing tag, we do the same, but we clear the formatting associated with the tag.
// - When we see a noparse tag, we can immediately skip to the closing noparse tag, and treat the text in between as a ContentNode.
export function parseBBCode(input: string, useMarkdown: boolean): RichNode[] { 
  const output: RichNode[] = [];
  
  // First pass: Extract noparse sections and add sentinels
  let intermediateText = "";
  let currentIndex = 0;
  let noparseArray: string[] = [];
  
  while (currentIndex < input.length) {
    if (input.startsWith("[noparse]", currentIndex)) {
      const closeMatch = input.slice(currentIndex).match(noparseClosing);
      if (closeMatch && closeMatch.index !== undefined) {
        // Add [noparse] inner section directly to output
        //    -123456789-
        const content = input.slice(currentIndex + 9, currentIndex + closeMatch.index);
        noparseArray.push(content);
        // Add placeholder in intermediate text
        intermediateText += "\u0000\u0000";
        currentIndex += closeMatch.index + closeMatch[0].length;
        continue;
      }
    }
    intermediateText += input[currentIndex];
    currentIndex++;
  }

  // Second pass: Convert Markdown to BBCode if enabled
  if (useMarkdown) {
    // Replace markdown patterns with BBCode
    // Always apply longer patterns first.
    intermediateText = intermediateText
      .replace(/\*\*\*(.+?)\*\*\*/g, '[b][i]$1[/i][/b]')
      .replace(/\*\*(.+?)\*\*/g, '[b]$1[/b]')
      .replace(/\*(.+?)\*/g, '[i]$1[/i]')
      .replace(/__(.+?)__/g, '[u]$1[/u]')
      .replace(/_(.+?)_/g, '[i]$1[/i]')
      .replace(/~~(.+?)~~/g, '[s]$1[/s]')
      .replace(/\|\|(.+?)\|\|/g, '[spoiler]$1[/spoiler]');
  }

  // Third pass: Convert BBCode to RichNodes
  let currentFormatting: CombiningRichNode = { content: "" };
  let noparseArrayIndex = 0;
  let lastIndex = 0;
  currentIndex = 0;

  while (currentIndex < intermediateText.length) {
    // Trim the current formatting by deleting false keys.
    currentFormatting = trimFormatting(currentFormatting);

    // Check for noparse placeholder
    if (intermediateText.startsWith("\u0000\u0000", currentIndex)) {
      // Add any pending content before the noparse section
      const pendingContent = intermediateText.slice(lastIndex, currentIndex);
      if (pendingContent) {
        output.push({
          ...currentFormatting,
          content: pendingContent
        });
      }

      // Push noparse content with same formatting
      const noparseContent = noparseArray[noparseArrayIndex];
      output.push({
        ...currentFormatting,
        content: noparseContent,
        noparse: true
      });
      noparseArrayIndex++;

      // Reset content and noparse
      currentFormatting.content = "";
      delete currentFormatting.noparse;

      // Skip past sentinel and update lastIndex
      currentIndex += 2;
      lastIndex = currentIndex;
      continue;
    }

    // Check if we're on a tag boundary.
    if (intermediateText[currentIndex] === "[") {
      // Check for BBCode opening tag
      let match = intermediateText.slice(currentIndex).match(tagOpening);
      if (match) {
        const tag = match[1];
        const value = match[2]?.slice(1); // Remove = from value

        if (!recognizedTags.includes(tag as RecognizedTag)) {
          // Treat unrecognized tags as regular text - just move along
          currentIndex++;
          continue;
        }

        // Add any pending content before the tag
        const pendingContent = intermediateText.slice(lastIndex, currentIndex);
        if (pendingContent) {
          output.push({
            ...currentFormatting,
            content: pendingContent
          });
        }
        
        // Handle exclusive tags
        if (exclusiveTags.includes(tag as ExclusiveTag)) {
          currentIndex += match[0].length;

          // We're in an exclusive tag, so we find the first valid closing tag matching the opening tag.
          // No other tags can be nested in an exclusive tag, so we can close optimistically.
          let closeMatch;
          let searchIndex = currentIndex;
          while (closeMatch = intermediateText.slice(searchIndex).match(nextTagClosing)) {
            // Support [/] smart-closing tag.
            if (closeMatch[1] === tag || !closeMatch[1]) {
              const content = intermediateText.slice(currentIndex, searchIndex + closeMatch.index!);
              output.push({ [tag]: content } as RichNode);
              currentIndex = searchIndex + closeMatch.index! + closeMatch[0].length;
              lastIndex = currentIndex;
              break;
            }
            searchIndex += closeMatch.index! + closeMatch[0].length;
          }

          // We already consumed up to the closing tag, so we can start from the top again.
          // If we didn't find a closing tag, idk what to do.
          if (closeMatch) continue;
        }
        
        // Handle combining tags
        if (booleanTags.includes(tag as BooleanTag)) {
          currentFormatting[tag as BooleanTag] = true;
        } else if (tag === "color" && value) {
          const normalizedValue = value === "grey" ? "gray" : value;
          if (validColors.includes(normalizedValue as ValidColor)) {
            currentFormatting.color = normalizedValue as ValidColor;
          }
        } else if (tag === "url" && value) {
          currentFormatting.url = value;
        }
        
        // Move our cursor forward.
        currentIndex += match[0].length;
        lastIndex = currentIndex;
        continue;
      }

      // Check for BBCode closing tag
      match = intermediateText.slice(currentIndex).match(tagClosing);
      if (match) {
        const tag = match[1];
        
        if (tag && !recognizedTags.includes(tag as RecognizedTag)) {
          // Treat unrecognized closing tags as regular text - just move along
          currentIndex++;
          continue;
        }

        // Add any pending content before the closing tag
        const pendingContent = intermediateText.slice(lastIndex, currentIndex);
        if (pendingContent) {
          output.push({
            ...currentFormatting,
            content: pendingContent
          });
        }

        // Handle regular tags
        if (tag) {
          // We've already handled exclusive tags, so we only need to handle combining closing tags.
          if (booleanTags.includes(tag as BooleanTag) || tag === "color" || tag === "url") {
            delete currentFormatting[tag as keyof CombiningRichNode];
          } 
        } else {
          // Handle smart closing tag [/]
          // Find the most recently opened tag by comparing with the previous node
          const previousNode = getLastCombiningRichNode(output, 1);
          const currentTags = Object.keys(currentFormatting).filter(k => k !== 'content');
          const previousTags = Object.keys(previousNode).filter(k => k !== 'content');
          
          // Find the most recently added tag by comparing current and previous formatting
          // We need to maintain the order of tags, so we should remove the last tag that was added
          const tagsToConsider = currentTags.filter(tag => !previousTags.includes(tag));
          if (tagsToConsider.length > 0) {
            // Remove the last tag in the sequence (LIFO order)
            const lastTag = tagsToConsider[tagsToConsider.length - 1];
            delete currentFormatting[lastTag as keyof CombiningRichNode];
          }
        }
        
        currentIndex += match[0].length;
        lastIndex = currentIndex;
        continue;
      }
    }

    // Move along.
    currentIndex++;
  }

  // Add any remaining content
  const finalContent = intermediateText.slice(lastIndex);
  if (finalContent) {
    output.push({
      ...currentFormatting,
      content: finalContent
    });
  }

  return output;
}

export function buildBBCode(input: RichNode[]): string {
  let output = "";
  let clampedInput = [...input, { content: "" }]

  for (let i = 0; i < clampedInput.length; i++) {
    const node = clampedInput[i];
    // Differentiate CombiningRichNode and ExclusiveRichNode
    if ("content" in node) {
      // CombiningRichNode
      // We will compare the formatting of the previous RichNode to the current one, and add the differences to the output.
      const previousFormatting = clampedInput[i-1] ?? { content: "" };
      if ("content" in previousFormatting) {
        // Close removed tags and open new ones
        // This is a hideous abuse of short-circuiting, but it's also sort of beautiful.
        Object.keys(previousFormatting).forEach(key => !(key in node) && (output += `[/${key}]`));
        Object.entries(node).forEach(([key, value]) => !(key in previousFormatting) && (output += value === true ? `[${key}]` : `[${key}=${value}]`));
      } else {
        // If the previous formatting is an ExclusiveRichNode, we must re-open all of the tags
        // We must reopen them in the order they are subsequently closed.
        // We have to collect all of the keys we're going to open,
        // And then search forwards through the nodes to find candidates for closing tags -- The first time that we don't see a key, we mark the order for that key.
        // We then ignore it for subsequent keys.
        const keys = Object.keys(node).filter(k => k !== 'content') as (keyof CombiningRichNode)[];
        const processedKeys = new Set<typeof keys[number]>();
        
        // Look ahead one node at a time and add tags as we find them
        let searchIndex = 1;
        while (processedKeys.size < keys.length) {
          const futureNode = getNextCombiningRichNode(clampedInput, searchIndex, i);
          
          // Add tags for any keys that are missing in the future node
          for (const key of keys) {
            if (!(key in futureNode) && !processedKeys.has(key)) {
              output += node[key] === true ? `[${key}]` : `[${key}=${node[key]}]`;
              processedKeys.add(key);
            }
          }
          
          searchIndex++;
        }
      }
      output += node.content;
    } else {
      // ExclusiveRichNode
      // If the previous node is a CombiningRichNode, we must close all of the tags in the order they were opened.
      if (i>0 && ("content" in clampedInput[i-1])) {
        // This is the same as the previous section, but we're searching backwards.
        const keys = Object.keys(clampedInput[i-1]).filter(k => k !== 'content') as (keyof CombiningRichNode)[];
        const processedKeys = new Set<typeof keys[number]>();
        
        // Search backwards through the nodes to find candidates for closing tags
        let searchIndex = 1;
        while (processedKeys.size < keys.length) {
          const pastNode = getLastCombiningRichNode(clampedInput, searchIndex, i);
          
          // Close any tags that are not present in the past node.
          for (const key of keys) {
            if (!(key in pastNode) && !processedKeys.has(key)) {
              output += `[/${key}]`;
              processedKeys.add(key); 
            }
          }

          searchIndex++;
        }
      }

      // Writing in the ExclusiveRichNode itself can be self-contained.
      const tag = Object.keys(node)[0] as keyof typeof node;
      output += `[${tag}]${node[tag]}[/${tag}]`;
    }
  } 

  return output;
}

function getLastCombiningRichNode(nodes: RichNode[], offset: number = 0, startIndex: number = -1): CombiningRichNode {
  for (let i = (startIndex >= 0 ? startIndex : nodes.length) - 1 - offset; i >= 0; i--) {
    if ("content" in nodes[i]) {
      return nodes[i] as CombiningRichNode;
    }
  }
  return { content: "" };
}

function getNextCombiningRichNode(nodes: RichNode[], offset: number = 0, startIndex: number = 0): CombiningRichNode {
  // Permit the startIndex to be negative, to allow for searching forwards from the end of the array.
  for (let i = (startIndex >= 0 ? startIndex : nodes.length+startIndex) + offset; i < nodes.length; i++) {
    if ("content" in nodes[i]) {
      return nodes[i] as CombiningRichNode;
    }
  }
  return { content: "" };
}

function trimFormatting<T extends RichNode>(formatting: T): T {
  // I don't know why I bothered making it generic over RichNode because only CombiningRichNode has any false keys.
  const trimmed = { ...formatting };
  for (const key in trimmed) {
    if (key !== "content" && !trimmed[key as keyof T]) {
      delete trimmed[key as keyof T];
    }
  }
  return trimmed;
}

// Add this function after the other functions
export function compactRichNodes(nodes: RichNode[]): RichNode[] {
  if (nodes.length <= 1) return nodes;
  
  const result: RichNode[] = [];
  let current: RichNode | null = null;
  
  for (const node of nodes) {
    // Handle ExclusiveRichNodes - they can't be combined
    if (!("content" in node)) {
      if (current) result.push(current);
      result.push(node);
      current = null;
      continue;
    }
    
    // Handle CombiningRichNodes
    if (!current) {
      current = { ...node };
      continue;
    }
    
    // Only attempt to combine if both are CombiningRichNodes
    if ("content" in current) {
      // Check if formatting matches
      const currentKeys = Object.keys(current).filter(k => k !== 'content');
      const nodeKeys = Object.keys(node).filter(k => k !== 'content');
      
      const formattingMatches = 
        currentKeys.length === nodeKeys.length &&
        currentKeys.every(key => 
          key === 'content' || 
          current![key as keyof typeof current] === node[key as keyof typeof node]
        );
      
      if (formattingMatches) {
        // Combine the nodes by concatenating their content
        current.content += node.content;
      } else {
        // Different formatting, push current and start new
        result.push(current);
        current = { ...node };
      }
    }
  }
  
  // Push the last node if exists
  if (current) result.push(current);
  
  return result;
}
