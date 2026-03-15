// src/components/LayoutShell.tsx
'use client';

import { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { AuthProvider } from '@/context/AuthContext';
import { ErrorBoundary } from './ErrorBoundary';
import GlobalNotifications from './GlobalNotifications';
import { useEffect } from 'react';

function AppPrefetcher() {
    useEffect(() => {
        // Warm up the helpers cache
        fetch('/api/v1/helpers').catch(() => {});
    }, []);
    return null;
}

export default function LayoutShell({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <AuthProvider>
            <AppPrefetcher />
            <GlobalNotifications />
            <div className="min-h-screen text-white font-[family-name:var(--font-sans)] selection:bg-[var(--color-seva-accent)] selection:text-white">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                <div className="lg:pl-[17rem] transition-all duration-300">
                    <Navbar onMenuClick={() => setSidebarOpen(true)} />

                    <main className="pt-24 px-4 pb-8 min-h-screen max-w-7xl mx-auto relative z-10">
                        <ErrorBoundary>
                            {children}
                        </ErrorBoundary>
                    </main>
                </div>
            </div>
        </AuthProvider>
    );
}
