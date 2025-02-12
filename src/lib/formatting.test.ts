import { describe, it, expect } from 'vitest';
import { parseBBCode, buildBBCode, compactRichNodes } from './formatting';
import type { IndexedRichNode } from './formatting';

// I let an AI write this test suite, and then tweaked it.
// If it looks really pretty, that's why -- I didn't write it.

describe('BBCode Parser and Builder', () => {
  describe('Basic BBCode Parsing', () => {
    it('should parse simple text without formatting', () => {
      const input = 'Hello world';
      const expected: IndexedRichNode[] = [{ content: 'Hello world', index: 0 }];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should parse basic formatting tags', () => {
      const input = '[b]Bold[/b] [i]Italic[/i] [u]Underline[/u]';
      const expected: IndexedRichNode[] = [
        { content: 'Bold', b: true, index: 3 },
        { content: ' ', index: 11 },
        { content: 'Italic', i: true, index: 15 },
        { content: ' ', index: 25 },
        { content: 'Underline', u: true, index: 29 }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should ignore tags that are not recognized', () => {
      const input = '[b]Bold[/b] [i]Italic[/i] [u]Underline[/u] [unknown]Unknown[/unknown]';
      const expected: IndexedRichNode[] = [
        { content: 'Bold', b: true, index: 3 },
        { content: ' ', index: 11 },
        { content: 'Italic', i: true, index: 15 },
        { content: ' ', index: 25 },
        { content: 'Underline', u: true, index: 29 },
        { content: ' [unknown]Unknown[/unknown]', index: 42 },
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });
  });

  describe('Markdown Conversion', () => {
    it('should convert markdown to BBCode when enabled', () => {
      const input = '**Bold** *Italic* __Underline__ ~~Strike~~ ||Spoiler||';
      //             01234567890123456789012345678901234567890123456789012345678901234567890123456789012
      //             [b]Bold[/b] [i]Italic[/i] [u]Underline[/u] [s]Strike[/s] [spoiler]Spoiler[/spoiler]
      const expected: IndexedRichNode[] = [
        { content: 'Bold', b: true, index: 2 },
        { content: ' ', index: 8 },
        { content: 'Italic', i: true, index: 10 },
        { content: ' ', index: 17 },
        { content: 'Underline', u: true, index: 20 },
        { content: ' ', index: 31 },
        { content: 'Strike', s: true, index: 34 },
        { content: ' ', index: 42 },
        { content: 'Spoiler', spoiler: true, index: 45 }
      ];
      expect(parseBBCode(input, true)).toEqual(expected);
    });

    it('should not convert markdown when disabled', () => {
      const input = '**Bold** *Italic*';
      const expected: IndexedRichNode[] = [{ content: '**Bold** *Italic*', index: 0 }];
      expect(parseBBCode(input, false)).toEqual(expected);
    });
  });

  describe('Mixed Content', () => {
    it('should handle markdown followed by BBCode', () => {
      const input = '**Bold** *Italic* [b]BBCode bold[/b]';
      const expected: IndexedRichNode[] = [
        { content: 'Bold', b: true, index: 2 },
        { content: ' ', index: 8 },
        { content: 'Italic', i: true, index: 10 },
        { content: ' ', index: 17 },
        { content: 'BBCode bold', b: true, index: 21 }
      ];
      expect(parseBBCode(input, true)).toEqual(expected);
    });

    it('should handle markdown nested in BBCode', () => {
      const input = '[b]Bold with *italic*[/b]';
      const expected: IndexedRichNode[] = [
        { content: 'Bold with ', b: true, index: 3 },
        { content: 'italic', b: true, i: true, index: 14 }
      ];
      expect(parseBBCode(input, true)).toEqual(expected);
    });

    it('should handle BBCode nested in markdown', () => {
      const input = '**Bold with [i]italic[/i] inside**';
      const expected: IndexedRichNode[] = [
        { content: 'Bold with ', b: true, index: 2 },
        { content: 'italic', b: true, i: true, index: 15 },
        { content: ' inside', b: true, index: 25 }
      ];
      expect(parseBBCode(input, true)).toEqual(expected);
    });
  })

  describe('Nested Tags', () => {
    it('should handle nested formatting tags', () => {
      const input = '[b][i]Bold and italic[/i][/b]';
      const expected: IndexedRichNode[] = [
        { content: 'Bold and italic', b: true, i: true, index: 6 }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle multiple levels of nesting', () => {
      const input = '[b][i][u]All formats[/u][/i][/b]';
      const expected: IndexedRichNode[] = [
        { content: 'All formats', b: true, i: true, u: true, index: 9 }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });
  });

  describe('Exclusive Tags', () => {
    it('should handle eicon tags', () => {
      const input = '[eicon]test[/eicon] Normal text';
      const expected: IndexedRichNode[] = [
        { eicon: 'test', index: 7 },
        { content: ' Normal text', index: 19 }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle character tags', () => {
      const input = '[character]John[/character] speaks';
      const expected: IndexedRichNode[] = [
        { character: 'John', index: 11 },
        { content: ' speaks', index: 27 }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle character_icon tags', () => {
      const input = '[character_icon]John[/character_icon] Normal text';
      const expected: IndexedRichNode[] = [
        { character_icon: 'John', index: 16 },
        { content: ' Normal text', index: 37 }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });
  });

  describe('Color Tags', () => {
    it('should normalize grey to gray', () => {
      const input = '[color=grey]Text[/color]';
      const expected: IndexedRichNode[] = [
        { content: 'Text', color: 'gray', index: 12 }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle valid colors', () => {
      const input = '[color=red]Red[/color] [color=blue]Blue[/color]';
      const expected: IndexedRichNode[] = [
        { content: 'Red', color: 'red', index: 11 },
        { content: ' ', index: 22 },
        { content: 'Blue', color: 'blue', index: 35 }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });
  });

  describe('URL Tags', () => {
    it('should handle URL tags with attributes', () => {
      const input = '[url=https://example.com]Link[/url]';
      const expected: IndexedRichNode[] = [
        { content: 'Link', url: 'https://example.com', index: 25 }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });
  });

  describe('Smart Closing Tags', () => {
    it('should handle single smart closing tags', () => {
      const input = '[b]Bold[/]';
      const expected: IndexedRichNode[] = [
        { content: 'Bold', b: true, index: 3 }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle multiple levels of smart closing tags', () => {
      const input = '[u][b][i]Bold and italic[/][/][/]';
      const expected: IndexedRichNode[] = [
        { content: 'Bold and italic', b: true, i: true, u: true, index: 9 }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle multiple levels of non-contiguous smart closing tags', () => {
      const input = '[b][i]Bold and italic[/] and bold[/]';
      const expected: IndexedRichNode[] = [
        { content: 'Bold and italic', b: true, i: true, index: 6 },
        { content: ' and bold', b: true, index: 24 }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle sequences of smart closing tags', () => {
      const input = '[b]Bold[/][i]Italic[/]';
      const expected: IndexedRichNode[] = [
        { content: 'Bold', b: true, index: 3 },
        { content: 'Italic', i: true, index: 13 }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle nested sequences of smart closing tags', () => {
      const input = '[u][b][i]Bold and italic[/][/][sub]Sub[/][/]';
      const expected: IndexedRichNode[] = [
        { content: 'Bold and italic', b: true, i: true, u: true, index: 9 },
        { content: 'Sub', sub: true, u: true, index: 35 }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });
  });

  describe('Noparse Sections', () => {
    it('should preserve content in noparse sections', () => {
      const input = '[noparse][b]Not bold[/b][/noparse]';
      const expected: IndexedRichNode[] = [
        { content: '[b]Not bold[/b]', noparse: true, index: 9 }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });
  });

  describe('Round-trip Testing', () => {
    const testCases = [
      'Simple text',
      '[b]Bold text[/b]',
      '[b][i]Bold italic[/i][/b]',
      '[color=red]Red text[/color]',
      '[url=https://example.com]Link[/url]',
      '[eicon]test[/eicon]',
      '[noparse][b]Raw text[/b][/noparse]',
      '[b]Bold[/b] [i]Italic[/i] [u]Underline[/u]'
    ];

    testCases.forEach((input) => {
      it(`should preserve "${input}" through parse-build cycle`, () => {
        const parsed = parseBBCode(input, false);
        const rebuilt = buildBBCode(parsed);
        const reparsed = parseBBCode(rebuilt, false);
        expect(reparsed).toEqual(parsed);
      });
    });
  });

  describe('Rich Node Compaction', () => {
    it('should combine consecutive nodes with identical formatting', () => {
      const input: IndexedRichNode[] = [
        { content: 'Hello ', b: true, index: 3 },
        { content: 'world', b: true, index: 9 }
      ];
      const expected: IndexedRichNode[] = [
        { content: 'Hello world', b: true, index: 3 }
      ];
      expect(compactRichNodes(input)).toEqual(expected);
    });

    it('should not combine nodes with different formatting', () => {
      const input: IndexedRichNode[] = [
        { content: 'Hello ', b: true, index: 3 },
        { content: 'world', i: true, index: 9 }
      ];
      expect(compactRichNodes(input)).toEqual(input);
    });

    it('should handle empty arrays', () => {
      expect(compactRichNodes([])).toEqual([]);
    });

    it('should handle single node arrays', () => {
      const input: IndexedRichNode[] = [{ content: 'test', b: true, index: 3 }];
      expect(compactRichNodes(input)).toEqual(input);
    });

    it('should not combine exclusive rich nodes', () => {
      const input: IndexedRichNode[] = [
        { eicon: 'test1', index: 7 },
        { eicon: 'test2', index: 18 }
      ];
      expect(compactRichNodes(input)).toEqual(input);
    });

    it('should handle mixed combining and exclusive nodes', () => {
      const input: IndexedRichNode[] = [
        { content: 'Hello ', b: true, index: 3 },
        { eicon: 'test', index: 10 },
        { content: 'world ', b: true, index: 20 },
        { content: 'again', b: true, index: 27 }
      ];
      const expected: IndexedRichNode[] = [
        { content: 'Hello ', b: true, index: 3 },
        { eicon: 'test', index: 10 },
        { content: 'world again', b: true, index: 20 }
      ];
      expect(compactRichNodes(input)).toEqual(expected);
    });

    it('should handle complex formatting correctly', () => {
      const input: IndexedRichNode[] = [
        { content: 'Hello ', b: true, i: true, color: 'red', index: 3 },
        { content: 'beautiful ', b: true, i: true, color: 'red', index: 9 },
        { content: 'world', b: true, i: true, color: 'blue', index: 19 }
      ];
      const expected: IndexedRichNode[] = [
        { content: 'Hello beautiful ', b: true, i: true, color: 'red', index: 3 },
        { content: 'world', b: true, i: true, color: 'blue', index: 19 }
      ];
      expect(compactRichNodes(input)).toEqual(expected);
    });

    it('should preserve noparse attribute when combining', () => {
      const input: IndexedRichNode[] = [
        { content: 'Hello ', noparse: true, index: 3 },
        { content: 'world', noparse: true, index: 9 }
      ];
      const expected: IndexedRichNode[] = [
        { content: 'Hello world', noparse: true, index: 3 }
      ];
      expect(compactRichNodes(input)).toEqual(expected);
    });
  });

  describe('Edge Cases', () => {
    it('should return an empty array for empty input', () => {
      const input = '';
      const expected: IndexedRichNode[] = [];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle input with only tags', () => {
      const input = '[b][i][u][/u][/i][/b]';
      const expected: IndexedRichNode[] = [];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle input with only spaces', () => {
      const input = '   ';
      const expected: IndexedRichNode[] = [{ content: '   ', index: 0 }];
      expect(parseBBCode(input, false)).toEqual(expected);
    });
  });

  describe('Error Handling', () => {
    it('should handle unclosed tags gracefully', () => {
      const input = '[b]Bold text';
      const expected: IndexedRichNode[] = [{ content: 'Bold text', b: true, index: 3 }];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle incorrect nesting of tags', () => {
      const input = '[b][i]Bold and [u]italic[/b][/i]';
      const expected: IndexedRichNode[] = [
        { content: 'Bold and ', b: true, i: true, index: 6 },
        { content: 'italic', i: true, u: true, b: true, index: 18 }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });
  });

  describe('Source Index Tracking', () => {
    it('should track source indices for simple text', () => {
      const input = 'Hello world';
      const expected: IndexedRichNode[] = [{ content: 'Hello world', index: 0 }];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should track source indices for basic formatting tags', () => {
      const input = '[b]Bold[/b] [i]Italic[/i]';
      const expected: IndexedRichNode[] = [
        { content: 'Bold', b: true, index: 3 },
        { content: ' ', index: 11 },
        { content: 'Italic', i: true, index: 15 }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should track source indices for noparse sections', () => {
      const input = 'Start [noparse][b]Raw[/b][/noparse] End';
      const expected: IndexedRichNode[] = [
        { content: 'Start ', index: 0 },
        { content: '[b]Raw[/b]', noparse: true, index: 15 },
        { content: ' End', index: 35 }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should track source indices for exclusive tags', () => {
      const input = '[eicon]test[/eicon] [character]John[/character]';
      const expected: IndexedRichNode[] = [
        { eicon: 'test', index: 7 },
        { content: ' ', index: 19 },
        { character: 'John', index: 31 }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should track source indices for nested formatting', () => {
      const input = '[b][i]Both[/i][/b]';
      const expected: IndexedRichNode[] = [
        { content: 'Both', b: true, i: true, index: 6 }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should track source indices with markdown conversion', () => {
      const input = '**Bold** *Italic*';
      //             0123456789012345678901234
      //             [b]Bold[/b] [i]Italic[/i]
      const expected: IndexedRichNode[] = [
        { content: 'Bold', b: true, index: 2 },
        { content: ' ', index: 8 },
        { content: 'Italic', i: true, index: 10 }
      ];
      expect(parseBBCode(input, true)).toEqual(expected);
    });

    it('should preserve source indices when compacting nodes', () => {
      const input = '[b]Hello[/b][b] world[/b]';
      const nodes = parseBBCode(input, false);
      const compacted = compactRichNodes(nodes);
      expect(compacted).toEqual([
        { content: 'Hello world', b: true, index: 3 }
      ]);
    });
  });
}); 
