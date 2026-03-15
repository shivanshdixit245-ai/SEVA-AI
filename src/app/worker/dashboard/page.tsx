'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { supabase } from '@/lib/supabase';
import { Briefcase, CheckCircle, Clock, Star, IndianRupee, AlertCircle } from 'lucide-react';
import { StatCardSkeleton, BookingSkeleton } from '@/components/Skeletons';

export default function WorkerDashboardPage() {
    const { user, getAuthHeaders } = useAuth();
    const [activeJobs, setActiveJobs] = useState<any[]>([]);
    const [completedJobs, setCompletedJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
    const [verifying, setVerifying] = useState<string | null>(null);
    const mountedRef = useRef(true);

    const fetchData = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch(`/api/v1/bookings?workerId=${user.id}`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            
            if (!res.ok) {
                console.error("Worker API Error:", data);
                throw new Error(data.error || 'Failed to fetch jobs');
            }

            const all = (data || []).map((b: any) => ({
                id: b.id,
                serviceType: b.serviceType || b.service_type,
                status: b.status,
                price: b.price,
                location: b.location,
                createdAt: b.createdAt || b.created_at,
                acceptedAt: b.acceptedAt || b.accepted_at,
            }));

            if (mountedRef.current) {
                setActiveJobs(all.filter((j: any) => ['Confirmed', 'In Progress'].includes(j.status)));
                setCompletedJobs(all.filter((j: any) => j.status === 'Completed'));
                setError(null);
            }
        } catch (err: any) {
            console.error("Worker Fetch Failed:", err);
            if (mountedRef.current) setError(err.message || 'Failed to connect to service');
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [user, getAuthHeaders]);

    useEffect(() => {
        mountedRef.current = true;
        if (user) fetchData();
        else setLoading(false);
        return () => { mountedRef.current = false; };
    }, [user, fetchData]);

    // Realtime updates — granular state management for instant UI
    useSupabaseRealtime({
        table: 'bookings',
        onData: (payload) => {
            if (!mountedRef.current) return;
            const record = payload.new as any;
            if (record?.worker_id !== user?.id) return;

            console.log(`Worker Realtime: ${payload.eventType} on ${record.id}`);

            const mappedJob = {
                id: record.id,
                serviceType: record.service_type,
                status: record.status,
                price: record.price,
                location: record.location,
                createdAt: record.created_at,
                acceptedAt: record.accepted_at,
            };

            if (payload.eventType === 'INSERT') {
                if (['Confirmed', 'In Progress'].includes(mappedJob.status)) {
                    setActiveJobs(prev => [mappedJob, ...prev]);
                }
            } else if (payload.eventType === 'UPDATE') {
                // Update active jobs
                setActiveJobs(prev => {
                    const isStillActive = ['Confirmed', 'In Progress'].includes(mappedJob.status);
                    const list = prev.map(j => j.id === mappedJob.id ? { ...j, ...mappedJob } : j);
                    return isStillActive ? list : list.filter(j => j.id !== mappedJob.id);
                });

                // Update completed jobs
                if (mappedJob.status === 'Completed') {
                    setCompletedJobs(prev => {
                        if (prev.find(j => j.id === mappedJob.id)) {
                            return prev.map(j => j.id === mappedJob.id ? { ...j, ...mappedJob } : j);
                        }
                        return [mappedJob, ...prev];
                    });
                }
            } else if (payload.eventType === 'DELETE') {
                setActiveJobs(prev => prev.filter(j => j.id !== record.id));
                setCompletedJobs(prev => prev.filter(j => j.id !== record.id));
            }
        },
        enabled: !!user
    });

    const handleVerifyOtp = async (bookingId: string) => {
        const otp = otpInputs[bookingId];
        if (!otp || otp.length < 4) {
            alert('Please enter a valid 4-digit OTP.');
            return;
        }

        setVerifying(bookingId);
        try {
            const res = await fetch('/api/v1/bookings/verify-otp', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ bookingId, otp, workerId: user?.id })
            });

            if (res.ok) {
                // Remove from active, will be refetched by realtime or manual
                setActiveJobs(prev => prev.filter(j => j.id !== bookingId));
                setOtpInputs(prev => {
                    const next = { ...prev };
                    delete next[bookingId];
                    return next;
                });
                fetchData(); // Refresh to move to completed
            } else {
                const data = await res.json();
                alert(data.error || 'Verification failed');
            }
        } catch (err) {
            alert('Network error during verification.');
        } finally {
            setVerifying(null);
        }
    };

    const totalEarnings = completedJobs.reduce((sum, j) => sum + (j.price || 0), 0);

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="h-10 w-64 bg-white/5 rounded-xl animate-pulse" />
                <StatCardSkeleton count={4} />
                <BookingSkeleton />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold font-[family-name:var(--font-display)]">Worker <span className="text-gradient">Dashboard</span></h1>
                    <p className="text-white/60">Real-time overview of your work.</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-400">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Live
                </div>
            </div>

            {error && (
                <div className="glass-panel p-4 rounded-xl border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-2xl bg-gradient-to-br from-blue-500/5 to-transparent">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-3">
                        <Briefcase size={18} className="text-blue-400" />
                    </div>
                    <p className="text-xs text-white/40 mb-1">Active Jobs</p>
                    <p className="text-2xl font-bold">{activeJobs.length}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl bg-gradient-to-br from-green-500/5 to-transparent">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center mb-3">
                        <CheckCircle size={18} className="text-green-400" />
                    </div>
                    <p className="text-xs text-white/40 mb-1">Completed</p>
                    <p className="text-2xl font-bold">{completedJobs.length}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-transparent">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-3">
                        <IndianRupee size={18} className="text-emerald-400" />
                    </div>
                    <p className="text-xs text-white/40 mb-1">Total Earnings</p>
                    <p className="text-2xl font-bold text-green-400">₹{totalEarnings.toLocaleString()}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl bg-gradient-to-br from-amber-500/5 to-transparent">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center mb-3">
                        <Star size={18} className="text-amber-400" />
                    </div>
                    <p className="text-xs text-white/40 mb-1">Rating</p>
                    <p className="text-2xl font-bold">0.0 ⭐</p>
                </div>
            </div>

            {/* Active Jobs */}
            <div className="glass-panel rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-white/5">
                    <h3 className="font-bold flex items-center gap-2"><Clock size={16} className="text-blue-400" /> Active Jobs</h3>
                </div>
                {activeJobs.length === 0 ? (
                    <div className="p-8 text-center text-white/20 text-sm">No active jobs right now.</div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {activeJobs.map(job => (
                            <div key={job.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-white/[0.02] transition-colors gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-sm">
                                        {(job.serviceType || '?')[0]}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{job.serviceType}</p>
                                        <p className="text-xs text-white/30">{job.location || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 sm:justify-end justify-between w-full sm:w-auto">
                                    <div className="flex gap-2">
                                        <a href={`/worker/chats`} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-blue-400 transition-colors">
                                            <span className="sr-only">Chat</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                        </a>
                                        <a href={`tel:${job.userPhone || '9999999999'}`} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-green-400 transition-colors">
                                            <span className="sr-only">Call</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                        </a>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-400 font-bold">{job.status}</span>
                                        
                                        {job.status === 'Confirmed' && (
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    maxLength={4}
                                                    placeholder="OTP"
                                                    value={otpInputs[job.id] || ''}
                                                    onChange={e => setOtpInputs({...otpInputs, [job.id]: e.target.value})}
                                                    className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-center text-sm font-bold tracking-widest focus:border-[var(--color-seva-accent)] outline-none"
                                                />
                                                <button
                                                    onClick={() => handleVerifyOtp(job.id)}
                                                    disabled={verifying === job.id}
                                                    className="px-3 py-1 bg-gradient-to-r from-[var(--color-seva-accent)] to-[var(--color-seva-glow)] rounded-lg text-xs font-bold hover:scale-105 transition-all disabled:opacity-50"
                                                >
                                                    {verifying === job.id ? '...' : 'Verify'}
                                                </button>
                                            </div>
                                        )}
                                        
                                        <p className="text-xs text-white/30">₹{job.price}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Completed */}
            <div className="glass-panel rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-white/5">
                    <h3 className="font-bold flex items-center gap-2"><CheckCircle size={16} className="text-green-400" /> Recent Completed ({completedJobs.length})</h3>
                </div>
                {completedJobs.length === 0 ? (
                    <div className="p-8 text-center text-white/20 text-sm">No completed jobs yet.</div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {completedJobs.slice(0, 5).map(job => (
                            <div key={job.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                                        <CheckCircle size={16} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{job.serviceType}</p>
                                        <p className="text-xs text-white/30">{new Date(job.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <p className="text-green-400 font-bold">₹{job.price}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
