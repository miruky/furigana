// テーマの選好。system はOSの設定(prefers-color-scheme)に従う。
export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'furigana:theme';
const ORDER: ThemePref[] = ['system', 'light', 'dark'];

export function readTheme(): ThemePref {
  try {
    const value = localStorage.getItem(KEY);
    if (value === 'light' || value === 'dark') return value;
  } catch {
    // localStorageが使えない環境では system 扱い
  }
  return 'system';
}

/** data-theme属性とlocalStorageを選好に合わせる。systemは属性を外す。 */
export function applyTheme(pref: ThemePref): void {
  const root = document.documentElement;
  if (pref === 'system') delete root.dataset.theme;
  else root.dataset.theme = pref;
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // 保存できなくても表示の切り替えは効く
  }
}

export function nextTheme(pref: ThemePref): ThemePref {
  return ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length] ?? 'system';
}

export function themeLabel(pref: ThemePref): string {
  if (pref === 'light') return 'ライト';
  if (pref === 'dark') return 'ダーク';
  return 'システム';
}
