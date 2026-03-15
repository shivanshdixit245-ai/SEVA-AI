'use client';

import { useState, useEffect } from 'react';
import { Users, Briefcase, Calendar, CheckCircle, Clock, AlertTriangle, TrendingUp, Search, RefreshCw, MapPin, IndianRupee, Shield } from 'lucide-react';
import clsx from 'clsx';
import { Booking } from '@/types/booking';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface AdminStats {
    totalClients: number;
    totalWorkers: number;
    totalBookings: number;
    activeBookings: number;
    completedBookings: number;
    incompleteBookings: number;
}

export default function SystemDashboard() {
    const { user, isAuthenticated, isLoading: authLoading, getAuthHeaders } = useAuth();
    const router = useRouter();

    const [stats, setStats] = useState<AdminStats | null>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [workerProfiles, setWorkerProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'Stats' | 'Clients' | 'Workers' | 'Bookings'>('Stats');
    const [searchTerm, setSearchTerm] = useState('');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated || user?.role !== 'admin') {
                router.push('/chat');
            } else {
                fetchAdminData();
            }
        }
    }, [isAuthenticated, user, authLoading, router]);

    // Real-time polling every 5s
    useEffect(() => {
        if (!isAuthenticated || user?.role !== 'admin') return;
        const interval = setInterval(fetchAdminData, 5000);
        return () => clearInterval(interval);
    }, [isAuthenticated, user]);

    async function fetchAdminData() {
        try {
            const res = await fetch('/api/v1/admin/stats', {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
                setClients(data.clients || []);
                setWorkers(data.workers || []);
                setBookings(data.bookings || []);
                setWorkerProfiles(data.workerProfiles || []);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    }

    const getStatusBadge = (status: string) => {
        const map: Record<string, string> = {
            'pending_acceptance': 'bg-amber-400/20 text-amber-400',
            'Confirmed': 'bg-blue-400/20 text-blue-400',
            'In Progress': 'bg-purple-400/20 text-purple-400',
            'Completed': 'bg-green-400/20 text-green-400',
            'Cancelled': 'bg-red-400/20 text-red-400',
        };
        const labels: Record<string, string> = {
            'pending_acceptance': 'Finding Helper',
        };
        return (
            <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-bold", map[status] || 'bg-white/10 text-white/60')}>
                {labels[status] || status}
            </span>
        );
    };

    const filteredBookings = bookings.filter(b => 
        !searchTerm || 
        b.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.serviceType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.workerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.status?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const StatCard = ({ title, value, icon: Icon, color, subtext }: { title: string, value: number | string, icon: any, color: string, subtext?: string }) => (
        <div className="glass-card p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
            <div className="flex items-center justify-between mb-4">
                <div className={clsx("p-3 rounded-xl", `bg-${color}-500/10`)}>
                    <Icon size={24} className={`text-${color}-400`} />
                </div>
                {subtext && <span className="text-xs text-white/30">{subtext}</span>}
            </div>
            <p className="text-white/50 text-sm font-medium">{title}</p>
            <h3 className="text-3xl font-bold mt-1 group-hover:scale-105 transition-transform origin-left">{value}</h3>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[var(--color-seva-accent)] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_var(--color-seva-glow)]"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-4xl font-black font-[family-name:var(--font-display)] tracking-tight">System <span className="text-[var(--color-seva-glow)]">Dashboard</span></h1>
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live
                        </span>
                    </div>
                    <p className="text-white/40 mt-1">
                        Real-time data from Supabase.
                        {lastUpdated && <span className="text-white/20"> • Updated {lastUpdated.toLocaleTimeString()}</span>}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchAdminData} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors" title="Refresh">
                        <RefreshCw size={16} className="text-white/40" />
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                        <input
                            type="text"
                            placeholder="Search bookings..."
                            className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-[var(--color-seva-accent)] transition-all w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl w-fit">
                {['Stats', 'Clients', 'Workers', 'Bookings'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={clsx(
                            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                            activeTab === tab
                                ? "bg-[var(--color-seva-accent)] text-white shadow-lg"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                        )}
                    >
                        {tab}
                        {tab === 'Bookings' && <span className="ml-1.5 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">{bookings.length}</span>}
                    </button>
                ))}
            </div>

            {activeTab === 'Stats' && stats && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <StatCard title="Total Clients" value={stats.totalClients} icon={Users} color="blue" />
                        <StatCard title="Total Workers" value={stats.totalWorkers} icon={Briefcase} color="purple" />
                        <StatCard title="Total Bookings" value={stats.totalBookings} icon={Calendar} color="emerald" />
                        <StatCard title="Active Jobs" value={stats.activeBookings} icon={Clock} color="yellow" subtext="pending + confirmed" />
                        <StatCard title="Completed" value={stats.completedBookings} icon={CheckCircle} color="green" />
                        <StatCard title="Cancelled" value={stats.incompleteBookings} icon={AlertTriangle} color="red" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Recent Bookings */}
                        <div className="glass-card p-6 rounded-3xl border border-white/5">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Calendar size={18} className="text-emerald-400" /> Recent Bookings
                            </h3>
                            <div className="space-y-3">
                                {bookings.slice(0, 5).map(b => (
                                    <div key={b.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                                                {b.serviceType?.[0] || '?'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{b.serviceType}</p>
                                                <div className="flex items-center gap-2 text-[10px] text-white/30">
                                                    <span>{b.id}</span>
                                                    {b.workerName && <span>• 👷 {b.workerName}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <p className="font-bold text-sm">₹{b.price || '---'}</p>
                                            {getStatusBadge(b.status)}
                                        </div>
                                    </div>
                                ))}
                                {bookings.length === 0 && (
                                    <p className="text-center text-white/20 text-sm py-6">No bookings in database yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Worker Profiles */}
                        <div className="glass-card p-6 rounded-3xl border border-white/5">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Shield size={18} className="text-blue-400" /> Verified Workers
                            </h3>
                            <div className="space-y-3">
                                {workerProfiles.length > 0 ? workerProfiles.slice(0, 5).map((w: any) => (
                                    <div key={w.id || w.userId} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                                                {(w.name || 'W').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{w.name || 'Worker'}</p>
                                                <p className="text-[10px] text-white/40">{w.profession || 'N/A'} • {w.experience || 0} yrs</p>
                                            </div>
                                        </div>
                                        <span className={clsx(
                                            "text-[10px] px-2 py-0.5 rounded-full font-bold",
                                            w.verificationStatus === 'verified' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                                        )}>
                                            {w.verificationStatus === 'verified' ? '✓ Verified' : 'Pending'}
                                        </span>
                                    </div>
                                )) : (
                                    <p className="text-center text-white/20 text-sm py-6">No worker profiles registered yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {(activeTab === 'Clients' || activeTab === 'Workers') && (
                <div className="glass-card rounded-3xl border border-white/5 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-white/40 text-xs font-bold uppercase tracking-widest">
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {(activeTab === 'Clients' ? clients : workers).map((u: any, i: number) => (
                                <tr key={u.email || i} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[var(--color-seva-glow)]/20 flex items-center justify-center font-bold text-xs">
                                                {(u.name || '?')[0]}
                                            </div>
                                            <span className="font-bold">{u.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-white/60">{u.email}</td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 font-bold uppercase">{u.role}</span>
                                    </td>
                                    <td className="px-6 py-4 text-white/40">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                                </tr>
                            ))}
                            {(activeTab === 'Clients' ? clients : workers).length === 0 && (
                                <tr><td colSpan={4} className="px-6 py-8 text-center text-white/20">No {activeTab.toLowerCase()} found in Supabase.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'Bookings' && (
                <div className="glass-card rounded-3xl border border-white/5 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-white/40 text-xs font-bold uppercase tracking-widest">
                                <th className="px-6 py-4">Booking ID</th>
                                <th className="px-6 py-4">Service</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Worker</th>
                                <th className="px-6 py-4">Price</th>
                                <th className="px-6 py-4">Created</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filteredBookings.map((b: any) => (
                                <tr key={b.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-[var(--color-seva-accent)]">{b.id}</td>
                                    <td className="px-6 py-4 font-bold">{b.serviceType}</td>
                                    <td className="px-6 py-4">{getStatusBadge(b.status)}</td>
                                    <td className="px-6 py-4 text-white/60">{b.workerName || <span className="text-white/20 italic">Unassigned</span>}</td>
                                    <td className="px-6 py-4 font-bold">₹{b.price || '---'}</td>
                                    <td className="px-6 py-4 text-white/40">{b.createdAt ? new Date(b.createdAt).toLocaleString() : 'N/A'}</td>
                                </tr>
                            ))}
                            {filteredBookings.length === 0 && (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-white/20">No bookings found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
