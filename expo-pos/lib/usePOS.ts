/**
 * POS Operations Hook for Venus POS
 * ==================================
 * Provides POS-specific operations: SKUs, sales, store selection
 */

import { useState, useCallback } from 'react';
import { api, SKUWithPrice, SaleCreate, Sale, StorePriceResponse, ApiError } from './api';
import { useAuth } from './useAuth';

interface UsePOSReturn {
    // State
    skus: SKUWithPrice[];
    activeStoreId: number | null;
    isLoadingSKUs: boolean;
    isCreatingSale: boolean;
    error: string | null;
    lastSale: Sale | null;

    // Actions
    setActiveStore: (storeId: number) => void;
    fetchSKUs: () => Promise<void>;
    createSale: (sale: Omit<SaleCreate, 'store_id' | 'sale_type'>) => Promise<Sale>;
    clearError: () => void;
    clearLastSale: () => void;
}

export function usePOS(): UsePOSReturn {
    const { storeIds, hasPermission } = useAuth();

    const [skus, setSKUs] = useState<SKUWithPrice[]>([]);
    const [activeStoreId, setActiveStoreId] = useState<number | null>(
        storeIds.length === 1 ? storeIds[0] : null
    );
    const [isLoadingSKUs, setIsLoadingSKUs] = useState(false);
    const [isCreatingSale, setIsCreatingSale] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastSale, setLastSale] = useState<Sale | null>(null);

    const setActiveStore = useCallback((storeId: number) => {
        if (storeIds.includes(storeId)) {
            setActiveStoreId(storeId);
            setSKUs([]); // Clear SKUs when store changes
        } else {
            setError('Access denied to this store');
        }
    }, [storeIds]);

    const fetchSKUs = useCallback(async () => {
        if (!activeStoreId) {
            setError('No store selected');
            return;
        }

        setIsLoadingSKUs(true);
        setError(null);

        try {
            const response: StorePriceResponse = await api.getStorePrices(activeStoreId);
            // Filter only SKUs with prices set
            setSKUs(response.items.filter(sku => sku.current_price !== null));
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message || 'Failed to load products');
            setSKUs([]);
        } finally {
            setIsLoadingSKUs(false);
        }
    }, [activeStoreId]);

    const createSale = useCallback(async (
        saleData: Omit<SaleCreate, 'store_id' | 'sale_type'>
    ): Promise<Sale> => {
        if (!activeStoreId) {
            throw new Error('No store selected');
        }

        if (!hasPermission('sales.create')) {
            throw new Error('You do not have permission to create sales');
        }

        setIsCreatingSale(true);
        setError(null);

        try {
            const sale = await api.createSale({
                ...saleData,
                store_id: activeStoreId,
                sale_type: 'POS',
            });
            setLastSale(sale);
            return sale;
        } catch (err) {
            const apiError = err as ApiError;
            const errorMessage = apiError.message || 'Failed to create sale';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsCreatingSale(false);
        }
    }, [activeStoreId, hasPermission]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const clearLastSale = useCallback(() => {
        setLastSale(null);
    }, []);

    return {
        skus,
        activeStoreId,
        isLoadingSKUs,
        isCreatingSale,
        error,
        lastSale,
        setActiveStore,
        fetchSKUs,
        createSale,
        clearError,
        clearLastSale,
    };
}

export default usePOS;
