import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
    IoBarChart,
    IoWalletOutline,
    IoArrowUpCircleOutline,
    IoArrowDownCircleOutline,
    IoTimeOutline,
    IoTicketOutline,
    IoPeopleOutline
} from 'react-icons/io5';
import { useWallet } from '../contexts/WalletContext';

export default function Dashboard() {
    const { t } = useLanguage();
    const { balance, accountAddress } = useWallet();

    const recentTransactions = [
        { id: 1, type: 'sent', amount: '5.00', to: 'VIT...X4A2', date: '2026-02-11', status: 'completed' },
        { id: 2, type: 'received', amount: '10.50', from: 'DEP...Q9W1', date: '2026-02-10', status: 'completed' },
        { id: 3, type: 'split', amount: '2.25', group: 'Cafeteria Lunch', date: '2026-02-09', status: 'pending' },
        { id: 4, type: 'ticket', amount: '1.00', event: 'Campus NFT Drop', date: '2026-02-08', status: 'completed' },
    ];

    const spendingData = [
        { day: 'Mon', value: 40 },
        { day: 'Tue', value: 65 },
        { day: 'Wed', value: 30 },
        { day: 'Thu', value: 85 },
        { day: 'Fri', value: 45 },
        { day: 'Sat', value: 90 },
        { day: 'Sun', value: 20 },
    ];

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
            <div className="page-header">
                <div className="flex items-center gap-3 mb-2" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="card-icon" style={{
                        background: 'linear-gradient(135deg, var(--saffron), #0070f3)',
                        padding: '12px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '24px'
                    }}>
                        <IoBarChart />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '32px', marginBottom: '4px' }}>{t('dashboard.title')}</h1>
                        <p style={{ opacity: 0.7 }}>{t('dashboard.subtitle')}</p>
                    </div>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="stats-grid animate-fade-in-up stagger-1" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
            }}>
                <div className="card" style={{ padding: '24px', borderLeft: '4px solid #0070f3' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                        <div style={{ opacity: 0.6, fontSize: '14px', fontWeight: 600 }}>AVAILABLE BALANCE</div>
                        <IoWalletOutline size={22} style={{ color: '#0070f3' }} />
                    </div>
                    <div style={{ fontSize: '36px', fontWeight: 800, marginBottom: '5px' }}>{balance.toFixed(2)}</div>
                    <div style={{ opacity: 0.5, fontSize: '12px' }}>ALGO (MainNet)</div>
                </div>

                <div className="card" style={{ padding: '24px', borderLeft: '4px solid var(--saffron)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                        <div style={{ opacity: 0.6, fontSize: '14px', fontWeight: 600 }}>MONTHLY SPENT</div>
                        <IoArrowUpCircleOutline size={22} style={{ color: 'var(--saffron)' }} />
                    </div>
                    <div style={{ fontSize: '36px', fontWeight: 800, marginBottom: '5px' }}>142.50</div>
                    <div style={{ opacity: 0.5, fontSize: '12px' }}>ALGO (+12% from last month)</div>
                </div>

                <div className="card" style={{ padding: '24px', borderLeft: '4px solid #00B894' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                        <div style={{ opacity: 0.6, fontSize: '14px', fontWeight: 600 }}>PENDING SPLITS</div>
                        <IoPeopleOutline size={22} style={{ color: '#00B894' }} />
                    </div>
                    <div style={{ fontSize: '36px', fontWeight: 800, marginBottom: '5px' }}>3</div>
                    <div style={{ opacity: 0.5, fontSize: '12px' }}>Awating settlement</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>
                {/* Spending Trends Chart */}
                <div className="card animate-fade-in-up stagger-2" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px' }}>Spending Trends</h3>
                        <IoTimeOutline style={{ opacity: 0.5 }} />
                    </div>
                    <div style={{
                        height: '200px',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between',
                        gap: '10px',
                        padding: '0 10px'
                    }}>
                        {spendingData.map((data) => (
                            <div key={data.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    width: '100%',
                                    height: `${data.value}%`,
                                    background: 'linear-gradient(to top, #0070f3, #00CFFF)',
                                    borderRadius: '4px 4px 0 0',
                                    transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}></div>
                                <span style={{ fontSize: '10px', opacity: 0.6, fontWeight: 700 }}>{data.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity List */}
                <div className="card animate-fade-in-up stagger-3" style={{ padding: '24px' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px' }}>Recent Activity</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {recentTransactions.map((tx) => (
                            <div key={tx.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        padding: '8px',
                                        borderRadius: '8px',
                                        background: tx.type === 'received' ? 'rgba(0,184,148,0.1)' : 'rgba(255,77,0,0.1)',
                                        color: tx.type === 'received' ? '#00B894' : '#FF4D00'
                                    }}>
                                        {tx.type === 'received' ? <IoArrowDownCircleOutline size={18} /> : <IoArrowUpCircleOutline size={18} />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>
                                            {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} {tx.type === 'sent' ? 'to' : tx.type === 'received' ? 'from' : ''} {tx.to || tx.from || tx.group || tx.event}
                                        </div>
                                        <div style={{ opacity: 0.5, fontSize: '12px' }}>{tx.date}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{
                                        fontWeight: 800,
                                        color: tx.type === 'received' ? '#00B894' : 'var(--text-primary)'
                                    }}>
                                        {tx.type === 'received' ? '+' : '-'}{tx.amount}
                                    </div>
                                    <div style={{
                                        fontSize: '10px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        color: tx.status === 'completed' ? '#00B894' : '#F1C40F'
                                    }}>
                                        {tx.status}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button style={{
                        width: '100%',
                        marginTop: '20px',
                        padding: '10px',
                        background: 'transparent',
                        border: '1px solid var(--border-light)',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        opacity: 0.7
                    }}>View All Transactions</button>
                </div>
            </div>
        </div>
    );
}
