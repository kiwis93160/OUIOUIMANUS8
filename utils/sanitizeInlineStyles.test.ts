import { describe, it, expect } from 'vitest';
import { sanitizeInlineStyles } from './sanitizeInlineStyles';

describe('sanitizeInlineStyles', () => {
  describe('allowed properties', () => {
    it('should preserve color property', () => {
      const html = '<p style="color: red;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).toContain('color: red');
    });

    it('should preserve background-color property', () => {
      const html = '<span style="background-color: #ff0000;">Text</span>';
      const result = sanitizeInlineStyles(html);
      expect(result).toContain('background-color: #ff0000');
    });

    it('should preserve font-weight property', () => {
      const html = '<strong style="font-weight: bold;">Bold</strong>';
      const result = sanitizeInlineStyles(html);
      expect(result).toContain('font-weight: bold');
    });

    it('should preserve font-style property', () => {
      const html = '<em style="font-style: italic;">Italic</em>';
      const result = sanitizeInlineStyles(html);
      expect(result).toContain('font-style: italic');
    });

    it('should preserve font-family property', () => {
      const html = '<p style="font-family: Arial, sans-serif;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).toContain('font-family: Arial, sans-serif');
    });

    it('should preserve font-size property', () => {
      const html = '<p style="font-size: 16px;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).toContain('font-size: 16px');
    });

    it('should preserve text-decoration property', () => {
      const html = '<p style="text-decoration: underline;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).toContain('text-decoration: underline');
    });

    it('should preserve line-height property', () => {
      const html = '<p style="line-height: 1.5;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).toContain('line-height: 1.5');
    });

    it('should preserve letter-spacing property', () => {
      const html = '<p style="letter-spacing: 2px;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).toContain('letter-spacing: 2px');
    });

    it('should preserve word-spacing property', () => {
      const html = '<p style="word-spacing: 4px;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).toContain('word-spacing: 4px');
    });

    it('should preserve text-transform property', () => {
      const html = '<p style="text-transform: uppercase;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).toContain('text-transform: uppercase');
    });

    it('should preserve multiple allowed properties', () => {
      const html = '<p style="color: blue; font-size: 18px; font-weight: bold;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).toContain('color: blue');
      expect(result).toContain('font-size: 18px');
      expect(result).toContain('font-weight: bold');
    });
  });

  describe('dangerous properties', () => {
    it('should remove position property', () => {
      const html = '<p style="position: fixed; color: red;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).not.toContain('position');
      expect(result).toContain('color: red');
    });

    it('should remove display property', () => {
      const html = '<p style="display: none; color: blue;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).not.toContain('display');
      expect(result).toContain('color: blue');
    });

    it('should remove margin property', () => {
      const html = '<p style="margin: 100px; color: green;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).not.toContain('margin');
      expect(result).toContain('color: green');
    });

    it('should remove padding property', () => {
      const html = '<p style="padding: 50px; font-size: 14px;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).not.toContain('padding');
      expect(result).toContain('font-size: 14px');
    });

    it('should remove top/left/right/bottom properties', () => {
      const html = '<p style="top: 0; left: 0; right: 0; bottom: 0; color: red;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).not.toContain('top');
      expect(result).not.toContain('left');
      expect(result).not.toContain('right');
      expect(result).not.toContain('bottom');
      expect(result).toContain('color: red');
    });

    it('should remove transform property', () => {
      const html = '<p style="transform: rotate(45deg); color: red;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).not.toContain('transform');
      expect(result).toContain('color: red');
    });

    it('should remove float property', () => {
      const html = '<p style="float: left; color: red;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).not.toContain('float');
      expect(result).toContain('color: red');
    });

    it('should remove z-index property', () => {
      const html = '<p style="z-index: 9999; color: red;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).not.toContain('z-index');
      expect(result).toContain('color: red');
    });

    it('should remove width and height properties', () => {
      const html = '<p style="width: 100%; height: 500px; color: red;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).not.toContain('width');
      expect(result).not.toContain('height');
      expect(result).toContain('color: red');
    });

    it('should remove overflow property', () => {
      const html = '<p style="overflow: hidden; color: red;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).not.toContain('overflow');
      expect(result).toContain('color: red');
    });

    it('should remove opacity property', () => {
      const html = '<p style="opacity: 0; color: red;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).not.toContain('opacity');
      expect(result).toContain('color: red');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = sanitizeInlineStyles('');
      expect(result).toBe('');
    });

    it('should handle HTML without style attributes', () => {
      const html = '<p>Plain text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).toBe(html);
    });

    it('should remove style attribute if all properties are dangerous', () => {
      const html = '<p style="position: fixed; display: none;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).not.toContain('style=');
    });

    it('should handle malformed CSS declarations', () => {
      const html = '<p style="color; font-size: 14px;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).toContain('font-size: 14px');
      expect(result).not.toContain('color;');
    });

    it('should handle nested elements with styles', () => {
      const html = '<div style="color: red;"><p style="position: fixed; font-size: 16px;">Text</p></div>';
      const result = sanitizeInlineStyles(html);
      expect(result).toContain('color: red');
      expect(result).toContain('font-size: 16px');
      expect(result).not.toContain('position');
    });

    it('should handle multiple spaces and formatting variations', () => {
      const html = '<p style="  color:red  ;  font-size:  16px  ;">Text</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).toContain('color');
      expect(result).toContain('font-size');
    });

    it('should preserve content with mixed allowed and dangerous properties', () => {
      const html = `
        <h2 style="position: absolute; color: blue; top: 0; font-size: 24px;">Title</h2>
        <p style="margin: 100px; font-family: Arial; display: none;">Content</p>
      `;
      const result = sanitizeInlineStyles(html);
      expect(result).toContain('color: blue');
      expect(result).toContain('font-size: 24px');
      expect(result).toContain('font-family: Arial');
      expect(result).not.toContain('position');
      expect(result).not.toContain('top');
      expect(result).not.toContain('margin');
      expect(result).not.toContain('display');
    });
  });

  describe('real-world attack scenarios', () => {
    it('should prevent layout breaking with position fixed', () => {
      const html = '<div style="position:fixed; top:0; left:0; width:100%; height:100%; background-color:red; z-index:9999;">Overlay</div>';
      const result = sanitizeInlineStyles(html);
      expect(result).toContain('background-color: red');
      expect(result).not.toContain('position');
      expect(result).not.toContain('top');
      expect(result).not.toContain('left');
      expect(result).not.toContain('width');
      expect(result).not.toContain('height');
      expect(result).not.toContain('z-index');
    });

    it('should prevent content hiding', () => {
      const html = '<p style="display:none; visibility:hidden; opacity:0; color:red;">Hidden</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).toContain('color: red');
      expect(result).not.toContain('display');
      expect(result).not.toContain('visibility');
      expect(result).not.toContain('opacity');
    });

    it('should prevent layout shifts', () => {
      const html = '<p style="margin:-1000px; padding:1000px; transform:translate(500px, 500px); color:blue;">Shifted</p>';
      const result = sanitizeInlineStyles(html);
      expect(result).toContain('color: blue');
      expect(result).not.toContain('margin');
      expect(result).not.toContain('padding');
      expect(result).not.toContain('transform');
    });
  });
});
