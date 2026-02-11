import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
    IoFlash,
    IoReceipt,
    IoTicket,
    IoHeart,
    IoTrendingUp,
} from 'react-icons/io5';

export default function Home() {
    const { isConnected, connect } = useWallet();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const handleCardClick = (path: string) => {
        if (!isConnected) {
            connect();
        } else {
            navigate(path);
        }
    };

    return (
        <div className="animate-fade-in">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-badge animate-fade-in-up">{t('home.badge')}</div>
                <h1 className="animate-fade-in-up stagger-1">
                    {t('home.title_1')}{' '}
                    <span className="gradient-text">{t('home.title_2')}</span>
                </h1>
                <p className="animate-fade-in-up stagger-2">{t('home.subtitle')}</p>

                <div className="hero-actions animate-fade-in-up stagger-3">
                    {!isConnected ? (
                        <button className="btn btn-primary btn-lg" onClick={connect}>
                            {t('home.cta_primary')}
                        </button>
                    ) : (
                        <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
                            Go to Dashboard
                        </button>
                    )}
                    <button className="btn btn-secondary btn-lg" onClick={() => {
                        document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                    }}>
                        {t('home.cta_secondary')}
                    </button>
                </div>
            </section>

            {/* Stats Section */}
            <section className="stats-grid animate-fade-in-up stagger-4">
                <div className="stat-card">
                    <div className="stat-value">{t('home.stat_fee')}</div>
                    <div className="stat-label">{t('home.stat_fee_label')}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{t('home.stat_speed')}</div>
                    <div className="stat-label">{t('home.stat_speed_label')}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{t('home.stat_saving')}</div>
                    <div className="stat-label">{t('home.stat_saving_label')}</div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="features-grid">
                <div
                    className="feature-card animate-slide-in stagger-1"
                    data-feature="instapay"
                    onClick={() => handleCardClick('/instapay')}
                >
                    <div className="feature-icon">
                        <IoFlash />
                    </div>
                    <h3>{t('instapay.title')}</h3>
                    <p>{t('instapay.subtitle')}</p>
                    <span className="feature-tag">Micro-transactions</span>
                </div>

                <div
                    className="feature-card animate-slide-in stagger-2"
                    data-feature="smartsplit"
                    onClick={() => handleCardClick('/smartsplit')}
                >
                    <div className="feature-icon">
                        <IoReceipt />
                    </div>
                    <h3>{t('smartsplit.title')}</h3>
                    <p>{t('smartsplit.subtitle')}</p>
                    <span className="feature-tag">Smart Escrow</span>
                </div>

                <div
                    className="feature-card animate-slide-in stagger-3"
                    data-feature="fairticket"
                    onClick={() => handleCardClick('/fairticket')}
                >
                    <div className="feature-icon">
                        <IoTicket />
                    </div>
                    <h3>{t('fairticket.title')}</h3>
                    <p>{t('fairticket.subtitle')}</p>
                    <span className="feature-tag">NFT Tickets</span>
                </div>

                <div
                    className="feature-card animate-slide-in stagger-4"
                    data-feature="clearfund"
                    onClick={() => handleCardClick('/clearfund')}
                >
                    <div className="feature-icon">
                        <IoHeart />
                    </div>
                    <h3>{t('clearfund.title')}</h3>
                    <p>{t('clearfund.subtitle')}</p>
                    <span className="feature-tag">Transparent Logic</span>
                </div>
            </section>
        </div>
    );
}
