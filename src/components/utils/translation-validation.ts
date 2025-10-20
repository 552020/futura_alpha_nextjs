import { Dictionary } from '@/utils/dictionaries';

import { fatLogger } from '@/lib/logger';
type ValidComponents = keyof Dictionary;

export function validateTranslations(dict: Dictionary, lang: string, component: ValidComponents) {
  if (process.env.NODE_ENV === 'development') {
    const translations = dict[component];
    if (!translations) {
      fatLogger.warn(`[i18n] Missing translations for component "${component}" in locale "${lang}"`, 'fe');
      return;
    }

    Object.entries(translations).forEach(([key, value]) => {
      if (!value) {
        fatLogger.warn(`[i18n] Missing translation for "${component}.${key}" in locale "${lang}"`, 'fe');
      }
    });
  }
}
