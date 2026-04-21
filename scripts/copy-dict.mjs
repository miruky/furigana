// kuromoji同梱のIPAdic辞書をpublic/dictへ複製する。
// 辞書はnpm依存として取得するためGit管理せず、dev・buildの前に毎回そろえる。
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const src = 'node_modules/kuromoji/dict';
const dest = 'public/dict';

if (!existsSync(src)) {
  console.error('kuromojiの辞書が見つからない。先に npm ci を実行する');
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
let copied = 0;
for (const name of readdirSync(src)) {
  if (!name.endsWith('.dat.gz')) continue;
  const to = join(dest, name);
  if (!existsSync(to)) {
    copyFileSync(join(src, name), to);
    copied += 1;
  }
}
console.log(copied > 0 ? `辞書ファイルを${copied}件複製した` : '辞書は複製済み');
