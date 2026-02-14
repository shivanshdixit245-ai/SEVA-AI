// src/components/LayoutShell.tsx
'use client';

import { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { AuthProvider } from '@/context/AuthContext';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <AuthProvider>
            <div className="min-h-screen text-white font-[family-name:var(--font-sans)] selection:bg-[var(--color-seva-accent)] selection:text-white">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                <div className="lg:pl-[17rem] transition-all duration-300">
                    <Navbar onMenuClick={() => setSidebarOpen(true)} />

                    {/* Adjusted padding top for floating navbar (which is around 80px height including positioning) */}
                    <main className="pt-24 px-4 pb-8 min-h-screen max-w-7xl mx-auto relative z-10">
                        {children}
                    </main>
                </div>
            </div>
        </AuthProvider>
    );
}
