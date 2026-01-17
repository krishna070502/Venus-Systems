/**
 * Authentication Hook for Venus POS
 * ==================================
 * Provides authentication state and methods using Supabase
 */

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { api, UserProfile } from './api';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<void>;
    hasPermission: (permission: string) => boolean;
    storeIds: number[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUserProfile();
            } else {
                setIsLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    await fetchUserProfile();
                } else {
                    setProfile(null);
                    setIsLoading(false);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    async function fetchUserProfile() {
        try {
            const userProfile = await api.getUserProfile();
            setProfile(userProfile);

            // Record session for activity logging (LOGIN activity)
            try {
                await api.recordSession();
                console.log('[Auth] Session recorded for activity logging');
            } catch (err) {
                console.warn('[Auth] Failed to record session:', err);
            }
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
            setProfile(null);
        } finally {
            setIsLoading(false);
        }
    }

    async function signIn(email: string, password: string) {
        setIsLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (!error) {
            // Profile will be fetched by onAuthStateChange
        } else {
            setIsLoading(false);
        }

        return { error };
    }

    async function signOut() {
        setIsLoading(true);

        // Log logout activity before signing out
        try {
            await api.logoutSession();
            console.log('[Auth] Logout activity recorded');
        } catch (err) {
            console.warn('[Auth] Failed to log logout activity:', err);
        }

        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsLoading(false);
    }

    function hasPermission(permission: string): boolean {
        return profile?.permissions?.includes(permission) ?? false;
    }

    const value: AuthContextType = {
        session,
        user,
        profile,
        isLoading,
        signIn,
        signOut,
        hasPermission,
        storeIds: profile?.store_ids ?? [],
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default useAuth;
