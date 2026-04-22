import { katakanaToHiragana } from './kana';

// ヘボン式のローマ字表。拗音や外来音は2文字のかなを先に引くため別表にする。
// prettier-ignore
const DIGRAPH: Record<string, string> = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho', しぇ: 'she',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho', ちぇ: 'che',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
  みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
  ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo', じぇ: 'je',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
  ぢゃ: 'ja', ぢゅ: 'ju', ぢょ: 'jo',
  ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo',
  うぃ: 'wi', うぇ: 'we', うぉ: 'wo',
  ゔぁ: 'va', ゔぃ: 'vi', ゔぇ: 've', ゔぉ: 'vo',
  てぃ: 'ti', でぃ: 'di', とぅ: 'tu', どぅ: 'du',
  つぁ: 'tsa', つぃ: 'tsi', つぇ: 'tse', つぉ: 'tso',
  いぇ: 'ye',
};

// prettier-ignore
const MONOGRAPH: Record<string, string> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', ゐ: 'i', ゑ: 'e', を: 'o', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ゔ: 'vu',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o', ゎ: 'wa',
};

const VOWEL = /[aiueo]/;
const AFTER_N = /[あいうえおやゆよ]/;

/** 1かな(または拗音)のローマ字を引く。引けなければ空文字。 */
function syllable(chars: string[], i: number): string {
  const pair = (chars[i] ?? '') + (chars[i + 1] ?? '');
  if (DIGRAPH[pair]) return DIGRAPH[pair];
  return MONOGRAPH[chars[i] ?? ''] ?? '';
}

/**
 * かな(ひらがな・カタカナ)をヘボン式ローマ字へ写す。長音はマクロンを使わず
 * 母音を重ねる(さーばー → saabaa)。促音は次の子音を重ね、ち系の前は t を置く
 * (まっちゃ → matcha)。撥音は母音・や行の前で n' と切る(しんよう → shin'you)。
 * かな以外(漢字・記号・英数字)はそのまま通す。
 */
export function hiraganaToRomaji(input: string): string {
  const chars = [...katakanaToHiragana(input)];
  let out = '';
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i];
    if (ch === undefined) break;
    if (ch === 'っ') {
      const next = syllable(chars, i + 1);
      out += next === '' || next.startsWith('ch') ? 't' : next.charAt(0);
      i += 1;
      continue;
    }
    if (ch === 'ー') {
      const last = out.at(-1) ?? '';
      out += VOWEL.test(last) ? last : '';
      i += 1;
      continue;
    }
    const pair = ch + (chars[i + 1] ?? '');
    if (DIGRAPH[pair]) {
      out += DIGRAPH[pair];
      i += 2;
      continue;
    }
    const mono = MONOGRAPH[ch];
    if (mono !== undefined) {
      out += ch === 'ん' && AFTER_N.test(chars[i + 1] ?? '') ? "n'" : mono;
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}
