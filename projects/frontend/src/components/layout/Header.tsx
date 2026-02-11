import React from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { IoWalletOutline, IoLogOutOutline } from 'react-icons/io5';
import { SiAlgorand } from 'react-icons/si';

export default function Header() {
    const { isConnected, isConnecting, accountAddress, balance, connect, disconnect } = useWallet();
    const { language, toggleLanguage, t } = useLanguage();

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
    };

    return (
        <header className="header glass-panel" style={{ backdropFilter: 'blur(20px)', border: '1px solid var(--border-light)' }}>
            <div className="header-logo">
                <div className="token-mask" style={{
                    background: 'linear-gradient(135deg, var(--saffron), var(--green-india))',
                    padding: '8px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-glow-saffron)'
                }}>
                    <SiAlgorand className="text-white text-xl" />
                </div>
                <span style={{ fontWeight: 700, letterSpacing: '-1.5px' }}>DeckPay</span>
            </div>

            <div className="header-actions">
                {/* Language Toggle */}
                <div className="lang-toggle">
                    <button
                        className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                        onClick={() => language === 'hi' && toggleLanguage()}
                    >
                        EN
                    </button>
                    <button
                        className={`lang-btn ${language === 'hi' ? 'active' : ''}`}
                        onClick={() => language === 'en' && toggleLanguage()}
                    >
                        हिंदी
                    </button>
                </div>

                {/* Wallet Connection */}
                {isConnected && accountAddress ? (
                    <button
                        className="disconnect-btn"
                        onClick={disconnect}
                        aria-label={t('header.disconnect')}
                        title={t('header.disconnect')}
                    >
                        <IoLogOutOutline size={20} />
                        <span style={{ marginLeft: '8px', fontWeight: 600 }}>{t('header.disconnect')}</span>
                    </button>
                ) : (
                    <button
                        className="wallet-btn connect"
                        onClick={connect}
                        disabled={isConnecting}
                    >
                        <IoWalletOutline size={20} />
                        <span style={{ marginLeft: '8px' }}>{isConnecting ? t('header.connecting') : t('header.connect')}</span>
                    </button>
                )}
            </div>
        </header>
    );
}
