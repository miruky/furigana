import { describe, expect, it } from 'vitest';
import { annotateTokens, toBracketText, toHiraganaText, toRubyHtml, toWakachi } from './annotate';
import type { TokenReading } from './annotate';

const tokens: TokenReading[] = [
  { surface: '東京', reading: 'トウキョウ' },
  { surface: 'に', reading: 'ニ' },
  { surface: '住む', reading: 'スム' },
  { surface: 'パンダ', reading: 'パンダ' },
];

describe('annotateTokens', () => {
  it('漢字を含むトークンだけに読みを割り当てる', () => {
    const annotated = annotateTokens(tokens);
    expect(annotated[0]?.readingHira).toBe('とうきょう');
    expect(annotated[1]?.readingHira).toBeUndefined();
    expect(annotated[3]?.readingHira).toBeUndefined();
  });

  it('読みのない未知語はそのまま通す', () => {
    const annotated = annotateTokens([{ surface: '榛名湖' }]);
    expect(annotated[0]?.segments).toEqual([{ text: '榛名湖' }]);
  });
});

describe('出力形式', () => {
  const annotated = annotateTokens(tokens);

  it('ruby要素のHTMLを組み立てる', () => {
    expect(toRubyHtml(annotated)).toBe(
      '<ruby>東京<rt>とうきょう</rt></ruby>に<ruby>住<rt>す</rt></ruby>むパンダ',
    );
  });

  it('HTMLに使えない文字はエスケープする', () => {
    const html = toRubyHtml(annotateTokens([{ surface: '<b>' }]));
    expect(html).toBe('&lt;b&gt;');
  });

  it('括弧書きのテキストを組み立てる', () => {
    expect(toBracketText(annotated)).toBe('東京（とうきょう）に住（す）むパンダ');
  });

  it('全かな文ではカタカナ語をカタカナのまま残す', () => {
    expect(toHiraganaText(annotated)).toBe('とうきょうにすむパンダ');
  });

  it('分かち書きは表層形を空白でつなぐ', () => {
    expect(toWakachi(annotated)).toBe('東京 に 住む パンダ');
  });

  it('空白だけのトークンは分かち書きに含めない', () => {
    const withSpace = annotateTokens([
      { surface: '東京', reading: 'トウキョウ' },
      { surface: ' ' },
      { surface: 'タワー', reading: 'タワー' },
    ]);
    expect(toWakachi(withSpace)).toBe('東京 タワー');
  });
});
