import './style.css';
import {
  annotateTokens,
  loadTokenizer,
  readTokenLines,
  toBracketText,
  toHiraganaText,
  toRomajiText,
  toRubyHtml,
  toWakachi,
} from './lib';
import type { AnnotatedToken, JaTokenizer } from './lib';
import { applyTheme, nextTheme, readTheme, themeLabel } from './theme';
import type { ThemePref } from './theme';

const STORE_KEY = 'furigana:text';

const THEME_ICONS: Record<ThemePref, string> = {
  light: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8"/></svg>`,
  dark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 7.5 7.5 0 1 0 20 14.5Z"/></svg>`,
  system: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="12" rx="1.6"/><path d="M8.5 20h7M12 16.5V20"/></svg>`,
};

const SAMPLE_TEXT = [
  '吾輩は猫である。名前はまだ無い。',
  'どこで生れたかとんと見当がつかぬ。何でも薄暗いじめじめした所でニャーニャー泣いていた事だけは記憶している。',
  '新聞を読み込み、お疲れ様の挨拶を交わし、東京都の人々は今日も働く。',
].join('\n');

const LOGO_SVG = `<svg viewBox="0 0 64 64" role="img" aria-label="furiganaのロゴ" class="logo">
  <g fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round">
    <path d="M14 12h10"/><path d="M30 12h10"/><path d="M46 12h6"/>
  </g>
  <g fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="10" y="22" width="44" height="34" rx="7"/>
    <path d="M32 30v18"/>
    <path d="M22 36h20"/>
    <path d="M24 48c4-2 6-5 8-10"/>
    <path d="M40 48c-4-2-6-5-8-10"/>
  </g>
</svg>`;

type Format = 'ruby' | 'bracket' | 'hiragana' | 'romaji' | 'wakachi';

const FORMAT_TABS: { key: Format; label: string }[] = [
  { key: 'ruby', label: 'ルビ表示' },
  { key: 'bracket', label: '括弧書き' },
  { key: 'hiragana', label: 'かな文' },
  { key: 'romaji', label: 'ローマ字' },
  { key: 'wakachi', label: '分かち書き' },
];

function mustFind<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`${selector} が見つからない`);
  return el;
}

const app = mustFind<HTMLDivElement>('#app');

app.innerHTML = `
  <header class="site-header">
    <div class="brand">
      ${LOGO_SVG}
      <div>
        <h1>furigana</h1>
        <p class="tagline">漢字かな交じり文にふりがなを振る。解析は全部ブラウザの中で終わる</p>
      </div>
    </div>
    <div class="header-actions">
      <button type="button" id="btn-theme" class="icon"></button>
      <a class="repo-link" href="https://github.com/miruky/furigana" rel="noopener">GitHub</a>
    </div>
  </header>
  <main class="layout">
    <section class="pane" aria-label="本文の入力">
      <div class="loadbar" id="loadbar" aria-hidden="true"></div>
      <div class="toolbar">
        <span class="pane-label">原文</span>
        <span class="spacer"></span>
        <span class="dict-state" id="dict-state" aria-live="polite"></span>
        <button type="button" id="btn-sample">サンプル文</button>
        <button type="button" id="btn-clear">クリア</button>
      </div>
      <textarea id="input" spellcheck="false" aria-label="ふりがなを振る文章"
        placeholder="ここに文章を貼り付けると、ふりがなが付きます。"></textarea>
      <div class="statusbar" id="stats" aria-live="polite"></div>
    </section>
    <section class="pane" aria-label="変換結果">
      <div class="toolbar">
        <div class="tabs" role="tablist" aria-label="出力形式" id="tabs"></div>
        <span class="spacer"></span>
        <button type="button" id="btn-download">保存</button>
        <button type="button" id="btn-copy" class="primary">コピー</button>
      </div>
      <div class="output" id="output" tabindex="0"></div>
    </section>
  </main>
  <footer class="site-footer">
    <p>文章はどこにも送信しない。辞書(IPAdic)は初回のみ読み込み、以後はブラウザが持つ。MIT License</p>
  </footer>
`;

const textarea = mustFind<HTMLTextAreaElement>('#input');
const output = mustFind<HTMLDivElement>('#output');
const tabsBox = mustFind<HTMLDivElement>('#tabs');
const dictState = mustFind<HTMLSpanElement>('#dict-state');
const statsBar = mustFind<HTMLDivElement>('#stats');
const btnSample = mustFind<HTMLButtonElement>('#btn-sample');
const btnClear = mustFind<HTMLButtonElement>('#btn-clear');
const btnCopy = mustFind<HTMLButtonElement>('#btn-copy');
const btnDownload = mustFind<HTMLButtonElement>('#btn-download');
const btnTheme = mustFind<HTMLButtonElement>('#btn-theme');
const loadbar = mustFind<HTMLDivElement>('#loadbar');

let tokenizer: JaTokenizer | null = null;
let format: Format = 'ruby';
let lines: AnnotatedToken[][] = [];
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let theme: ThemePref = readTheme();

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

function selectFormat(key: Format): void {
  format = key;
  renderTabs();
  renderOutput();
}

function renderTabs(): void {
  tabsBox.textContent = '';
  FORMAT_TABS.forEach((tab, index) => {
    const active = format === tab.key;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `tab${active ? ' active' : ''}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(active));
    btn.tabIndex = active ? 0 : -1;
    btn.textContent = tab.label;
    btn.addEventListener('click', () => selectFormat(tab.key));
    btn.addEventListener('keydown', (event) => {
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      let target = index;
      if (step !== 0) target = (index + step + FORMAT_TABS.length) % FORMAT_TABS.length;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = FORMAT_TABS.length - 1;
      else return;
      event.preventDefault();
      const next = FORMAT_TABS[target];
      if (next) {
        selectFormat(next.key);
        const focusTarget = tabsBox.children[target];
        if (focusTarget instanceof HTMLElement) focusTarget.focus();
      }
    });
    tabsBox.append(btn);
  });
}

