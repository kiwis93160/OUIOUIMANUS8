import { describe, expect, it } from 'vitest';
import {
  createSectionVars,
  createHeroVars,
  createElementVars,
} from './siteStyleHelpers';
import { SectionStyle, ElementStyle } from '../types';

describe('siteStyleHelpers - CSS variable creation', () => {
  describe('createSectionVars', () => {
    it('creates CSS variables for section with color background', () => {
      const style: SectionStyle = {
        background: {
          type: 'color',
          color: '#ff0000',
          image: null,
        },
        textColor: '#ffffff',
        fontFamily: 'Arial',
        fontSize: '16px',
      };

      const vars = createSectionVars(style, 'test');

      expect(vars).toHaveProperty('--test-bg-color', '#ff0000');
      expect(vars).toHaveProperty('--test-text-color', '#ffffff');
      expect(vars).toHaveProperty('--test-font-family', 'Arial');
      expect(vars).toHaveProperty('--test-font-size', '16px');
    });

    it('creates CSS variables for section with image background', () => {
      const style: SectionStyle = {
        background: {
          type: 'image',
          color: '#000000',
          image: 'https://example.com/image.jpg',
        },
        textColor: '#ffffff',
        fontFamily: 'Helvetica',
        fontSize: '14px',
      };

      const vars = createSectionVars(style, 'hero');

      expect(vars).toHaveProperty('--hero-bg-image', "url('https://example.com/image.jpg')");
      expect(vars).toHaveProperty('--hero-bg-color', '#000000');
      expect(vars).toHaveProperty('--hero-text-color', '#ffffff');
    });

    it('handles font family with quotes', () => {
      const style: SectionStyle = {
        background: { type: 'color', color: '#fff', image: null },
        textColor: '#000',
        fontFamily: 'Font With Spaces',
        fontSize: '16px',
      };

      const vars = createSectionVars(style, 'nav');

      expect(vars).toHaveProperty('--nav-font-family', "'Font With Spaces'");
    });
  });

  describe('createHeroVars', () => {
    it('uses custom image when provided', () => {
      const style: SectionStyle = {
        background: {
          type: 'image',
          color: '#000',
          image: 'https://example.com/custom.jpg',
        },
        textColor: '#fff',
        fontFamily: 'Arial',
        fontSize: '16px',
      };

      const vars = createHeroVars(style, 'https://example.com/fallback.jpg');

      expect(vars).toHaveProperty('--hero-bg-image', "url('https://example.com/custom.jpg')");
    });

    it('uses fallback image when no custom image is set', () => {
      const style: SectionStyle = {
        background: {
          type: 'color',
          color: '#000',
          image: null,
        },
        textColor: '#fff',
        fontFamily: 'Arial',
        fontSize: '16px',
      };

      const vars = createHeroVars(style, 'https://example.com/fallback.jpg');

      expect(vars).toHaveProperty('--hero-bg-image', "url('https://example.com/fallback.jpg')");
    });

    it('uses fallback when background type is image but image is null', () => {
      const style: SectionStyle = {
        background: {
          type: 'image',
          color: '#000',
          image: null,
        },
        textColor: '#fff',
        fontFamily: 'Arial',
        fontSize: '16px',
      };

      const vars = createHeroVars(style, 'https://example.com/fallback.jpg');

      expect(vars).toHaveProperty('--hero-bg-image', "url('https://example.com/fallback.jpg')");
    });

    it('handles null fallback image', () => {
      const style: SectionStyle = {
        background: { type: 'color', color: '#000', image: null },
        textColor: '#fff',
        fontFamily: 'Arial',
        fontSize: '16px',
      };

      const vars = createHeroVars(style, null);

      expect(vars).toHaveProperty('--hero-bg-color', '#000');
      expect(vars).not.toHaveProperty('--hero-bg-image');
    });
  });

  describe('createElementVars', () => {
    const sectionStyle: SectionStyle = {
      background: { type: 'color', color: '#fff', image: null },
      textColor: '#333',
      fontFamily: 'Arial',
      fontSize: '16px',
    };

    it('inherits section styles when element style is empty', () => {
      const vars = createElementVars(sectionStyle, null, 'elem');

      expect(vars).toHaveProperty('--elem-text-color', '#333');
      expect(vars).toHaveProperty('--elem-font-family', 'Arial');
      expect(vars).toHaveProperty('--elem-font-size', '16px');
    });

    it('overrides section styles with element styles', () => {
      const elementStyle: ElementStyle = {
        textColor: '#ff0000',
        fontSize: '20px',
      };

      const vars = createElementVars(sectionStyle, elementStyle, 'elem');

      expect(vars).toHaveProperty('--elem-text-color', '#ff0000');
      expect(vars).toHaveProperty('--elem-font-size', '20px');
      expect(vars).toHaveProperty('--elem-font-family', 'Arial'); // inherited
    });

    it('includes element-specific properties', () => {
      const elementStyle: ElementStyle = {
        backgroundColor: '#f0f0f0',
        fontWeight: 'bold',
        fontStyle: 'italic',
      };

      const vars = createElementVars(sectionStyle, elementStyle, 'title');

      expect(vars).toHaveProperty('--title-bg-color', '#f0f0f0');
      expect(vars).toHaveProperty('--title-font-weight', 'bold');
      expect(vars).toHaveProperty('--title-font-style', 'italic');
    });

    it('handles numeric font weight', () => {
      const elementStyle: ElementStyle = {
        fontWeight: '700',
      };

      const vars = createElementVars(sectionStyle, elementStyle, 'elem');

      expect(vars).toHaveProperty('--elem-font-weight', '700');
    });

    it('handles all font style values', () => {
      const normalStyle: ElementStyle = { fontStyle: 'normal' };
      const italicStyle: ElementStyle = { fontStyle: 'italic' };
      const obliqueStyle: ElementStyle = { fontStyle: 'oblique' };

      const normalVars = createElementVars(sectionStyle, normalStyle, 'a');
      const italicVars = createElementVars(sectionStyle, italicStyle, 'b');
      const obliqueVars = createElementVars(sectionStyle, obliqueStyle, 'c');

      expect(normalVars).toHaveProperty('--a-font-style', 'normal');
      expect(italicVars).toHaveProperty('--b-font-style', 'italic');
      expect(obliqueVars).toHaveProperty('--c-font-style', 'oblique');
    });
  });
});
