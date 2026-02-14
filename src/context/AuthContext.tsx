'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'client' | 'worker' | 'admin';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    createdAt: string;
}

interface AuthContextType {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
    signup: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Restore session from localStorage
        const saved = localStorage.getItem('sevaai_user');
        if (saved) {
            try {
                setUser(JSON.parse(saved));
            } catch {
                localStorage.removeItem('sevaai_user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string, role: UserRole) => {
        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login', email, password, role })
            });
            const data = await res.json();
            if (res.ok && data.user) {
                setUser(data.user);
                localStorage.setItem('sevaai_user', JSON.stringify(data.user));
                return { success: true };
            }
            return { success: false, error: data.error || 'Login failed' };
        } catch {
            return { success: false, error: 'Network error' };
        }
    };

    const signup = async (name: string, email: string, password: string, role: UserRole) => {
        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'signup', name, email, password, role })
            });
            const data = await res.json();
            if (res.ok && data.user) {
                setUser(data.user);
                localStorage.setItem('sevaai_user', JSON.stringify(data.user));
                return { success: true };
            }
            return { success: false, error: data.error || 'Signup failed' };
        } catch {
            return { success: false, error: 'Network error' };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('sevaai_user');
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
