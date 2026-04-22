import { describe, expect, it } from 'vitest';
import { nextTheme, themeLabel } from './theme';

describe('nextTheme', () => {
  it('system → light → dark → system と巡回する', () => {
    expect(nextTheme('system')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('system');
  });
});

describe('themeLabel', () => {
  it('選好を日本語のラベルにする', () => {
    expect(themeLabel('system')).toBe('システム');
    expect(themeLabel('light')).toBe('ライト');
    expect(themeLabel('dark')).toBe('ダーク');
  });
});
