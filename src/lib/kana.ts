// 々(繰り返し)・〆・ヶ(霞ヶ関)も漢字の連として扱う
const KANJI_CHAR = /[一-鿿々〆ヶ]/;

export function isKanji(ch: string): boolean {
  return KANJI_CHAR.test(ch);
}

export function hasKanji(s: string): boolean {
  for (const ch of s) {
    if (isKanji(ch)) return true;
  }
  return false;
}

/**
 * カタカナをひらがなへ写す。長音「ー」や記号はそのまま残す。
 * 形態素解析器の読み(カタカナ)をふりがな(ひらがな)へ揃えるために使う。
 */
export function katakanaToHiragana(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    // ァ(30A1)〜ヶ(30F6) は -0x60 でひらがな領域に対応する
    out += code >= 0x30a1 && code <= 0x30f6 ? String.fromCodePoint(code - 0x60) : ch;
  }
  return out;
}
