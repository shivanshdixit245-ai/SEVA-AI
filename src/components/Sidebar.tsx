'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, MessageSquare, Wrench, Calendar, LayoutDashboard, Users, HelpCircle, LogOut, LogIn, Shield, User, Briefcase, PieChart, TrendingUp } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';

const clientNavItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Services', href: '/services', icon: Wrench },
    { name: 'Chat Assistant', href: '/chat', icon: MessageSquare },
    { name: 'My Bookings', href: '/bookings', icon: Calendar },
    { name: 'Helpers', href: '/helpers', icon: Users },
    { name: 'System Dashboard', href: '/admin', icon: LayoutDashboard, adminOnly: true },
];

const workerNavItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Jobs', href: '/worker/jobs', icon: Briefcase },
    { name: 'Chats', href: '/worker/chats', icon: MessageSquare },
    { name: 'Dashboard', href: '/worker/dashboard', icon: PieChart },
    { name: 'Revenue', href: '/worker/revenue', icon: TrendingUp },
];

export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean, onClose?: () => void }) {
    const pathname = usePathname();
    const { user, isAuthenticated, logout } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // During SSR and initial client pass, we must match the server's output
    const isWorker = mounted && user?.role === 'worker';
    const showProfile = mounted && isAuthenticated && user;
    const currentNavItems = isWorker ? workerNavItems : clientNavItems;

    return (
        <>
            {/* Mobile overlay */}
            <div
                className={clsx(
                    "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            <aside className={clsx(
                "fixed top-4 left-4 bottom-4 z-50 w-64 glass-panel rounded-2xl transition-transform duration-300 lg:translate-x-0 flex flex-col overflow-hidden",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="relative h-full flex flex-col">
                    {/* Logo - Light Mode */}
                    <div className="h-20 flex items-center justify-center border-b border-slate-200/50 mx-4 mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-seva-accent)] to-[var(--color-seva-glow)] flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <span className="text-white font-bold text-xl">S</span>
                            </div>
                            <h1 className="text-xl font-bold font-[family-name:var(--font-display)] tracking-wide text-white">
                                Seva<span className="text-[var(--color-seva-accent)]">AI</span>
                            </h1>
                        </div>
                    </div>

                    {/* Navigation - Light Mode */}
                    <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar py-4">
                        {currentNavItems
                            .filter(item => !(item as any).adminOnly || user?.role === 'admin')
                            .map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={onClose}
                                        className={clsx(
                                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative",
                                            isActive
                                                ? "bg-[var(--color-seva-accent)] text-white shadow-md shadow-blue-500/20"
                                                : "text-white/60 hover:text-white hover:bg-white/10"
                                        )}
                                    >
                                        <div className={clsx(
                                            "p-1.5 rounded-lg transition-colors",
                                            isActive ? "bg-white/20" : "bg-transparent group-hover:bg-white/10"
                                        )}>
                                            <Icon size={18} className={clsx("transition-transform group-hover:scale-110", isActive ? "text-white" : "text-white/50 group-hover:text-[var(--color-seva-accent)]")} />
                                        </div>
                                        <span className="font-medium text-sm tracking-wide">{item.name}</span>
                                    </Link>
                                );
                            })}
                    </nav>

                    {/* Circular Profile with Popover */}
                    <div className="p-4 mt-auto flex justify-center relative">
                        {showProfile ? (
                            <div className="relative group">
                                {/* Profile Circle */}
                                <button
                                    onClick={() => {
                                        const event = new CustomEvent('toggle-profile-menu');
                                        window.dispatchEvent(event);
                                    }}
                                    className="w-12 h-12 rounded-full bg-gradient-to-tr from-[var(--color-seva-accent)] to-[var(--color-seva-glow)] p-[2px] shadow-lg hover:scale-105 transition-transform cursor-pointer relative z-20"
                                >
                                    <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                                        <User size={20} className="text-slate-700" />
                                    </div>
                                </button>

                                {/* Hover/Click Popover */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 glass-card rounded-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 text-center z-10 shadow-xl">
                                    <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                                    <p className="text-[10px] text-slate-500 mb-2 truncate">{user.email}</p>

                                    <div className="h-[1px] bg-slate-200/50 mb-2" />

                                    <button
                                        onClick={() => {
                                            logout();
                                            onClose?.();
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors"
                                    >
                                        <LogOut size={12} />
                                        Log Out
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-white/40 flex items-center justify-center shadow-inner cursor-pointer hover:bg-white/60 transition-colors group relative">
                                <LogIn size={20} className="text-slate-600" />

                                {/* Login Popover */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-32 glass-card rounded-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 text-center">
                                    <Link
                                        href="/login"
                                        onClick={onClose}
                                        className="block w-full py-1.5 rounded-lg bg-[var(--color-seva-accent)] text-white text-xs font-bold shadow-md hover:bg-[var(--color-seva-accent)]/80"
                                    >
                                        LOGIN
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}
