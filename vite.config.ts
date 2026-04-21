import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages配信時はワークフローが FURIGANA_BASE=/furigana/ を与える
  base: process.env.FURIGANA_BASE ?? '/',
  resolve: {
    // kuromojiの辞書ローダーがpath.joinを使うため、ブラウザ実装を差し込む
    alias: { path: 'path-browserify' },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
  },
});
