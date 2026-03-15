'use client';

import { useAuth } from '@/context/AuthContext';
import { User, Mail, Shield, Calendar, PieChart, LogOut, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function ProfilePage() {
    const { user, logout, isAuthenticated } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    if (!isAuthenticated || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-panel p-8 rounded-3xl text-center max-w-md w-full">
                    <h1 className="text-2xl font-bold mb-4 text-white">Access Denied</h1>
                    <p className="text-white/60 mb-6">Please sign in to view your profile.</p>
                    <Link href="/login" className="seva-button-primary inline-flex items-center gap-2">
                        Go to Login <ArrowRight size={18} />
                    </Link>
                </div>
            </div>
        );
    }

    const isWorker = user.role === 'worker';
    const isAdmin = user.role === 'admin';

    return (
        <div className="min-h-screen p-4 lg:p-8 pt-24 lg:pt-8 flex justify-center">
            <div className="max-w-2xl w-full space-y-6">
                {/* Profile Header Card */}
                <div className="glass-panel p-8 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--color-seva-accent)]/20 to-transparent rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-500" />
                    
                    <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[var(--color-seva-accent)] to-[var(--color-seva-glow)] p-[3px] shadow-xl">
                            <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                                <User size={40} className="text-slate-700" />
                            </div>
                        </div>
                        
                        <div className="text-center md:text-left">
                            <h1 className="text-3xl font-bold text-white mb-1">{user.name}</h1>
                            <div className="flex items-center justify-center md:justify-start gap-2 text-white/60">
                                <Mail size={16} />
                                <span className="text-sm">{user.email}</span>
                            </div>
                            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs font-bold uppercase tracking-wider">
                                <Shield size={12} className="text-[var(--color-seva-accent)]" />
                                {user.role}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions Card */}
                <div className="glass-panel p-6 rounded-3xl">
                    <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isWorker ? (
                            <>
                                <Link href="/worker/dashboard" className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                                            <PieChart size={20} />
                                        </div>
                                        <span className="text-white font-semibold">Worker Dashboard</span>
                                    </div>
                                    <ArrowRight size={18} className="text-white/20 group-hover:text-white transition-colors" />
                                </Link>
                                <Link href="/worker/jobs" className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-green-500/20 text-green-400">
                                            <Calendar size={20} />
                                        </div>
                                        <span className="text-white font-semibold">Manage Jobs</span>
                                    </div>
                                    <ArrowRight size={18} className="text-white/20 group-hover:text-white transition-colors" />
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href="/bookings" className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                                            <Calendar size={20} />
                                        </div>
                                        <span className="text-white font-semibold">My Bookings</span>
                                    </div>
                                    <ArrowRight size={18} className="text-white/20 group-hover:text-white transition-colors" />
                                </Link>
                                <Link href="/chat" className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400">
                                            <User size={20} />
                                        </div>
                                        <span className="text-white font-semibold">Chat with AI</span>
                                    </div>
                                    <ArrowRight size={18} className="text-white/20 group-hover:text-white transition-colors" />
                                </Link>
                            </>
                        )}
                        
                        {isAdmin && (
                            <Link href="/admin" className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group md:col-span-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
                                        <Shield size={20} />
                                    </div>
                                    <span className="text-white font-semibold">Admin Panel</span>
                                </div>
                                <ArrowRight size={18} className="text-white/20 group-hover:text-white transition-colors" />
                            </Link>
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10">
                        <button 
                            onClick={logout}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold transition-all"
                        >
                            <LogOut size={20} />
                            Log Out from SevaAI
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