function plainText(): string {
  const parts = lines.map((tokens) => {
    if (format === 'bracket') return toBracketText(tokens);
    if (format === 'hiragana') return toHiraganaText(tokens);
    if (format === 'romaji') return toRomajiText(tokens);
    return toWakachi(tokens);
  });
  return parts.join('\n');
}

function renderOutput(): void {
  if (!tokenizer) {
    output.innerHTML = `<p class="placeholder">辞書を読み込んでいる。</p>`;
    return;
  }
  if (textarea.value.trim() === '') {
    output.innerHTML = `<p class="placeholder">左に文章を入力すると、ここに結果が出る。</p>`;
    return;
  }
  if (format === 'ruby') {
    output.innerHTML = `<div class="ruby-text">${lines.map(toRubyHtml).join('\n')}</div>`;
  } else {
    output.innerHTML = `<div class="plain-text">${escapeHtml(plainText())}</div>`;
  }
}

function renderStats(): void {
  const tokenCount = lines.reduce((a, l) => a + l.length, 0);
  const rubyCount = lines
    .flat()
    .reduce((a, t) => a + t.segments.filter((s) => s.ruby !== undefined).length, 0);
  const chars = textarea.value.replace(/\s/g, '').length;
  statsBar.innerHTML = [
    `<span><b>${chars}</b> 字</span>`,
    `<span><b>${tokenCount}</b> 語</span>`,
    `<span>ルビ <b>${rubyCount}</b> 箇所</span>`,
  ].join('');
}

function analyzeNow(): void {
  if (!tokenizer) return;
  lines = readTokenLines(tokenizer, textarea.value).map(annotateTokens);
  renderOutput();
  renderStats();
}

function persist(): void {
  try {
    localStorage.setItem(STORE_KEY, textarea.value);
  } catch {
    // 保存できない環境でも動作は続ける
  }
}

textarea.addEventListener('input', () => {
  persist();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(analyzeNow, 250);
});

