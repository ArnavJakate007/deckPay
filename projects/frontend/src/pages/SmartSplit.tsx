import React, { useState } from 'react';
import algosdk from 'algosdk';
import { useLanguage } from '../contexts/LanguageContext';
import { useWallet } from '../contexts/WalletContext';
import { getAlgodClient } from '../utils/network/getAlgoClientConfigs';
import { toast } from 'sonner';
import { IoReceipt, IoAddCircleOutline, IoPeopleOutline, IoCashOutline, IoCheckmarkCircleOutline, IoCamera, IoImage } from 'react-icons/io5';
import { parseBillImage } from '../utils/ai/gemini';

// Mock data types for UI demo
interface ExpenseGroup {
    id: number;
    title: string;
    totalAmount: number;
    members: number;
    yourShare: number;
    paid: boolean;
    deadline: string;
}

export default function SmartSplit() {
    const { t } = useLanguage();
    const { isConnected, connect, accountAddress, signAndSend } = useWallet();
    const [activeTab, setActiveTab] = useState<'create' | 'groups'>('groups');
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [members, setMembers] = useState('');
    const [deadline, setDeadline] = useState('');
    const [penalty, setPenalty] = useState('');

    // Mock groups data
    const [groups, setGroups] = useState<ExpenseGroup[]>([
        {
            id: 1,
            title: 'January Mess Bill',
            totalAmount: 6000,
            members: 4,
            yourShare: 1500,
            paid: false,
            deadline: '2026-02-15',
        },
        {
            id: 2,
            title: 'Goa Trip Deposit',
            totalAmount: 20000,
            members: 5,
            yourShare: 4000,
            paid: true,
            deadline: '2026-01-20',
        },
    ]);



    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isConnected) {
            toast.error(t('common.connect_first'));
            return;
        }

        if (!title || !amount || !members || !deadline) {
            toast.error('Please fill all required fields');
            return;
        }

        setLoading(true);
        const toastId = toast.loading(t('smartsplit.creating'));

        try {
            const algodClient = getAlgodClient();
            const suggestedParams = await algodClient.getTransactionParams().do();

            // Create Application Transaction (Mocking the schema for demo)
            const crypto = window.crypto;
            const randomBytes = new Uint8Array(2);
            crypto.getRandomValues(randomBytes);

            // In a real scenario, this would be the compiled approval/clear programs
            // For hackathon demo "build" completeness, we construct the txn
            const appCreateTxn = algosdk.makeApplicationCreateTxnFromObject({
                from: accountAddress!,
                suggestedParams,
                onComplete: algosdk.OnApplicationComplete.NoOpOC,
                approvalProgram: new Uint8Array([0x02, 0x20, 0x01, 0x01, 0x22]), // Simplified mock program
                clearProgram: new Uint8Array([0x02, 0x20, 0x01, 0x01, 0x22]),
                numGlobalByteSlices: 2,
                numGlobalInts: 2,
                numLocalByteSlices: 0,
                numLocalInts: 0,
                appArgs: [
                    new TextEncoder().encode("create"),
                    new TextEncoder().encode(title),
                    algosdk.encodeUint64(parseInt(members)),
                    algosdk.encodeUint64(Math.floor(parseFloat(amount) * 1000000))
                ],
            });

            const txIds = await signAndSend([appCreateTxn]);
            const txId = txIds[0];

            // Wait for confirmation
            await algosdk.waitForConfirmation(algodClient, txId, 4);

            const newGroup: ExpenseGroup = {
                id: Math.floor(Math.random() * 10000) + 10, // Mock ID as we can't get actual AppID easily without indexer waiting
                title,
                totalAmount: parseFloat(amount),
                members: parseInt(members),
                yourShare: parseFloat(amount) / parseInt(members),
                paid: false,
                deadline,
            };

            setGroups([newGroup, ...groups]);
            setActiveTab('groups');
            setLoading(false);
            toast.success(`Group Contract Deployed! TxID: ${txId.slice(0, 8)}...`, { id: toastId });

            // Reset form
            setTitle('');
            setAmount('');
            setMembers('');
            setDeadline('');
            setPenalty('');
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to create split contract: ' + error.message, { id: toastId });
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setScanning(true);
        const toastId = toast.loading('Analyzing bill with Gemini AI...');

        try {
            const details = await parseBillImage(file);

            if (details.total) setAmount(details.total.toString());
            if (details.items && details.items.length > 0) {
                // Auto-generate title from items or date
                const itemSummary = details.items.slice(0, 2).join(', ');
                setTitle(`Bill: ${itemSummary}${details.items.length > 2 ? '...' : ''}`);
            }
            if (details.date) setDeadline(details.date);

            toast.success('Bill scanned successfully!', { id: toastId });
        } catch (error: any) {
            console.error(error);
            toast.error(error.message, { id: toastId });
        } finally {
            setScanning(false);
        }
    };

    const handlePayShare = async (group: ExpenseGroup) => {
        if (!isConnected) {
            toast.error(t('common.connect_first'));
            return;
        }

        const toastId = toast.loading(`Paying ${group.yourShare} ALGO...`);

        try {
            const algodClient = getAlgodClient();
            const suggestedParams = await algodClient.getTransactionParams().do();

            // In reality, this would be the application account address
            // For demo, we send to a deterministic address or back to self (mocking contract interaction)
            // Using a dummy address that looks like an app account
            const mockAppAddress = algosdk.getApplicationAddress(group.id * 12345);

            const payTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                from: accountAddress!,
                to: mockAppAddress,
                amount: algosdk.algosToMicroalgos(group.yourShare),
                note: new TextEncoder().encode(`Pay share for ${group.title}`),
                suggestedParams,
            });

            // Note: In a real app, we'd use an Atomic Transaction (ApplicationCall + Payment)
            // For this hackathon demo, we demonstrate the payment component.

            const txIds = await signAndSend([payTxn]);
            const txId = txIds[0];

            await algosdk.waitForConfirmation(algodClient, txId, 4);

            const updatedGroups = groups.map(g =>
                g.id === group.id ? { ...g, paid: true } : g
            );
            setGroups(updatedGroups);
            toast.success(`Payment successful! TxID: ${txId.slice(0, 8)}...`, { id: toastId });
        } catch (error: any) {
            console.error(error);
            toast.error('Payment failed: ' + error.message, { id: toastId });
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div className="flex items-center gap-3 mb-2">
                    <div className="card-icon smartsplit">
                        <IoReceipt />
                    </div>
                    <h1>{t('smartsplit.title')}</h1>
                </div>
                <p>{t('smartsplit.subtitle')}</p>
            </div>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'groups' ? 'active' : ''}`}
                    onClick={() => setActiveTab('groups')}
                >
                    {t('smartsplit.your_groups')}
                </button>
                <button
                    className={`tab ${activeTab === 'create' ? 'active' : ''}`}
                    onClick={() => setActiveTab('create')}
                >
                    {t('smartsplit.create_group')}
                </button>
            </div>

            {activeTab === 'create' ? (
                <div className="card animate-fade-in-up stagger-1 max-w-2xl mx-auto">
                    <form onSubmit={handleCreateGroup}>
                        <div className="form-group">
                            <label className="form-label">{t('smartsplit.description')}</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={t('smartsplit.description_hint')}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>



                        {/* AI Scanning Section */}
                        {/* AI Scanning Hero Section */}
                        <div className="glass-panel p-8 mb-8 rounded-2xl text-center relative overflow-hidden group transition-all duration-500 hover:border-[var(--saffron)]/30">
                            <div className="absolute inset-0 bg-gradient-to-br from-[var(--saffron)]/5 to-[var(--green-india)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                            <div className="relative z-10">
                                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[var(--saffron)] to-[var(--saffron-dark)] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-[var(--shadow-glow-saffron)] transform group-hover:scale-110 transition-transform duration-300">
                                    <IoReceipt className="text-3xl text-white" />
                                </div>

                                <h3 className="text-xl font-bold mb-2 font-outfit">Scan & Split Instantly</h3>
                                <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
                                    Upload a receipt or snap a photo. Our AI will automatically extract items, totals, and dates.
                                </p>

                                <div className="flex justify-center gap-4">
                                    <label className="btn btn-outline border-[var(--border-light)] hover:border-[var(--saffron)] hover:bg-[var(--saffron)]/10 text-[var(--text-primary)] cursor-pointer">
                                        <IoImage className="mr-2" /> Upload Image
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                            disabled={scanning}
                                        />
                                    </label>
                                    <label className="btn btn-outline border-[var(--border-light)] hover:border-[var(--saffron)] hover:bg-[var(--saffron)]/10 text-[var(--text-primary)] cursor-pointer md:hidden">
                                        <IoCamera className="mr-2" /> Camera
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={handleFileUpload}
                                            disabled={scanning}
                                        />
                                    </label>
                                </div>

                                {scanning && (
                                    <div className="mt-6 flex flex-col items-center gap-2">
                                        <div className="spinner border-[var(--saffron)] border-t-transparent"></div>
                                        <p className="text-sm text-[var(--saffron)] animate-pulse font-medium">Analyzing receipt details...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">{t('smartsplit.total_amount')}</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    min="0"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('smartsplit.num_members')}</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    min="2"
                                    max="50"
                                    value={members}
                                    onChange={(e) => setMembers(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">{t('smartsplit.deadline')}</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('smartsplit.penalty')}</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    min="0"
                                    max="10"
                                    placeholder="0-10%"
                                    value={penalty}
                                    onChange={(e) => setPenalty(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-[var(--bg-secondary)] rounded-lg mb-6">
                            <div className="flex justify-between items-center text-sm font-medium">
                                <span className="text-[var(--text-secondary)]">Your Share:</span>
                                <span className="text-[var(--saffron-dark)] text-lg">
                                    {amount && members ? (parseFloat(amount) / parseInt(members)).toFixed(2) : '0.00'} ALGO
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-medium mt-2">
                                <span className="text-[var(--text-secondary)]">Contract Fee:</span>
                                <span className="text-[var(--success)]">0.002 ALGO (Standard)</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-full"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" /> {t('smartsplit.creating')}
                                </>
                            ) : (
                                <>
                                    <IoAddCircleOutline size={20} /> {t('smartsplit.create')}
                                </>
                            )}
                        </button>
                    </form>
                </div >
            ) : (
                <div className="space-y-4">
                    {groups.length > 0 ? (
                        groups.map((group, idx) => (
                            <div
                                key={group.id}
                                className={`card animate-fade-in-up stagger-${(idx % 4) + 1} flex flex-col md:flex-row md:items-center justify-between gap-4`}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-bold text-lg">{group.title}</h3>
                                        {group.paid ? (
                                            <span className="badge badge-success">
                                                <IoCheckmarkCircleOutline className="mr-1" /> Paid
                                            </span>
                                        ) : (
                                            <span className="badge badge-warning">Pending</span>
                                        )}
                                    </div>
                                    <div className="flex gap-4 text-sm text-[var(--text-muted)]">
                                        <span className="flex items-center gap-1">
                                            <IoPeopleOutline /> {group.members} Members
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <IoCashOutline /> Total: {group.totalAmount} ALGO
                                        </span>
                                        <span>Due: {group.deadline}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-[var(--bg-secondary)] pt-4 md:pt-0 md:pl-6 mt-2 md:mt-0">
                                    <div className="text-right">
                                        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">Your Share</div>
                                        <div className="text-xl font-bold text-[var(--text-primary)]">{group.yourShare.toFixed(2)} ALGO</div>
                                    </div>

                                    {!group.paid && (
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handlePayShare(group)}
                                        >
                                            Pay Now
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">
                            <IoReceipt className="empty-state-icon" />
                            <h3>{t('smartsplit.no_groups')}</h3>
                            <p>Create a group to start tracking shared expenses.</p>
                            <button
                                className="btn btn-primary mt-4"
                                onClick={() => setActiveTab('create')}
                            >
                                {t('smartsplit.create_group')}
                            </button>
                        </div>
                    )}
                </div>
            )
            }
        </div >
    );
}
