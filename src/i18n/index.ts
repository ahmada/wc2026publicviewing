import ms from './ms.json';
import en from './en.json';

export type Lang = 'ms' | 'en';

export const languages: Record<Lang, string> = {
  ms: 'Bahasa Malaysia',
  en: 'English',
};

export const defaultLang: Lang = 'ms';

const translations = { ms, en } as const;

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang === 'ms' || lang === 'en') return lang;
  return defaultLang;
}

type NestedKeys<T, Prefix extends string = ''> = T extends object
  ? { [K in keyof T]: K extends string
      ? T[K] extends object
        ? NestedKeys<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`
      : never
    }[keyof T]
  : never;

type TranslationKey = NestedKeys<typeof ms>;

function getNestedValue(obj: Record<string, unknown>, key: string): string {
  const parts = key.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return key;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : key;
}

export function useTranslations(lang: Lang) {
  return function t(key: TranslationKey | string, vars?: Record<string, string | number>): string {
    const value = getNestedValue(translations[lang] as unknown as Record<string, unknown>, key)
      || getNestedValue(translations[defaultLang] as unknown as Record<string, unknown>, key)
      || key;
    if (!vars) return value;
    return Object.entries(vars).reduce(
      (str, [k, v]) => str.replace(`{${k}}`, String(v)),
      value,
    );
  };
}

export function getAlternateUrl(currentUrl: URL, targetLang: Lang): string {
  const segments = currentUrl.pathname.split('/').filter(Boolean);
  if (segments[0] === 'ms' || segments[0] === 'en') segments[0] = targetLang;
  else segments.unshift(targetLang);
  return `/${segments.join('/')}`;
}
