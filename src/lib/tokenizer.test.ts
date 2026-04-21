import { beforeAll, describe, expect, it } from 'vitest';
import { annotateTokens, toRubyHtml } from './annotate';
import { loadTokenizer, readTokenLines } from './tokenizer';
import type { JaTokenizer } from './tokenizer';

// 実際のIPAdic辞書(node_modules内)を読み込む統合テスト。
// 辞書ロードに数秒かかるため1度だけ構築して使い回す。
let tokenizer: JaTokenizer;

beforeAll(async () => {
  tokenizer = await loadTokenizer('node_modules/kuromoji/dict');
}, 30000);

describe('loadTokenizer / readTokenLines', () => {
  it('文を形態素に分割し読みを返す', () => {
    const lines = readTokenLines(tokenizer, '吾輩は猫である。');
    expect(lines).toHaveLength(1);
    const surfaces = lines[0]?.map((t) => t.surface);
    expect(surfaces).toEqual(['吾輩', 'は', '猫', 'で', 'ある', '。']);
    expect(lines[0]?.[0]?.reading).toBe('ワガハイ');
  });

  it('改行ごとに独立して解析する', () => {
    const lines = readTokenLines(tokenizer, '東京に行く。\n大阪に帰る。');
    expect(lines).toHaveLength(2);
    expect(lines[1]?.[0]?.surface).toBe('大阪');
  });

  it('解析結果からルビ付きHTMLまで通しで生成できる', () => {
    const lines = readTokenLines(tokenizer, '新聞を読み込む。');
    const html = toRubyHtml(annotateTokens(lines[0] ?? []));
    expect(html).toBe(
      '<ruby>新聞<rt>しんぶん</rt></ruby>を<ruby>読<rt>よ</rt></ruby>み<ruby>込<rt>こ</rt></ruby>む。',
    );
  });
});
