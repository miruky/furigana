import type { RubySegment } from './align';
import { alignReading } from './align';
import { hasKanji, katakanaToHiragana } from './kana';

/** 形態素解析器から受け取る最小限の情報。readingは未知語ではundefined */
export interface TokenReading {
  surface: string;
  reading?: string;
}

export interface AnnotatedToken {
  surface: string;
  /** ひらがなに揃えた読み。漢字を含まないトークンや未知語では持たない */
  readingHira?: string;
  segments: RubySegment[];
}

export function annotateTokens(tokens: TokenReading[]): AnnotatedToken[] {
  return tokens.map((t) => {
    if (!hasKanji(t.surface) || t.reading === undefined || t.reading === '') {
      return { surface: t.surface, segments: [{ text: t.surface }] };
    }
    const readingHira = katakanaToHiragana(t.reading);
    return { surface: t.surface, readingHira, segments: alignReading(t.surface, readingHira) };
  });
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

/** ruby要素のHTML。改行はそのまま残すので pre-wrap な要素に入れる */
export function toRubyHtml(tokens: AnnotatedToken[]): string {
  return tokens
    .map((t) =>
      t.segments
        .map((seg) =>
          seg.ruby !== undefined
            ? `<ruby>${escapeHtml(seg.text)}<rt>${escapeHtml(seg.ruby)}</rt></ruby>`
            : escapeHtml(seg.text),
        )
        .join(''),
    )
    .join('');
}

/** 「漢字(かんじ)」形式。メールなどHTMLが使えない場面向け */
export function toBracketText(tokens: AnnotatedToken[]): string {
  return tokens
    .map((t) =>
      t.segments
        .map((seg) => (seg.ruby !== undefined ? `${seg.text}（${seg.ruby}）` : seg.text))
        .join(''),
    )
    .join('');
}

/** 漢字を読みに開いた全かな文。カタカナ語はカタカナのまま残す */
export function toHiraganaText(tokens: AnnotatedToken[]): string {
  return tokens.map((t) => t.readingHira ?? t.surface).join('');
}

/** 分かち書き。トークン境界を半角スペースで示す */
export function toWakachi(tokens: AnnotatedToken[]): string {
  return tokens
    .map((t) => t.surface)
    .filter((s) => s.trim() !== '')
    .join(' ');
}
