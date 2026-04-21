import { isKanji, katakanaToHiragana } from './kana';

/** ルビを振る最小単位。rubyを持たない断片は送り仮名などの地の文字 */
export interface RubySegment {
  text: string;
  ruby?: string;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface Run {
  text: string;
  kanji: boolean;
}

/**
 * 表層形と読み(ひらがな)を突き合わせ、漢字の連にだけルビを割り当てる。
 * 「読み込む / よみこむ」なら 読(よ)・み・込(こ)・む に分かれる。
 *
 * 仕組み: 表層のかな部分を正規表現のリテラル、漢字の連をキャプチャにして
 * 読みと照合する。途中の連は最短一致、最後の連は残り全部を取る。
 * 照合に失敗した場合はトークン全体にルビを振る形へ落とす。
 */
export function alignReading(surface: string, readingHira: string): RubySegment[] {
  const runs: Run[] = [];
  for (const ch of surface) {
    const kanji = isKanji(ch);
    const last = runs[runs.length - 1];
    if (last && last.kanji === kanji) {
      last.text += ch;
    } else {
      runs.push({ text: ch, kanji });
    }
  }
  if (!runs.some((r) => r.kanji)) return [{ text: surface }];

  const kanjiRunCount = runs.filter((r) => r.kanji).length;
  let seen = 0;
  const pattern = runs
    .map((r) => {
      if (!r.kanji) return escapeRegExp(katakanaToHiragana(r.text));
      seen += 1;
      return seen === kanjiRunCount ? '(.+)' : '(.+?)';
    })
    .join('');

  const m = new RegExp(`^${pattern}$`).exec(readingHira);
  if (m === null) return [{ text: surface, ruby: readingHira }];

  let group = 0;
  return runs.map((r) => {
    if (!r.kanji) return { text: r.text };
    group += 1;
    return { text: r.text, ruby: m[group] ?? '' };
  });
}
