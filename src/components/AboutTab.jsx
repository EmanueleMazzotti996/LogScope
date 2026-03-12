import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const AboutTab = () => {
    const { t } = useLanguage();
    return (
        <div className="page about-page">
            <div className="page-header">
                <h1>{t('about_header')}</h1>
                <p className="page-desc">{t('about_desc')}</p>
            </div>

            <div className="about-grid-3">
                <div className="card about-card glass">
                    <div className="about-icon">📁</div>
                    <h3>{t('about_acq_title')}</h3>
                    <p>{t('about_acq_desc')}</p>
                </div>

                <div className="card about-card glass">
                    <div className="about-icon">📊</div>
                    <h3>{t('about_analysis_title')}</h3>
                    <p>{t('about_analysis_desc')}</p>
                </div>

                <div className="card about-card glass">
                    <div className="about-icon">🧭</div>
                    <h3>{t('about_nav_title')}</h3>
                    <p>{t('about_nav_desc')}</p>
                </div>
            </div>

            <footer className="about-footer">
                <p>{t('about_footer')}</p>
            </footer>
        </div>
    );
};

export default AboutTab;
