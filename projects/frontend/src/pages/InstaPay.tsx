import React, { useState } from 'react';
import algosdk from 'algosdk';
import { toast } from 'sonner';
import { useWallet } from '../contexts/WalletContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getAlgodClient } from '../utils/network/getAlgoClientConfigs';
import { IoFlash, IoPaperPlane, IoTimeOutline, IoCheckmarkCircle } from 'react-icons/io5';

interface Transaction {
    id: string;
    recipient: string;
    amount: number;
    date: string;
    note?: string;
}

export default function InstaPay() {
    const { accountAddress, isConnected, signAndSend, refreshBalance } = useWallet();
    const { t } = useLanguage();
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountAddress || !isConnected) {
            toast.error(t('common.connect_first'));
            return;
        }

        if (!algosdk.isValidAddress(recipient)) {
            toast.error('Invalid recipient address');
            return;
        }

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error('Invalid amount');
            return;
        }

        setLoading(true);
        const toastId = toast.loading(t('instapay.sending'));

        try {
            const algodClient = getAlgodClient();
            const suggestedParams = await algodClient.getTransactionParams().do();

            const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                from: accountAddress,
                to: recipient,
                amount: algosdk.algosToMicroalgos(amountNum),
                note: new TextEncoder().encode(note),
                suggestedParams,
            });

            const txIds = await signAndSend([txn]);
            const txId = txIds[0];

            // Wait for confirmation (simplified for UI responsiveness)
            await algosdk.waitForConfirmation(algodClient, txId, 4);

            toast.success(t('instapay.success'), { id: toastId });
            setOpState('success');
            refreshBalance();

            // Add to local history
            const newTx: Transaction = {
                id: txId,
                recipient,
                amount: amountNum,
                date: new Date().toLocaleTimeString(),
                note,
            };
            setRecentTxns([newTx, ...recentTxns]);

            // Reset form
            setAmount('');
            setNote('');
        } catch (error: any) {
            console.error(error);
            toast.error(t('instapay.error'), { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const [opState, setOpState] = useState<'idle' | 'success'>('idle');

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div className="flex items-center gap-3 mb-2">
                    <div className="card-icon instapay">
                        <IoFlash />
                    </div>
                    <h1>{t('instapay.title')}</h1>
                </div>
                <p>{t('instapay.subtitle')}</p>
            </div>

            <div className="grid-2">
                {/* Payment Form */}
                <div className="card animate-fade-in-up stagger-1">
                    <form onSubmit={handleSend}>
                        <div className="form-group">
                            <label className="form-label">{t('instapay.recipient')}</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={t('instapay.recipient_hint')}
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">{t('instapay.amount')}</label>
                            <input
                                type="number"
                                step="0.001"
                                min="0.001"
                                className="form-input"
                                placeholder={t('instapay.amount_hint')}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">{t('instapay.note')}</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={t('instapay.note_hint')}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-full"
                            disabled={loading || !isConnected}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" /> {t('instapay.sending')}
                                </>
                            ) : (
                                <>
                                    <IoPaperPlane /> {t('instapay.send')}
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Recent Transactions */}
                <div className="card animate-fade-in-up stagger-2">
                    <div className="card-header">
                        <h3 className="card-title">{t('instapay.history')}</h3>
                    </div>

                    {recentTxns.length > 0 ? (
                        <ul className="tx-list">
                            {recentTxns.map((tx) => (
                                <li key={tx.id} className="tx-item animate-slide-in">
                                    <div className="tx-left">
                                        <div className="tx-avatar sent">
                                            <IoFlash />
                                        </div>
                                        <div className="tx-info">
                                            <h4>To: {tx.recipient.slice(0, 4)}...{tx.recipient.slice(-4)}</h4>
                                            <p>{tx.date} • {tx.note || 'No note'}</p>
                                        </div>
                                    </div>
                                    <div className="tx-amount negative">
                                        -{tx.amount} ALGO
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="empty-state">
                            <IoTimeOutline className="empty-state-icon" />
                            <h3>{t('instapay.no_history')}</h3>
                            <p>Your recent transactions will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
