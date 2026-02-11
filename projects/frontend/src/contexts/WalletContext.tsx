/**
 * Wallet Context — Pera Wallet Integration
 * 
 * Provides connect/disconnect/sign functionality for the Pera Wallet.
 * Uses the @perawallet/connect SDK for WalletConnect-based flow.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { PeraWalletConnect } from '@perawallet/connect';
import algosdk from 'algosdk';
import { getAlgodClient } from '../utils/network/getAlgoClientConfigs';

interface WalletContextType {
    /** Connected account address (null if not connected) */
    accountAddress: string | null;
    /** Account balance in ALGO (not microALGO) */
    balance: number;
    /** Whether a wallet is currently connected */
    isConnected: boolean;
    /** Whether a connection attempt is in progress */
    isConnecting: boolean;
    /** Connect to Pera Wallet */
    connect: () => Promise<void>;
    /** Disconnect from Pera Wallet */
    disconnect: () => void;
    /** Refresh the account balance */
    refreshBalance: () => Promise<void>;
    /** Sign and send transactions */
    signAndSend: (txns: algosdk.Transaction[]) => Promise<string[]>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const peraWallet = new PeraWalletConnect();

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const [accountAddress, setAccountAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState(0);
    const [isConnecting, setIsConnecting] = useState(false);

    const algodClient = getAlgodClient();

    const fetchBalance = useCallback(async (address: string) => {
        try {
            const accountInfo = await algodClient.accountInformation(address).do();
            // algosdk v2 returns amount in microALGO
            const microAlgo = typeof accountInfo.amount === 'number'
                ? accountInfo.amount
                : Number(accountInfo['amount']);
            setBalance(microAlgo / 1_000_000);
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
    }, []);

    const handleDisconnect = useCallback(() => {
        setAccountAddress(null);
        setBalance(0);
    }, []);

    useEffect(() => {
        // Reconnect if session exists from previous visit
        peraWallet
            .reconnectSession()
            .then((accounts) => {
                peraWallet.connector?.on('disconnect', handleDisconnect);
                if (accounts.length) {
                    setAccountAddress(accounts[0]);
                    fetchBalance(accounts[0]);
                }
            })
            .catch((e) => {
                // No previous session, that's fine
                console.log('No previous session:', e);
            });
    }, [fetchBalance, handleDisconnect]);

    const connect = async () => {
        setIsConnecting(true);
        try {
            const accounts = await peraWallet.connect();
            peraWallet.connector?.on('disconnect', handleDisconnect);
            setAccountAddress(accounts[0]);
            await fetchBalance(accounts[0]);
        } catch (error) {
            console.error('Connection error:', error);
            throw error;
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnect = () => {
        peraWallet.disconnect();
        handleDisconnect();
    };

    const refreshBalance = async () => {
        if (accountAddress) {
            await fetchBalance(accountAddress);
        }
    };

    const signAndSend = async (txns: algosdk.Transaction[]): Promise<string[]> => {
        if (!accountAddress) {
            throw new Error('Wallet not connected');
        }

        const txnsToSign = txns.map((txn) => ({
            txn: txn,
            message: 'Sign transaction for CampusPay',
        }));

        // Pera Wallet expects grouped transactions to be signed together
        const signedTxns = await peraWallet.signTransaction([txnsToSign]);

        // Send signed transactions to network
        const txIds: string[] = [];

        for (const signedTxnGroup of signedTxns) {
            // Send raw transaction
            const { txId } = await algodClient.sendRawTransaction(signedTxnGroup).do();
            txIds.push(txId);
        }

        return txIds;
    };

    return (
        <WalletContext.Provider
            value={{
                accountAddress,
                balance,
                isConnected: !!accountAddress,
                isConnecting,
                connect,
                disconnect,
                refreshBalance,
                signAndSend,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within <WalletProvider>');
    }
    return context;
}
