'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'client' | 'worker' | 'admin';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    createdAt: string;
    hasProfile?: boolean;
    token?: string; // JWT token for secure API calls
}

interface AuthContextType {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
    signup: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    updateUser: (data: Partial<AuthUser>) => void;
    getAuthHeaders: () => Record<string, string>;
    selectedLocation: string;
    setSelectedLocation: (loc: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sevaai_user');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    return null;
                }
            }
        }
        return null;
    });
    const [isLoading, setIsLoading] = useState(false);

    const [selectedLocation, setSelectedLocation] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('sevaai_selected_location') || "Delhi, India";
        }
        return "Delhi, India";
    });

    useEffect(() => {
        // isLoading is now false by default for better perceived speed
        setIsLoading(false);
    }, []);

    useEffect(() => {
        localStorage.setItem('sevaai_selected_location', selectedLocation);
    }, [selectedLocation]);

    const login = async (email: string, password: string, role: UserRole) => {
        console.log('Login attempt:', { email, role });
        try {
            const res = await fetch('/api/v1/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login', email, password, role })
            });
            console.log('Login response status:', res.status);
            const data = await res.json();
            if (res.ok && data.user) {
                const userWithToken = { ...data.user, token: data.token };
                setUser(userWithToken);
                localStorage.setItem('sevaai_user', JSON.stringify(userWithToken));
                return { success: true };
            }
            console.warn('Login failed:', data.error);
            return { success: false, error: data.error || 'Login failed' };
        } catch (err: any) {
            console.error('Login Fetch Error:', err);
            return { success: false, error: 'Network error' };
        }
    };

    const signup = async (name: string, email: string, password: string, role: UserRole) => {
        console.log('Signup attempt:', { name, email, role });
        try {
            const res = await fetch('/api/v1/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'signup', name, email, password, role })
            });
            console.log('Signup response status:', res.status);
            const data = await res.json();
            if (res.ok && data.user) {
                // For signup, if the API doesn't return a token yet, it might need a subsequent login
                // However, we'll try to use the token if provided.
                const userWithToken = { ...data.user, token: data.token };
                setUser(userWithToken);
                localStorage.setItem('sevaai_user', JSON.stringify(userWithToken));
                return { success: true };
            }
            console.warn('Signup failed:', data.error);
            return { success: false, error: data.error || 'Signup failed' };
        } catch (err: any) {
            console.error('Signup Fetch Error:', err);
            return { success: false, error: 'Network error' };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('sevaai_user');
    };

    const updateUser = (data: Partial<AuthUser>) => {
        if (!user) return;
        const updated = { ...user, ...data };
        setUser(updated);
        localStorage.setItem('sevaai_user', JSON.stringify(updated));
    };

    const getAuthHeaders = () => {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        // Priority 1: Current state token
        let token = user?.token;

        // Priority 2: localStorage fallback (robustness)
        if (!token && typeof window !== 'undefined') {
            const saved = localStorage.getItem('sevaai_user');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    token = parsed.token;
                } catch (e) {}
            }
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    };


    return (
        <AuthContext.Provider value={{ 
            user, 
            isAuthenticated: !!user, 
            isLoading, 
            login, 
            signup, 
            logout,
            updateUser,
            getAuthHeaders,
            selectedLocation,
            setSelectedLocation
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
