import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    IoHomeOutline,
    IoFlashOutline,
    IoReceiptOutline,
    IoTicketOutline,
    IoHeartOutline,
    IoStatsChartOutline,
} from 'react-icons/io5';

export default function Sidebar() {
    const { t } = useLanguage();

    const navItems = [
        { path: '/', icon: IoHomeOutline, label: t('nav.home') },
        { path: '/instapay', icon: IoFlashOutline, label: t('nav.instapay') },
        { path: '/smartsplit', icon: IoReceiptOutline, label: t('nav.smartsplit') },
        { path: '/fairticket', icon: IoTicketOutline, label: t('nav.fairticket') },
        { path: '/clearfund', icon: IoHeartOutline, label: t('nav.clearfund') },
        { path: '/dashboard', icon: IoStatsChartOutline, label: t('nav.dashboard') },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-section-label" style={{ opacity: 0.5, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Menu</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: 0 }}>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        <span className="nav-link-icon">
                            <item.icon />
                        </span>
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}