btnSample.addEventListener('click', () => {
  textarea.value = SAMPLE_TEXT;
  persist();
  analyzeNow();
});

btnClear.addEventListener('click', () => {
  textarea.value = '';
  persist();
  analyzeNow();
  textarea.focus();
});

function flashLabel(btn: HTMLButtonElement, temporary: string, original: string): void {
  btn.textContent = temporary;
  setTimeout(() => {
    btn.textContent = original;
  }, 1500);
}

function hasOutput(): boolean {
  return tokenizer !== null && textarea.value.trim() !== '';
}

/** ルビ付き本文を、その場で読める単体HTMLにまとめる(保存用)。 */
function rubyDocument(): string {
  const body = lines.map(toRubyHtml).join('\n');
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>furigana</title>
    <style>
      body {
        font-family: 'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif;
        line-height: 2.8;
        max-width: 42rem;
        margin: 2.5rem auto;
        padding: 0 1.25rem;
      }
      rt {
        font-size: 0.5em;
        color: #2f5aa6;
      }
    </style>
  </head>
  <body>
    <div style="white-space: pre-wrap">${body}</div>
  </body>
</html>
`;
}

function downloadBlob(name: string, type: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

async function copyRuby(): Promise<void> {
  const html = lines.map(toRubyHtml).join('\n');
  try {
    if (typeof ClipboardItem !== 'undefined' && 'write' in navigator.clipboard) {
      // リッチエディタには ruby を、プレーン入力には 漢字(かな) を渡す
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([lines.map(toBracketText).join('\n')], { type: 'text/plain' }),
        }),
      ]);
    } else {
      await navigator.clipboard.writeText(html);
    }
    flashLabel(btnCopy, 'コピーした', 'コピー');
  } catch {
    flashLabel(btnCopy, '失敗', 'コピー');
  }
}

btnCopy.addEventListener('click', () => {
  if (!hasOutput()) return;
  if (format === 'ruby') {
    void copyRuby();
  } else {
    void navigator.clipboard
      .writeText(plainText())
      .then(() => flashLabel(btnCopy, 'コピーした', 'コピー'))
      .catch(() => flashLabel(btnCopy, '失敗', 'コピー'));
  }
});

btnDownload.addEventListener('click', () => {
  if (!hasOutput()) return;
  if (format === 'ruby') {
    downloadBlob('furigana.html', 'text/html;charset=utf-8', rubyDocument());
  } else {
    downloadBlob('furigana.txt', 'text/plain;charset=utf-8', `${plainText()}\n`);
  }
  flashLabel(btnDownload, '保存した', '保存');
});

function renderTheme(): void {
  btnTheme.innerHTML = THEME_ICONS[theme];
  btnTheme.setAttribute('aria-label', `テーマ切替（現在: ${themeLabel(theme)}）`);
  btnTheme.title = `テーマ: ${themeLabel(theme)}`;
}

btnTheme.addEventListener('click', () => {
  theme = nextTheme(theme);
  applyTheme(theme);
  renderTheme();
});

let stored: string | null = null;
try {
  stored = localStorage.getItem(STORE_KEY);
} catch {
  stored = null;
}
textarea.value = stored ?? SAMPLE_TEXT;

applyTheme(theme);
renderTheme();
renderTabs();
renderStats();
loadbar.classList.add('on');
dictState.textContent = '辞書を準備中…';
output.innerHTML = `<p class="placeholder">辞書を読み込んでいる。初回だけIPAdic(約17MB)を取得する。</p>`;

loadTokenizer(`${import.meta.env.BASE_URL}dict`)
  .then((t) => {
    tokenizer = t;
    loadbar.classList.remove('on');
    dictState.textContent = '準備完了';
    setTimeout(() => {
      dictState.textContent = '';
    }, 2200);
    analyzeNow();
  })
  .catch(() => {
    loadbar.classList.remove('on');
    dictState.textContent = '辞書の読み込みに失敗した。再読み込みを試す';
  });
