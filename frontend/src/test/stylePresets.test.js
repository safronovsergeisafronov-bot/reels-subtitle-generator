import { describe, it, expect } from 'vitest';
import { stylePresets } from '../data/stylePresets';

describe('stylePresets', () => {
  it('should be a non-empty array', () => {
    expect(Array.isArray(stylePresets)).toBe(true);
    expect(stylePresets.length).toBeGreaterThan(0);
  });

  it('each preset should have required fields', () => {
    const requiredFields = [
      'name',
      'fontFamily',
      'fontSize',
      'color',
      'uppercase',
      'outlineWidth',
      'outlineColor',
      'shadowDepth',
      'bold',
      'position',
    ];

    for (const preset of stylePresets) {
      for (const field of requiredFields) {
        expect(preset).toHaveProperty(field);
      }
    }
  });

  it('each preset should have valid types', () => {
    for (const preset of stylePresets) {
      expect(typeof preset.name).toBe('string');
      expect(typeof preset.fontFamily).toBe('string');
      expect(typeof preset.fontSize).toBe('number');
      expect(typeof preset.color).toBe('string');
      expect(typeof preset.uppercase).toBe('boolean');
      expect(typeof preset.outlineWidth).toBe('number');
      expect(typeof preset.outlineColor).toBe('string');
      expect(typeof preset.shadowDepth).toBe('number');
      expect(typeof preset.bold).toBe('boolean');
    }
  });

  it('each preset should have valid position with x and y', () => {
    for (const preset of stylePresets) {
      expect(preset.position).toHaveProperty('x');
      expect(preset.position).toHaveProperty('y');
      expect(typeof preset.position.x).toBe('number');
      expect(typeof preset.position.y).toBe('number');
    }
  });

  it('color values should be valid hex', () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    for (const preset of stylePresets) {
      expect(preset.color).toMatch(hexPattern);
      expect(preset.outlineColor).toMatch(hexPattern);
    }
  });

  it('fontSize should be positive', () => {
    for (const preset of stylePresets) {
      expect(preset.fontSize).toBeGreaterThan(0);
    }
  });

  it('outlineWidth and shadowDepth should be non-negative', () => {
    for (const preset of stylePresets) {
      expect(preset.outlineWidth).toBeGreaterThanOrEqual(0);
      expect(preset.shadowDepth).toBeGreaterThanOrEqual(0);
    }
  });

  it('preset names should be unique', () => {
    const names = stylePresets.map((p) => p.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});
