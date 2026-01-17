/**
 * API Client for Venus POS
 * ========================
 * Handles all backend API calls with JWT authentication
 */

import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000';

export interface ApiError {
    message: string;
    status: number;
}

export interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    roles: string[];
    permissions: string[];
    store_ids: number[];
}

export interface SKU {
    id: string;
    name: string;
    code: string;
    bird_type: string;
    inventory_type: string;
    unit: string;
    is_active: boolean;
}

export interface SKUWithPrice extends SKU {
    current_price: number | null;
    effective_date: string | null;
}

export interface StorePriceResponse {
    store_id: number;
    store_name: string;
    date: string;
    items: SKUWithPrice[];
}

export interface SaleItemCreate {
    sku_id: string;
    weight: number;
    price_snapshot: number;
}

export interface SaleCreate {
    store_id: number;
    items: SaleItemCreate[];
    payment_method: 'CASH' | 'UPI' | 'CARD' | 'BANK';
    sale_type: 'POS';
    customer_name?: string;
    customer_phone?: string;
    notes?: string;
}

export interface Sale {
    id: string;
    store_id: number;
    cashier_id: string;
    total_amount: string;
    payment_method: string;
    sale_type: string;
    receipt_number: string;
    customer_name?: string;
    customer_phone?: string;
    notes?: string;
    created_at: string;
}

/**
 * Get the current session access token
 */
async function getAccessToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
}

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    storeId?: number
): Promise<T> {
    const token = await getAccessToken();

    if (!token) {
        console.log('[API] No access token available');
        throw { message: 'Not authenticated', status: 401 } as ApiError;
    }

    const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Platform': 'POS',
        'X-Client-App': 'Venus POS Mobile',
        ...options.headers as Record<string, string>,
    };

    // Add store ID header if provided
    if (storeId !== undefined) {
        headers['X-Store-ID'] = storeId.toString();
    }

    const url = `${API_URL}${endpoint}`;
    console.log(`[API] Requesting: ${url}`);

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        console.log(`[API] Response status: ${response.status}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.log('[API] Error data:', errorData);
            throw {
                message: errorData.detail || `Request failed with status ${response.status}`,
                status: response.status,
            } as ApiError;
        }

        return response.json();
    } catch (error) {
        console.log('[API] Fetch error:', error);
        throw error;
    }
}

/**
 * API client methods
 */
export const api = {
    /**
     * Get current user profile with permissions and store IDs
     */
    getUserProfile: () => apiRequest<UserProfile>('/api/v1/users/me'),

    /**
     * Record session (logs LOGIN activity)
     */
    recordSession: () => apiRequest<{ status: string }>('/api/v1/auth/record-session', {
        method: 'POST',
    }),

    /**
     * Logout and log activity
     */
    logoutSession: () => apiRequest<{ message: string }>('/api/v1/auth/logout', {
        method: 'POST',
    }),

    /**
     * Get SKUs with prices for a specific store
     */
    getStorePrices: (storeId: number) =>
        apiRequest<StorePriceResponse>('/api/v1/poultry/skus/prices/store', {}, storeId),

    /**
     * Get all active SKUs
     */
    getSKUs: () => apiRequest<SKU[]>('/api/v1/poultry/skus'),

    /**
     * Create a new POS sale
     */
    createSale: (sale: SaleCreate) =>
        apiRequest<Sale>('/api/v1/poultry/sales', {
            method: 'POST',
            body: JSON.stringify(sale),
        }),
};

export default api;
