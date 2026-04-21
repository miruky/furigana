import './style.css';
import {
  annotateTokens,
  loadTokenizer,
  readTokenLines,
  toBracketText,
  toHiraganaText,
  toRubyHtml,
  toWakachi,
} from './lib';
import type { AnnotatedToken, JaTokenizer } from './lib';

const STORE_KEY = 'furigana:text';

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

type Format = 'ruby' | 'bracket' | 'hiragana' | 'wakachi';

const FORMAT_TABS: { key: Format; label: string }[] = [
  { key: 'ruby', label: 'ルビ表示' },
  { key: 'bracket', label: '括弧書き' },
  { key: 'hiragana', label: 'かな文' },
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
    <a class="repo-link" href="https://github.com/miruky/furigana" rel="noopener">GitHub</a>
  </header>
  <main class="layout">
    <section class="pane" aria-label="本文の入力">
      <div class="toolbar">
        <button type="button" id="btn-sample">サンプル文</button>
        <button type="button" id="btn-clear">クリア</button>
        <span class="spacer"></span>
        <span class="dict-state" id="dict-state" aria-live="polite"></span>
      </div>
      <textarea id="input" spellcheck="false" aria-label="ふりがなを振る文章"
        placeholder="ここに文章を貼り付けると、ふりがなが付きます。"></textarea>
      <div class="statusbar" id="stats" aria-live="polite"></div>
    </section>
    <section class="pane" aria-label="変換結果">
      <div class="toolbar">
        <div class="tabs" role="tablist" aria-label="出力形式" id="tabs"></div>
        <span class="spacer"></span>
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

let tokenizer: JaTokenizer | null = null;
let format: Format = 'ruby';
let lines: AnnotatedToken[][] = [];
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

function renderTabs(): void {
  tabsBox.textContent = '';
  for (const tab of FORMAT_TABS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `tab${format === tab.key ? ' active' : ''}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(format === tab.key));
    btn.textContent = tab.label;
    btn.addEventListener('click', () => {
      format = tab.key;
      renderTabs();
      renderOutput();
    });
    tabsBox.append(btn);
  }
}

function plainText(): string {
  const parts = lines.map((tokens) => {
    if (format === 'bracket') return toBracketText(tokens);
    if (format === 'hiragana') return toHiraganaText(tokens);
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
    `<span>${chars}字</span>`,
    `<span>${tokenCount}語</span>`,
    `<span>ルビ${rubyCount}箇所</span>`,
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

btnCopy.addEventListener('click', () => {
  const content = format === 'ruby' ? lines.map(toRubyHtml).join('\n') : plainText();
  void navigator.clipboard.writeText(content).then(() => {
    btnCopy.textContent = 'コピーした';
    setTimeout(() => {
      btnCopy.textContent = 'コピー';
    }, 1500);
  });
});

let stored: string | null = null;
try {
  stored = localStorage.getItem(STORE_KEY);
} catch {
  stored = null;
}
textarea.value = stored ?? SAMPLE_TEXT;

renderTabs();
renderStats();
dictState.innerHTML = `<span class="spinner" aria-hidden="true"></span>辞書を読み込んでいる(初回のみ・約17MB)`;
output.innerHTML = `<p class="placeholder">辞書を読み込んでいる。</p>`;

loadTokenizer(`${import.meta.env.BASE_URL}dict`)
  .then((t) => {
    tokenizer = t;
    dictState.textContent = '辞書の準備ができた';
    setTimeout(() => {
      dictState.textContent = '';
    }, 2500);
    analyzeNow();
  })
  .catch(() => {
    dictState.textContent = '辞書の読み込みに失敗した。再読み込みを試す';
  });
