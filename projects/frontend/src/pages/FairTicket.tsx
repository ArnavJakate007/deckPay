import React, { useState } from 'react';
import algosdk from 'algosdk';
import { useLanguage } from '../contexts/LanguageContext';
import { useWallet } from '../contexts/WalletContext';
import { getAlgodClient } from '../utils/network/getAlgoClientConfigs';
import { toast } from 'sonner';
import { IoTicket, IoCalendarOutline, IoLocationOutline, IoQrCodeOutline } from 'react-icons/io5';

// Mock data types for UI demo
interface Event {
    id: number;
    name: string;
    description: string;
    price: number;
    date: string;
    location: string;
    image: string;
    isSoulbound: boolean;
    sold: number;
    total: number;
}

export default function FairTicket() {
    const { t } = useLanguage();
    const { isConnected, accountAddress, signAndSend } = useWallet();
    const [activeTab, setActiveTab] = useState<'events' | 'create'>('events');
    const [loading, setLoading] = useState(false);

    // Mock events data
    const [events, setEvents] = useState<Event[]>([
        {
            id: 1,
            name: 'Campus Token Exchange',
            description: 'The official peer-to-peer token trading hub for DeckPay users. Secondary market for event tickets and custom ASAs.',
            price: 1,
            date: 'Live 24/7',
            location: 'DeckPay DEX Hub',
            image: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            isSoulbound: false,
            sold: 5240,
            total: 10000,
        },
        {
            id: 2,
            name: 'Exclusive Deck NFT Drop',
            description: 'Redeem your loyalty points for limited edition Soulbound NFTs. Proof of membership for elite campus clubs.',
            price: 10,
            date: 'Ending soon',
            location: 'DeckPay Vault',
            image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            isSoulbound: true, // Loyalty drops are soulbound
            sold: 950,
            total: 1000,
        },
    ]);

    const handleBuyTicket = (event: Event) => {
        if (!isConnected) {
            toast.error(t('common.connect_first'));
            return;
        }

        const toastId = toast.loading(`Minting NFT Ticket for ${event.price} ALGO...`);

        setTimeout(() => {
            toast.success('Ticket minted successfully! Check your wallet.', { id: toastId });
            // Update sold count locally
            const updatedEvents = events.map(e =>
                e.id === event.id ? { ...e, sold: e.sold + 1 } : e
            );
            setEvents(updatedEvents);
        }, 2500);
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div className="flex items-center gap-3 mb-2">
                    <div className="card-icon fairticket">
                        <IoTicket />
                    </div>
                    <h1>{t('fairticket.title')}</h1>
                </div>
                <p>{t('fairticket.subtitle')}</p>
            </div>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'events' ? 'active' : ''}`}
                    onClick={() => setActiveTab('events')}
                >
                    {t('fairticket.events')}
                </button>
                <button
                    className={`tab ${activeTab === 'create' ? 'active' : ''}`}
                    onClick={() => setActiveTab('create')}
                >
                    {t('fairticket.create_event')}
                </button>
            </div>

            {activeTab === 'create' ? (
                <div className="card animate-fade-in-up stagger-1 max-w-2xl mx-auto">
                    <div className="text-center p-8 bg-[var(--bg-secondary)] rounded-lg border-2 border-dashed border-[var(--text-muted)]">
                        <h3 className="font-bold text-lg mb-2">Organizer Mode</h3>
                        <p className="text-[var(--text-muted)] mb-4">
                            Create an event, set ticket supply, and enable anti-scalping (soulbound) NFTs.
                        </p>
                        <button className="btn btn-primary" onClick={() => toast('Event creation logic would go here')}>
                            Deploy Ticketing Contract
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid-3">
                    {events.map((event, idx) => (
                        <div key={event.id} className={`card p-0 overflow-hidden animate-fade-in-up stagger-${(idx % 3) + 1}`}>
                            <div className="h-48 overflow-hidden relative">
                                <img src={event.image} alt={event.name} className="w-full h-full object-cover transition-transform hover:scale-105 duration-500" />
                                <div className="absolute top-3 right-3">
                                    {event.isSoulbound ? (
                                        <span className="badge badge-info bg-white/90 backdrop-blur-sm shadow-sm">
                                            Anti-Scalping Enabled
                                        </span>
                                    ) : (
                                        <span className="badge badge-warning bg-white/90 backdrop-blur-sm shadow-sm">
                                            Resalable
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="p-5">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-xl">{event.name}</h3>
                                    <div className="text-lg font-bold text-[var(--saffron-dark)]">
                                        {event.price} ALGO
                                    </div>
                                </div>

                                <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">
                                    {event.description}
                                </p>

                                <div className="space-y-2 mb-4 text-sm text-[var(--text-muted)]">
                                    <div className="flex items-center gap-2">
                                        <IoCalendarOutline /> {event.date}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <IoLocationOutline /> {event.location}
                                    </div>
                                </div>

                                <div className="progress-bar mb-2 h-2">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${(event.sold / event.total) * 100}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-[var(--text-muted)] mb-4">
                                    <span>{event.sold} sold</span>
                                    <span>{event.total} total</span>
                                </div>

                                <button
                                    className="btn btn-primary btn-full"
                                    onClick={() => handleBuyTicket(event)}
                                >
                                    <IoQrCodeOutline size={18} /> Buy NFT Ticket
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
