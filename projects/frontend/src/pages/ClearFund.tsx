import React, { useState } from 'react';
import algosdk from 'algosdk';
import { useLanguage } from '../contexts/LanguageContext';
import { useWallet } from '../contexts/WalletContext';
import { getAlgodClient } from '../utils/network/getAlgoClientConfigs';
import { toast } from 'sonner';
import { IoHeart, IoRocketOutline, IoShieldCheckmarkOutline, IoTimeOutline } from 'react-icons/io5';

// Mock data
interface Campaign {
    id: number;
    title: string;
    description: string;
    goal: number;
    raised: number;
    milestones: number;
    currentMilestone: number;
    deadline: string;
    creator: string;
}

export default function ClearFund() {
    const { t } = useLanguage();
    const { isConnected, accountAddress, signAndSend } = useWallet();
    const [activeTab, setActiveTab] = useState<'campaigns' | 'create'>('campaigns');

    const [campaigns, setCampaigns] = useState<Campaign[]>([
        {
            id: 1,
            title: 'Solar Panels for Hostel 5',
            description: 'Installing 50kW solar capacity to reduce carbon footprint and electricity bills. Funds released in 3 phases: Procurement, Installation, Commissioning.',
            goal: 5000,
            raised: 3250,
            milestones: 3,
            currentMilestone: 1,
            deadline: '2026-06-30',
            creator: 'NSS IITB',
        },
        {
            id: 2,
            title: 'Rural Education Drive',
            description: 'Providing tablets and internet access to 200 students in nearby villages. Transparent fund usage tracked on-chain.',
            goal: 2000,
            raised: 450,
            milestones: 2,
            currentMilestone: 0,
            deadline: '2026-05-15',
            creator: 'Abhyuday Club',
        },
    ]);

    const handleDonate = async (campaign: Campaign) => {
        if (!isConnected || !accountAddress) {
            toast.error(t('common.connect_first'));
            return;
        }

        const toastId = toast.loading(`Donating 10 ALGO to ${campaign.title}...`);

        try {
            const algodClient = getAlgodClient();
            const suggestedParams = await algodClient.getTransactionParams().do();

            // Send donation to campaign contract/escrow
            const donationTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                from: accountAddress,
                to: algosdk.getApplicationAddress(campaign.id * 999), // Mock App Account
                amount: algosdk.algosToMicroalgos(10), // Hardcoded 10 ALGO for demo
                note: new TextEncoder().encode(`Donation to ${campaign.title}`),
                suggestedParams,
            });

            const txIds = await signAndSend([donationTxn]);
            const txId = txIds[0];

            await algosdk.waitForConfirmation(algodClient, txId, 4);

            const updated = campaigns.map(c =>
                c.id === campaign.id ? { ...c, raised: c.raised + 10 } : c
            );
            setCampaigns(updated);
            toast.success(`Donation confirmed! TxID: ${txId.slice(0, 8)}...`, { id: toastId });
        } catch (error: any) {
            console.error(error);
            toast.error('Donation failed: ' + error.message, { id: toastId });
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div className="flex items-center gap-3 mb-2">
                    <div className="card-icon clearfund">
                        <IoHeart />
                    </div>
                    <h1>{t('clearfund.title')}</h1>
                </div>
                <p>{t('clearfund.subtitle')}</p>
            </div>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'campaigns' ? 'active' : ''}`}
                    onClick={() => setActiveTab('campaigns')}
                >
                    {t('clearfund.campaigns')}
                </button>
                <button
                    className={`tab ${activeTab === 'create' ? 'active' : ''}`}
                    onClick={() => setActiveTab('create')}
                >
                    {t('clearfund.create_campaign')}
                </button>
            </div>

            {activeTab === 'create' ? (
                <div className="card animate-fade-in-up stagger-1 max-w-2xl mx-auto text-center p-10">
                    <IoRocketOutline size={48} className="mx-auto text-[var(--clearfund)] mb-4" />
                    <h3 className="text-xl font-bold mb-2">Launch a Cause</h3>
                    <p className="text-[var(--text-secondary)] mb-6">
                        Start a fundraising campaign with milestone-based escrow. Build trust with donors by proving funds are only released when goals are met.
                    </p>
                    <button className="btn btn-primary" onClick={() => toast('Campaign creation logic')}>
                        Create Campaign Contract
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {campaigns.map((campaign, idx) => (
                        <div key={campaign.id} className={`card animate-fade-in-up stagger-${(idx % 3) + 1}`}>
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="text-xs font-bold text-[var(--clearfund)] uppercase tracking-wider mb-1 block">
                                                by {campaign.creator}
                                            </span>
                                            <h3 className="text-xl font-bold">{campaign.title}</h3>
                                        </div>
                                        {campaign.raised >= campaign.goal && (
                                            <span className="badge badge-success">Fully Funded</span>
                                        )}
                                    </div>

                                    <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
                                        {campaign.description}
                                    </p>

                                    <div className="flex gap-4 text-sm text-[var(--text-muted)] mb-4">
                                        <span className="flex items-center gap-1">
                                            <IoShieldCheckmarkOutline /> {campaign.milestones} Milestones
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <IoTimeOutline /> Deadline: {campaign.deadline}
                                        </span>
                                    </div>

                                    {/* Milestone Tracker */}
                                    <div className="milestone-tracker">
                                        {[...Array(campaign.milestones)].map((_, i) => (
                                            <React.Fragment key={i}>
                                                <div className={`milestone-dot ${i < campaign.currentMilestone ? 'completed' : i === campaign.currentMilestone ? 'active' : ''}`}>
                                                    {i + 1}
                                                </div>
                                                {i < campaign.milestones - 1 && (
                                                    <div className={`milestone-line ${i < campaign.currentMilestone ? 'completed' : ''}`} />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                    <div className="text-xs text-[var(--text-muted)] mt-1 mb-4">
                                        Current Phase: {campaign.currentMilestone === 0 ? 'Project Start' : `Milestone ${campaign.currentMilestone} Active`}
                                    </div>
                                </div>

                                <div className="md:w-64 flex flex-col justify-center bg-[var(--bg-secondary)] p-6 rounded-xl">
                                    <div className="mb-2 flex justify-between items-end">
                                        <span className="text-2xl font-bold text-[var(--text-primary)]">{campaign.raised}</span>
                                        <span className="text-sm font-medium text-[var(--text-muted)] mb-1">of {campaign.goal} ALGO</span>
                                    </div>

                                    <div className="progress-bar h-3 mb-4 bg-white">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${Math.min((campaign.raised / campaign.goal) * 100, 100)}%` }}
                                        />
                                    </div>

                                    <button
                                        className="btn btn-primary btn-full shadow-lg"
                                        onClick={() => handleDonate(campaign)}
                                    >
                                        Donate Now
                                    </button>
                                    <p className="text-xs text-center mt-3 text-[var(--text-muted)]">
                                        Funds held in smart contract escrow
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
