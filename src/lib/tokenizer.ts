import { builder } from 'kuromoji';
import type { IpadicFeatures, Tokenizer } from 'kuromoji';
import type { TokenReading } from './annotate';

export type JaTokenizer = Tokenizer<IpadicFeatures>;

/**
 * 辞書(IPAdic、約17MB)を読み込んで形態素解析器を組み立てる。
 * ブラウザではdicPath配下の.dat.gzをfetchし、Nodeではファイルから読む。
 */
export function loadTokenizer(dicPath: string): Promise<JaTokenizer> {
  return new Promise((resolve, reject) => {
    builder({ dicPath }).build((err, tokenizer) => {
      if (err) reject(err);
      else resolve(tokenizer);
    });
  });
}

/**
 * 行ごとに解析する。改行をまたいだ誤った連結を防ぎ、
 * 出力でも元の改行位置を保てる。
 */
export function readTokenLines(tokenizer: JaTokenizer, text: string): TokenReading[][] {
  return text.split('\n').map((line) =>
    tokenizer.tokenize(line).map((t) => ({
      surface: t.surface_form,
      ...(t.reading !== undefined ? { reading: t.reading } : {}),
    })),
  );
}
