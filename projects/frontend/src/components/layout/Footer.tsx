import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SiAlgorand } from 'react-icons/si';

export default function Footer() {
    const { t } = useLanguage();

    return (
        <footer className="footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span>{t('footer.built_with')}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.8 }}>
                    <span>{t('footer.powered_by')}</span>
                    <SiAlgorand size={14} className="text-white" />
                    <a href="https://algorand.co" target="_blank" rel="noopener noreferrer">
                        {t('footer.algorand')}
                    </a>
                </div>
                <span style={{ opacity: 0.5 }}>|</span>
                <span>© 2026 DeckPay 🎴</span>
            </div>
        </footer>
    );
}
