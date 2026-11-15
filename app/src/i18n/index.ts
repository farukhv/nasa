import { createContext, useContext } from 'react';
import type { Lang } from '../engine/types';
import { tr, type Dictionary } from './tr';
import { en } from './en';

export type { Lang, Dictionary };

export const LANGUAGES: { id: Lang; short: string; name: string }[] = [
  { id: 'tr', short: 'TR', name: tr.name },
  { id: 'en', short: 'EN', name: en.name },
];
export const DICTIONARIES: Record<Lang, Dictionary> = { tr, en };

const STORAGE_KEY = 'mm-lang';

/** Saved choice first, then the browser language; anything that is not Turkish falls back to English. */
export function initialLanguage(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'tr' || saved === 'en') return saved;
  } catch { /* storage unavailable */ }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}
export function rememberLanguage(lang: Lang) {
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* storage unavailable */ }
}

export const LanguageContext = createContext<Lang>('tr');

/** `t` is the dictionary of the active language; `lang` its code. */
export function useI18n() {
  const lang = useContext(LanguageContext);
  return { lang, t: DICTIONARIES[lang] };
}
