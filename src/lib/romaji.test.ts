import { describe, expect, it } from 'vitest';
import { hiraganaToRomaji } from './romaji';

describe('hiraganaToRomaji', () => {
  it('五十音をヘボン式で写す', () => {
    expect(hiraganaToRomaji('あいうえお')).toBe('aiueo');
    expect(hiraganaToRomaji('しちつふ')).toBe('shichitsufu');
    expect(hiraganaToRomaji('かきくけこ')).toBe('kakikukeko');
  });

  it('拗音をまとめて写す', () => {
    expect(hiraganaToRomaji('きゃきゅきょ')).toBe('kyakyukyo');
    expect(hiraganaToRomaji('しゃしゅしょ')).toBe('shashusho');
    expect(hiraganaToRomaji('ちゃ')).toBe('cha');
    expect(hiraganaToRomaji('じゅ')).toBe('ju');
  });

  it('促音は次の子音を重ねる', () => {
    expect(hiraganaToRomaji('がっこう')).toBe('gakkou');
    expect(hiraganaToRomaji('きっぷ')).toBe('kippu');
  });

  it('促音+ち系は t を置く', () => {
    expect(hiraganaToRomaji('まっちゃ')).toBe('matcha');
  });

  it('長音記号は母音を重ねる', () => {
    expect(hiraganaToRomaji('さーばー')).toBe('saabaa');
    expect(hiraganaToRomaji('コーヒー')).toBe('koohii');
  });

  it('撥音は母音・や行の前で n# と切る', () => {
    expect(hiraganaToRomaji('しんよう')).toBe("shin'you");
    expect(hiraganaToRomaji('きんえん')).toBe("kin'en");
  });

  it('撥音は子音の前ではそのまま n', () => {
    expect(hiraganaToRomaji('かんじ')).toBe('kanji');
    expect(hiraganaToRomaji('ほん')).toBe('hon');
  });

  it('カタカナも変換する', () => {
    expect(hiraganaToRomaji('トウキョウ')).toBe('toukyou');
    expect(hiraganaToRomaji('ファイル')).toBe('fairu');
  });

  it('かな以外はそのまま通す', () => {
    expect(hiraganaToRomaji('東京タワー')).toBe('東京tawaa');
    expect(hiraganaToRomaji('ねこ、いぬ。')).toBe('neko、inu。');
    expect(hiraganaToRomaji('')).toBe('');
  });
});
