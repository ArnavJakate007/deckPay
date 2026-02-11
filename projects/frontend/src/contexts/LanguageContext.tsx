/**
 * Language Context — English / Hindi i18n
 * 
 * Provides a simple toggle between English and Hindi translations.
 * Translation strings are loaded from JSON files.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import en from '../i18n/en.json';
import hi from '../i18n/hi.json';

type Language = 'en' | 'hi';
type TranslationKeys = typeof en;

interface LanguageContextType {
    /** Current language code */
    language: Language;
    /** Toggle between English and Hindi */
    toggleLanguage: () => void;
    /** Set a specific language */
    setLanguage: (lang: Language) => void;
    /** Get a translated string by key path (e.g., "home.title") */
    t: (key: string) => string;
}

const translations: Record<Language, TranslationKeys> = { en, hi };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('en');

    const toggleLanguage = useCallback(() => {
        setLanguageState((prev) => (prev === 'en' ? 'hi' : 'en'));
    }, []);

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
    }, []);

    const t = useCallback(
        (key: string): string => {
            const keys = key.split('.');
            let result: unknown = translations[language];
            for (const k of keys) {
                if (result && typeof result === 'object' && k in result) {
                    result = (result as Record<string, unknown>)[k];
                } else {
                    return key; // Fallback: return key if translation not found
                }
            }
            return typeof result === 'string' ? result : key;
        },
        [language],
    );

    return (
        <LanguageContext.Provider value={{ language, toggleLanguage, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within <LanguageProvider>');
    }
    return context;
}
