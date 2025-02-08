import { describe, it, expect } from 'vitest';
import { parseBBCode, buildBBCode, compactRichNodes } from './formatting';
import type { RichNode } from './formatting';

// I let an AI write this test suite, and then tweaked it.
// If it looks really pretty, that's why -- I didn't write it.

describe('BBCode Parser and Builder', () => {
  describe('Basic BBCode Parsing', () => {
    it('should parse simple text without formatting', () => {
      const input = 'Hello world';
      const expected: RichNode[] = [{ content: 'Hello world' }];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should parse basic formatting tags', () => {
      const input = '[b]Bold[/b] [i]Italic[/i] [u]Underline[/u]';
      const expected: RichNode[] = [
        { content: 'Bold', b: true },
        { content: ' ' },
        { content: 'Italic', i: true },
        { content: ' ' },
        { content: 'Underline', u: true }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should ignore tags that are not recognized', () => {
      const input = '[b]Bold[/b] [i]Italic[/i] [u]Underline[/u] [unknown]Unknown[/unknown]';
      const expected: RichNode[] = [
        { content: 'Bold', b: true },
        { content: ' ' },
        { content: 'Italic', i: true },
        { content: ' ' },
        { content: 'Underline', u: true },
        { content: ' [unknown]Unknown[/unknown]' },
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });
  });

  describe('Markdown Conversion', () => {
    it('should convert markdown to BBCode when enabled', () => {
      const input = '**Bold** *Italic* __Underline__ ~~Strike~~ ||Spoiler||';
      const expected: RichNode[] = [
        { content: 'Bold', b: true },
        { content: ' ' },
        { content: 'Italic', i: true },
        { content: ' ' },
        { content: 'Underline', u: true },
        { content: ' ' },
        { content: 'Strike', s: true },
        { content: ' ' },
        { content: 'Spoiler', spoiler: true }
      ];
      expect(parseBBCode(input, true)).toEqual(expected);
    });

    it('should not convert markdown when disabled', () => {
      const input = '**Bold** *Italic*';
      const expected: RichNode[] = [{ content: '**Bold** *Italic*' }];
      expect(parseBBCode(input, false)).toEqual(expected);
    });
  });

  describe('Mixed Content', () => {
    it('should handle markdown followed by BBCode', () => {
      const input = '**Bold** *Italic* [b]BBCode bold[/b]';
      const expected: RichNode[] = [
        { content: 'Bold', b: true },
        { content: ' ' },
        { content: 'Italic', i: true },
        { content: ' ' },
        { content: 'BBCode bold', b: true }
      ];
      expect(parseBBCode(input, true)).toEqual(expected);
    });

    it('should handle markdown nested in BBCode', () => {
      const input = '[b]Bold with *italic*[/b]';
      const expected: RichNode[] = [
        { content: 'Bold with ', b: true },
        { content: 'italic', b: true, i: true }
      ];
      expect(parseBBCode(input, true)).toEqual(expected);
    });

    it('should handle BBCode nested in markdown', () => {
      const input = '**Bold with [i]italic[/i] inside**';
      const expected: RichNode[] = [
        { content: 'Bold with ', b: true },
        { content: 'italic', b: true, i: true },
        { content: ' inside', b: true }
      ];
      expect(parseBBCode(input, true)).toEqual(expected);
    });
  })

  describe('Nested Tags', () => {
    it('should handle nested formatting tags', () => {
      const input = '[b][i]Bold and italic[/i][/b]';
      const expected: RichNode[] = [
        { content: 'Bold and italic', b: true, i: true }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle multiple levels of nesting', () => {
      const input = '[b][i][u]All formats[/u][/i][/b]';
      const expected: RichNode[] = [
        { content: 'All formats', b: true, i: true, u: true }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });
  });

  describe('Exclusive Tags', () => {
    it('should handle eicon tags', () => {
      const input = '[eicon]test[/eicon] Normal text';
      const expected: RichNode[] = [
        { eicon: 'test' },
        { content: ' Normal text' }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle character tags', () => {
      const input = '[character]John[/character] speaks';
      const expected: RichNode[] = [
        { character: 'John' },
        { content: ' speaks' }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle character_icon tags', () => {
      const input = '[character_icon]John[/character_icon] Normal text';
      const expected: RichNode[] = [
        { character_icon: 'John' },
        { content: ' Normal text' }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });
  });

  describe('Color Tags', () => {
    it('should normalize grey to gray', () => {
      const input = '[color=grey]Text[/color]';
      const expected: RichNode[] = [
        { content: 'Text', color: 'gray' }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle valid colors', () => {
      const input = '[color=red]Red[/color] [color=blue]Blue[/color]';
      const expected: RichNode[] = [
        { content: 'Red', color: 'red' },
        { content: ' ' },
        { content: 'Blue', color: 'blue' }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });
  });

  describe('URL Tags', () => {
    it('should handle URL tags with attributes', () => {
      const input = '[url=https://example.com]Link[/url]';
      const expected: RichNode[] = [
        { content: 'Link', url: 'https://example.com' }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });
  });

  describe('Smart Closing Tags', () => {
    it('should handle single smart closing tags', () => {
      const input = '[b]Bold[/]';
      const expected: RichNode[] = [
        { content: 'Bold', b: true }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle multiple levels of smart closing tags', () => {
      const input = '[u][b][i]Bold and italic[/][/][/]';
      const expected: RichNode[] = [
        { content: 'Bold and italic', b: true, i: true, u: true }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle multiple levels of non-contiguous smart closing tags', () => {
      const input = '[b][i]Bold and italic[/] and bold[/]';
      const expected: RichNode[] = [
        { content: 'Bold and italic', b: true, i: true },
        { content: ' and bold', b: true }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle sequences of smart closing tags', () => {
      const input = '[b]Bold[/][i]Italic[/]';
      const expected: RichNode[] = [
        { content: 'Bold', b: true },
        { content: 'Italic', i: true }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle nested sequences of smart closing tags', () => {
      const input = '[u][b][i]Bold and italic[/][/][sub]Sub[/][/]';
      const expected: RichNode[] = [
        { content: 'Bold and italic', b: true, i: true, u: true },
        { content: 'Sub', sub: true, u: true }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });
  });

  describe('Noparse Sections', () => {
    it('should preserve content in noparse sections', () => {
      const input = '[noparse][b]Not bold[/b][/noparse]';
      const expected: RichNode[] = [
        { content: '[b]Not bold[/b]', noparse: true }
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
      const input: RichNode[] = [
        { content: 'Hello ', b: true },
        { content: 'world', b: true }
      ];
      const expected: RichNode[] = [
        { content: 'Hello world', b: true }
      ];
      expect(compactRichNodes(input)).toEqual(expected);
    });

    it('should not combine nodes with different formatting', () => {
      const input: RichNode[] = [
        { content: 'Hello ', b: true },
        { content: 'world', i: true }
      ];
      expect(compactRichNodes(input)).toEqual(input);
    });

    it('should handle empty arrays', () => {
      expect(compactRichNodes([])).toEqual([]);
    });

    it('should handle single node arrays', () => {
      const input: RichNode[] = [{ content: 'test', b: true }];
      expect(compactRichNodes(input)).toEqual(input);
    });

    it('should not combine exclusive rich nodes', () => {
      const input: RichNode[] = [
        { eicon: 'test1' },
        { eicon: 'test2' }
      ];
      expect(compactRichNodes(input)).toEqual(input);
    });

    it('should handle mixed combining and exclusive nodes', () => {
      const input: RichNode[] = [
        { content: 'Hello ', b: true },
        { eicon: 'test' },
        { content: 'world ', b: true },
        { content: 'again', b: true }
      ];
      const expected: RichNode[] = [
        { content: 'Hello ', b: true },
        { eicon: 'test' },
        { content: 'world again', b: true }
      ];
      expect(compactRichNodes(input)).toEqual(expected);
    });

    it('should handle complex formatting correctly', () => {
      const input: RichNode[] = [
        { content: 'Hello ', b: true, i: true, color: 'red' },
        { content: 'beautiful ', b: true, i: true, color: 'red' },
        { content: 'world', b: true, i: true, color: 'blue' }
      ];
      const expected: RichNode[] = [
        { content: 'Hello beautiful ', b: true, i: true, color: 'red' },
        { content: 'world', b: true, i: true, color: 'blue' }
      ];
      expect(compactRichNodes(input)).toEqual(expected);
    });

    it('should preserve noparse attribute when combining', () => {
      const input: RichNode[] = [
        { content: 'Hello ', noparse: true },
        { content: 'world', noparse: true }
      ];
      const expected: RichNode[] = [
        { content: 'Hello world', noparse: true }
      ];
      expect(compactRichNodes(input)).toEqual(expected);
    });
  });

  describe('Edge Cases', () => {
    it('should return an empty array for empty input', () => {
      const input = '';
      const expected: RichNode[] = [];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle input with only tags', () => {
      const input = '[b][i][u][/u][/i][/b]';
      const expected: RichNode[] = [];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle input with only spaces', () => {
      const input = '   ';
      const expected: RichNode[] = [{ content: '   ' }];
      expect(parseBBCode(input, false)).toEqual(expected);
    });
  });

  describe('Error Handling', () => {
    it('should handle unclosed tags gracefully', () => {
      const input = '[b]Bold text';
      const expected: RichNode[] = [{ content: 'Bold text', b: true }];
      expect(parseBBCode(input, false)).toEqual(expected);
    });

    it('should handle incorrect nesting of tags', () => {
      const input = '[b][i]Bold and [u]italic[/b][/i]';
      const expected: RichNode[] = [
        { content: 'Bold and ', b: true, i: true },
        { content: 'italic', i: true, u: true, b: true }
      ];
      expect(parseBBCode(input, false)).toEqual(expected);
    });
  });
}); 
