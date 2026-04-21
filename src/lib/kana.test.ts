import { describe, expect, it } from 'vitest';
import { hasKanji, isKanji, katakanaToHiragana } from './kana';

describe('katakanaToHiragana', () => {
  it('カタカナをひらがなへ写す', () => {
    expect(katakanaToHiragana('トウキョウ')).toBe('とうきょう');
    expect(katakanaToHiragana('ヨミコム')).toBe('よみこむ');
  });

  it('長音・記号・ひらがな・漢字はそのまま残す', () => {
    expect(katakanaToHiragana('サーバー')).toBe('さーばー');
    expect(katakanaToHiragana('読ミ、書キ。')).toBe('読み、書き。');
  });

  it('小書き文字とヴも対応する', () => {
    expect(katakanaToHiragana('チョット')).toBe('ちょっと');
    expect(katakanaToHiragana('ヴ')).toBe('ゔ');
  });
});

describe('isKanji / hasKanji', () => {
  it('漢字と繰り返し記号を漢字と判定する', () => {
    expect(isKanji('漢')).toBe(true);
    expect(isKanji('々')).toBe(true);
    expect(isKanji('ヶ')).toBe(true);
  });

  it('かな・英数字は漢字ではない', () => {
    expect(isKanji('あ')).toBe(false);
    expect(isKanji('ア')).toBe(false);
    expect(isKanji('A')).toBe(false);
  });

  it('hasKanjiは文字列のどこかに漢字があれば真', () => {
    expect(hasKanji('お疲れ様')).toBe(true);
    expect(hasKanji('おつかれさま')).toBe(false);
    expect(hasKanji('')).toBe(false);
  });
});
