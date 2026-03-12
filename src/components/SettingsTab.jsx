import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import FlagIcon from './FlagIcon';

export default function SettingsTab() {
  const { language, setLanguage, languages, t } = useLanguage();

  return (
    <div className="page settings-page">
      <div className="page-header">
        <h1>{t('settings_header')}</h1>
        <p className="page-desc">{t('settings_desc')}</p>
      </div>

      <div className="card glass">
        <div className="card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          {t('settings_language')}
        </div>
        
        <div className="form-group" style={{ marginTop: '10px' }}>
          <label className="form-label" style={{ marginBottom: '16px', display: 'block' }}>
            {t('settings_language_desc')}
          </label>
          
          <div className="lang-grid">
            {languages.map((lang) => (
              <div
                key={lang.code}
                className={`lang-button ${language === lang.code ? 'active' : ''}`}
                onClick={() => setLanguage(lang.code)}
              >
                <div className="lang-check">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div className="lang-flag-wrapper">
                  <FlagIcon code={lang.code} className="lang-flag-svg" />
                </div>
                <span className="lang-name">{lang.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <footer className="about-footer">
        <p>© 2026 LogScope Analysis Suite — Technical Division.</p>
      </footer>
    </div>
  );
}
