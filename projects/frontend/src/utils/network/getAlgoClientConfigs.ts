/**
 * Algorand Network Client Configuration
 * 
 * Reads environment variables to configure Algod and Indexer clients.
 * Supports both TestNet (via AlgoNode) and local sandbox (via KMD).
 */

import algosdk from 'algosdk';

export interface AlgoClientConfig {
    server: string;
    port: string | number;
    token: string;
    network: string;
}

/** Get Algod client config from Vite environment variables */
export function getAlgodConfig(): AlgoClientConfig {
    return {
        server: import.meta.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
        port: import.meta.env.VITE_ALGOD_PORT || '',
        token: import.meta.env.VITE_ALGOD_TOKEN || '',
        network: import.meta.env.VITE_ALGOD_NETWORK || 'testnet',
    };
}

/** Get Indexer client config from Vite environment variables */
export function getIndexerConfig(): AlgoClientConfig {
    return {
        server: import.meta.env.VITE_INDEXER_SERVER || 'https://testnet-idx.algonode.cloud',
        port: import.meta.env.VITE_INDEXER_PORT || '',
        token: import.meta.env.VITE_INDEXER_TOKEN || '',
        network: import.meta.env.VITE_ALGOD_NETWORK || 'testnet',
    };
}

/** Create and return an Algod client instance */
export function getAlgodClient(): algosdk.Algodv2 {
    const config = getAlgodConfig();
    return new algosdk.Algodv2(config.token, config.server, config.port);
}

/** Create and return an Indexer client instance */
export function getIndexerClient(): algosdk.Indexer {
    const config = getIndexerConfig();
    return new algosdk.Indexer(config.token, config.server, config.port);
}

/** Get the current network name (e.g., 'testnet', 'mainnet') */
export function getNetworkName(): string {
    return import.meta.env.VITE_ALGOD_NETWORK || 'testnet';
}

/** Get Algo Explorer URL for the current network */
export function getExplorerUrl(type: 'tx' | 'address' | 'asset' | 'app', id: string): string {
    const network = getNetworkName();
    const base = network === 'mainnet'
        ? 'https://explorer.perawallet.app'
        : 'https://testnet.explorer.perawallet.app';

    switch (type) {
        case 'tx': return `${base}/tx/${id}`;
        case 'address': return `${base}/address/${id}`;
        case 'asset': return `${base}/asset/${id}`;
        case 'app': return `${base}/application/${id}`;
        default: return base;
    }
}
