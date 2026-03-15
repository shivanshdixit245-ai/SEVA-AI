'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { supabase } from '@/lib/supabase';
import { TrendingUp, IndianRupee, ArrowUpRight, Calendar, Briefcase, Clock, ShieldCheck, MapPin, User, CheckCircle2 } from 'lucide-react';

interface EarningsData {
    date: string;
    amount: number;
    jobCount: number;
}

export default function WorkerRevenuePage() {
    const { user } = useAuth();
    const [completedJobs, setCompletedJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');
    const mountedRef = useRef(true);

    const fetchEarnings = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('worker_id', user.id)
                .eq('status', 'Completed');

            if (error) throw error;

            const mapped = (data || []).map((b: any) => ({
                id: b.id,
                workerId: b.worker_id,
                price: b.price || 0,
                createdAt: b.created_at,
                serviceType: b.service_type,
                clientName: b.client_name || 'Anonymous',
                location: b.location || 'Site Location',
                isVerified: b.arrival_otp_verified === true
            }));

            if (mountedRef.current) {
                setCompletedJobs(mapped);
            }
        } catch (err) {
            console.error('Revenue fetch error:', err);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        mountedRef.current = true;
        if (user) fetchEarnings();
        else setLoading(false);
        return () => { mountedRef.current = false; };
    }, [user, fetchEarnings]);

    // Real-time updates instead of polling
    useSupabaseRealtime({
        table: 'bookings',
        onData: (payload) => {
            const record = payload.new as any;
            if (record?.worker_id === user?.id && record?.status === 'Completed') {
                fetchEarnings();
            }
        },
        enabled: !!user
    });

    // Aggregate earnings by date
    const earningsData = useMemo(() => {
        const now = Date.now();
        const rangeMs = timeRange === '7d' ? 7 * 86400000 : timeRange === '30d' ? 30 * 86400000 : Infinity;
        
        const filtered = completedJobs.filter(j => {
            const diff = now - new Date(j.createdAt).getTime();
            return diff <= rangeMs;
        });

        const byDate: Record<string, { amount: number; jobCount: number }> = {};
        filtered.forEach(j => {
            if (!j.isVerified) return; // Only verified jobs contribute to graph
            const date = new Date(j.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            if (!byDate[date]) byDate[date] = { amount: 0, jobCount: 0 };
            byDate[date].amount += j.price || 0;
            byDate[date].jobCount += 1;
        });

        return Object.entries(byDate).map(([date, d]) => ({
            date,
            amount: d.amount,
            jobCount: d.jobCount
        }));
    }, [completedJobs, timeRange]);

    const totalEarnings = completedJobs.filter(j => j.isVerified).reduce((sum, j) => sum + (j.price || 0), 0);
    const thisMonthEarnings = completedJobs
        .filter(j => j.isVerified && new Date(j.createdAt).getMonth() === new Date().getMonth())
        .reduce((sum, j) => sum + (j.price || 0), 0);
    const verifiedJobsCount = completedJobs.filter(j => j.isVerified).length;
    const avgPerJob = verifiedJobsCount > 0 ? Math.round(totalEarnings / verifiedJobsCount) : 0;

    // SVG Graph
    const graphWidth = 700;
    const graphHeight = 200;
    const padding = 30;

    const graphPoints = useMemo(() => {
        if (earningsData.length === 0) return '';
        const maxAmount = Math.max(...earningsData.map(d => d.amount), 1);
        const step = (graphWidth - padding * 2) / Math.max(earningsData.length - 1, 1);

        return earningsData.map((d, i) => {
            const x = padding + i * step;
            const y = graphHeight - padding - ((d.amount / maxAmount) * (graphHeight - padding * 2));
            return `${x},${y}`;
        }).join(' ');
    }, [earningsData]);

    const graphAreaPoints = useMemo(() => {
        if (!graphPoints) return '';
        const pts = graphPoints.split(' ');
        const firstX = pts[0]?.split(',')[0] || padding.toString();
        const lastX = pts[pts.length - 1]?.split(',')[0] || (graphWidth - padding).toString();
        return `${firstX},${graphHeight - padding} ${graphPoints} ${lastX},${graphHeight - padding}`;
    }, [graphPoints]);

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold font-[family-name:var(--font-display)]">
                        Revenue <span className="text-gradient">Analytics</span>
                    </h1>
                    <p className="text-white/60">Track your earnings in real-time.</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-green-400">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Live
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-2xl bg-gradient-to-br from-green-500/5 to-transparent">
                    <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                            <IndianRupee size={18} className="text-green-400" />
                        </div>
                        <span className="flex items-center gap-0.5 text-green-400 text-xs font-bold">
                            <ArrowUpRight size={12} /> Live
                        </span>
                    </div>
                    <p className="text-xs text-white/40 mb-1">Total Earnings</p>
                    <p className="text-2xl font-bold text-green-400">₹{totalEarnings.toLocaleString()}</p>
                </div>

                <div className="glass-panel p-5 rounded-2xl">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-3">
                        <Calendar size={18} className="text-blue-400" />
                    </div>
                    <p className="text-xs text-white/40 mb-1">This Month</p>
                    <p className="text-2xl font-bold">₹{thisMonthEarnings.toLocaleString()}</p>
                </div>

                <div className="glass-panel p-5 rounded-2xl">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mb-3">
                        <Briefcase size={18} className="text-purple-400" />
                    </div>
                    <p className="text-xs text-white/40 mb-1">Jobs Done</p>
                    <p className="text-2xl font-bold">{completedJobs.length}</p>
                </div>

                <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-green-500/50">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center mb-3">
                        <ShieldCheck size={18} className="text-green-400" />
                    </div>
                    <p className="text-xs text-white/40 mb-1">Security Index</p>
                    <p className="text-2xl font-bold">{completedJobs.filter(j => j.isVerified).length}/{completedJobs.length}</p>
                    <p className="text-[10px] text-green-400 mt-1 font-bold">OTP VERIFIED</p>
                </div>
            </div>

            {/* Earnings Graph */}
            <div className="glass-panel rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <TrendingUp size={20} className="text-green-400" /> Earnings Over Time
                    </h2>
                    <div className="flex gap-1 text-xs">
                        {(['7d', '30d', 'all'] as const).map(range => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-3 py-1.5 rounded-lg transition-all ${
                                    timeRange === range 
                                        ? 'bg-[var(--color-seva-accent)] text-white' 
                                        : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
                            </button>
                        ))}
                    </div>
                </div>

                {earningsData.length === 0 ? (
                    <div className="flex items-center justify-center h-[200px] text-white/20 text-sm">
                        No earnings data yet. Complete jobs to see your revenue graph.
                    </div>
                ) : (
                    <div className="relative w-full overflow-x-auto">
                        <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="w-full h-[200px]">
                            {/* Grid lines */}
                            {[0.25, 0.5, 0.75].map(pct => (
                                <line
                                    key={pct}
                                    x1={padding}
                                    y1={graphHeight - padding - pct * (graphHeight - padding * 2)}
                                    x2={graphWidth - padding}
                                    y2={graphHeight - padding - pct * (graphHeight - padding * 2)}
                                    stroke="rgba(255,255,255,0.15)"
                                    strokeDasharray="4"
                                />
                            ))}

                            {/* Dark overlay for better contrast */}
                            <rect 
                                x={padding} 
                                y={padding} 
                                width={graphWidth - padding * 2} 
                                height={graphHeight - padding * 2} 
                                fill="rgba(0,0,0,0.25)" 
                                rx="8"
                            />

                            {/* Filters & Gradients */}
                            <defs>
                                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="3" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                                <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="rgba(34,197,94,0.3)" />
                                    <stop offset="100%" stopColor="rgba(34,197,94,0)" />
                                </linearGradient>
                            </defs>

                            {/* Area */}
                            <polygon points={graphAreaPoints} fill="url(#earnGrad)" />

                            {/* Line Segments (Crypto Style) */}
                            {earningsData.map((d, i) => {
                                if (i === 0) return null;
                                const prev = earningsData[i - 1];
                                const maxAmount = Math.max(...earningsData.map(e => e.amount), 1);
                                const step = (graphWidth - padding * 2) / Math.max(earningsData.length - 1, 1);
                                
                                const x1 = padding + (i - 1) * step;
                                const y1 = graphHeight - padding - ((prev.amount / maxAmount) * (graphHeight - padding * 2));
                                const x2 = padding + i * step;
                                const y2 = graphHeight - padding - ((d.amount / maxAmount) * (graphHeight - padding * 2));
                                
                                const isUp = d.amount >= prev.amount;
                                const color = isUp ? '#22c55e' : '#ef4444';

                                return (
                                    <line
                                        key={i}
                                        x1={x1} y1={y1} x2={x2} y2={y2}
                                        stroke={color}
                                        strokeWidth="3.5"
                                        strokeLinecap="round"
                                        filter="url(#glow)"
                                    />
                                );
                            })}

                            {/* Dots */}
                            {earningsData.map((d, i) => {
                                const maxAmount = Math.max(...earningsData.map(e => e.amount), 1);
                                const step = (graphWidth - padding * 2) / Math.max(earningsData.length - 1, 1);
                                const x = padding + i * step;
                                const y = graphHeight - padding - ((d.amount / maxAmount) * (graphHeight - padding * 2));
                                
                                const prev = i > 0 ? earningsData[i-1] : d;
                                const isUp = d.amount >= prev.amount;
                                const color = isUp ? '#22c55e' : '#ef4444';
                                
                                return (
                                    <g key={i}>
                                        <circle cx={x} cy={y} r="5" fill={color} />
                                        <circle cx={x} cy={y} r="8" fill={isUp ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"} />
                                        {/* Labels */}
                                        <text x={x} y={graphHeight - 8} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontWeight="500">{d.date}</text>
                                        <text x={x} y={y - 12} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">₹{d.amount}</text>
                                    </g>
                                );
                            })}
                        </svg>
                    </div>
                )}
            </div>

            {/* Recent Transactions */}
            <div className="glass-panel rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-white/5">
                    <h3 className="font-bold flex items-center gap-2">
                        <Clock size={16} className="text-white/40" /> Recent Transactions
                    </h3>
                </div>
                {completedJobs.length === 0 ? (
                    <div className="p-8 text-center text-white/20 italic text-sm">
                        No transactions yet. Complete jobs to see earnings here.
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {completedJobs.slice(0, 10).map(job => (
                            <div key={job.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between hover:bg-white/[0.02] transition-colors gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 border border-white/5">
                                        <Briefcase size={20} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-bold text-base flex items-center gap-2">
                                            {job.serviceType}
                                            {job.isVerified && (
                                                <span className="flex items-center gap-1 text-[9px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20">
                                                    <CheckCircle2 size={10} /> VERIFIED
                                                </span>
                                            )}
                                        </p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                                            <p className="text-xs text-white/40 flex items-center gap-1">
                                                <User size={12} /> {job.clientName}
                                            </p>
                                            <p className="text-xs text-white/40 flex items-center gap-1 truncate max-w-[200px]">
                                                <MapPin size={12} /> {job.location}
                                            </p>
                                            <p className="text-xs text-white/40 flex items-center gap-1">
                                                <Clock size={12} /> {new Date(job.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-1 border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                                    <p className="text-green-400 font-bold text-xl flex items-center gap-1">
                                        +₹{job.price}
                                    </p>
                                    <p className="text-[10px] font-mono text-white/10 uppercase tracking-tighter">ID: {job.id.slice(0, 8)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
