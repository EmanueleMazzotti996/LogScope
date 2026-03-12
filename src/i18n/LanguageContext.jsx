import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from './translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  // Persistence: read from localStorage or default to 'it'
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('logscope_language');
    return saved || 'it';
  });

  const localeMap = {
    it: 'it-IT',
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    pt: 'pt-PT'
  };

  const currentLocale = localeMap[language] || 'en-US';

  // Save to localStorage when language changes
  useEffect(() => {
    localStorage.setItem('logscope_language', language);
  }, [language]);

  const t = useCallback((key, params = {}) => {
    const translation = translations[language]?.[key] || key;
    
    // Replace placeholders like {count}
    if (typeof translation !== 'string') return translation;
    
    let text = translation;
    Object.keys(params).forEach(p => {
      text = text.replace(`{${p}}`, params[p]);
    });
    
    return text;
  }, [language]);

  const value = {
    language,
    setLanguage,
    t,
    languages: [
      { code: 'it', name: 'Italiano' },
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español' },
      { code: 'fr', name: 'Français' },
      { code: 'de', name: 'Deutsch' },
      { code: 'pt', name: 'Português' },
    ],
    locale: currentLocale
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
