'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { supabase } from '@/lib/supabase';
import { Clock, MapPin, ChevronRight, IndianRupee, AlertCircle, CheckCircle2, Navigation } from 'lucide-react';
import { JobCardSkeleton } from '@/components/Skeletons';

interface Job {
    id: string;
    userId: string;
    serviceType: string;
    description: string;
    location: string;
    urgency: string;
    price: number;
    createdAt: string;
    status: string;
}

export default function WorkerJobsPage() {
    const { user, getAuthHeaders } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [accepting, setAccepting] = useState(false);
    const [acceptedId, setAcceptedId] = useState<string | null>(null);
    const [sharingLocation, setSharingLocation] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const watchIdRef = useRef<number | null>(null);
    const mountedRef = useRef(true);

    // Fetch pending jobs using the reliable server-side pattern
    const fetchJobs = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/bookings?status=pending_acceptance', {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Failed to fetch jobs');

            const mapped = (data || []).map((b: any) => ({
                id: b.id,
                userId: b.userId || b.user_id,
                serviceType: b.serviceType || b.service_type,
                description: b.description || '',
                location: b.location || 'Unknown',
                urgency: b.urgency || 'Normal',
                price: b.price || 0,
                createdAt: b.createdAt || b.created_at,
                status: b.status
            }));
            
            if (mountedRef.current) {
                setJobs(mapped);
                setError(null);
            }
        } catch (err: any) {
            console.error('Jobs fetch error:', err);
            if (mountedRef.current) setError('Connecting to job server...');
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        fetchJobs();
        return () => { mountedRef.current = false; };
    }, [fetchJobs]);

    // Supabase Realtime: instantly show new bookings or remove accepted ones
    useSupabaseRealtime({
        table: 'bookings',
        onData: (payload) => {
            const record = payload.new as any;
            const oldRecord = payload.old as any;

            if (payload.eventType === 'INSERT' && record?.status === 'pending_acceptance') {
                // New booking appeared — add to list
                setJobs(prev => [{
                    id: record.id,
                    userId: record.user_id,
                    serviceType: record.service_type,
                    description: record.description || '',
                    location: record.location || 'Unknown',
                    urgency: record.urgency || 'Normal',
                    price: record.price || 0,
                    createdAt: record.created_at,
                    status: record.status
                }, ...prev]);
            }
            if (payload.eventType === 'UPDATE' && record?.status !== 'pending_acceptance') {
                // Job was accepted — remove from list
                setJobs(prev => prev.filter(j => j.id !== record.id));
            }
            if (payload.eventType === 'DELETE' && oldRecord?.id) {
                setJobs(prev => prev.filter(j => j.id !== oldRecord.id));
            }
        },
        enabled: true
    });

    const handleAcceptJob = async (job: Job) => {
        if (!user) return;
        setAccepting(true);
        try {
            const res = await fetch('/api/v1/worker/jobs', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ bookingId: job.id, workerId: user.id, workerName: user.name })
            });

            if (res.ok) {
                // Optimistic removal
                setJobs(prev => prev.filter(j => j.id !== job.id));
                setAcceptedId(job.id);
                setSelectedJob(null);
                startLocationSharing(job.id);
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to accept job.');
            }
        } catch (err) {
            alert('Network error. Please try again.');
        } finally {
            setAccepting(false);
        }
    };

    const startLocationSharing = (bookingId: string) => {
        setSharingLocation(true);
        if ('geolocation' in navigator) {
            const id = navigator.geolocation.watchPosition(
                async (pos) => {
                    try {
                        await fetch('/api/v1/worker/location', {
                            method: 'POST',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({
                                bookingId,
                                lat: pos.coords.latitude,
                                lng: pos.coords.longitude
                            })
                        });
                    } catch {}
                },
                (err) => console.warn('Geo error:', err),
                { enableHighAccuracy: true, maximumAge: 5000 }
            );
            watchIdRef.current = id;
        }
    };

    // Cleanup geolocation on unmount
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    const getUrgencyStyle = (u: string) => {
        if (u === 'Emergency') return 'bg-red-500/20 text-red-400';
        if (u === 'Urgent') return 'bg-orange-500/20 text-orange-400';
        return 'bg-green-500/20 text-green-400';
    };

    const getServiceEmoji = (s: string) => {
        const m: Record<string, string> = {
            'Deep Cleaning': '🧹', 'Plumbing': '🔧', 'Electrician': '⚡',
            'Painting': '🎨', 'Carpentry': '🪵', 'Appliance Repair': '🔌',
            'Pest Control': '🐛', 'AC Service': '❄️'
        };
        return m[s] || '🛠️';
    };

    const timeSince = (d: string) => {
        const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
        if (m < 1) return 'Just now';
        if (m < 60) return `${m}m ago`;
        return `${Math.floor(m / 60)}h ago`;
    };

    if (acceptedId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                    <CheckCircle2 size={40} />
                </div>
                <h1 className="text-3xl font-bold text-gradient">Job Accepted! 🎉</h1>
                <p className="text-white/60 text-center max-w-md">
                    You've confirmed this job. Your live location is being shared with the client.
                </p>
                {sharingLocation && (
                    <div className="flex items-center gap-2 text-green-400 text-sm animate-pulse">
                        <Navigation size={14} /> Sharing live location...
                    </div>
                )}
                <button
                    onClick={() => { setAcceptedId(null); fetchJobs(); }}
                    className="mt-4 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white/60"
                >
                    Browse More Jobs
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold font-[family-name:var(--font-display)]">Available <span className="text-gradient">Jobs</span></h1>
                    <p className="text-white/60">Jobs appear instantly via Supabase Realtime.</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-400">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Live
                </div>
            </div>

            {error && (
                <div className="glass-panel p-4 rounded-xl border border-amber-500/20 text-amber-400 text-sm flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {loading ? (
                <JobCardSkeleton />
            ) : jobs.length === 0 ? (
                <div className="glass-panel p-12 rounded-3xl text-center space-y-4">
                    <AlertCircle className="mx-auto text-white/20" size={48} />
                    <h2 className="text-xl font-bold text-white/40">No Jobs Available Right Now</h2>
                    <p className="text-white/30 text-sm">New jobs will appear here instantly when clients book services.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {jobs.map(job => (
                        <div
                            key={job.id}
                            onClick={() => setSelectedJob(job)}
                            className="glass-panel p-6 rounded-2xl hover:bg-white/5 transition-all group cursor-pointer border border-transparent hover:border-[var(--color-seva-accent)]/30"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-2xl">
                                        {getServiceEmoji(job.serviceType)}
                                    </div>
                                    <div className="space-y-1.5">
                                        <h3 className="font-bold text-lg flex items-center gap-2">
                                            {job.serviceType}
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getUrgencyStyle(job.urgency)}`}>
                                                {job.urgency}
                                            </span>
                                        </h3>
                                        <p className="text-sm text-white/50 line-clamp-1 max-w-md">{job.description || 'No details provided'}</p>
                                        <div className="flex items-center gap-4 text-xs text-white/30">
                                            <span className="flex items-center gap-1"><Clock size={12} /> {timeSince(job.createdAt)}</span>
                                            <span className="flex items-center gap-1"><MapPin size={12} /> {job.location}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-xl font-bold text-green-400">
                                            <IndianRupee size={16} />{job.price}
                                        </div>
                                        <p className="text-[10px] text-white/30">Estimated</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/5 group-hover:bg-[var(--color-seva-accent)] group-hover:text-white transition-all">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Job Detail Modal */}
            {selectedJob && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedJob(null)}>
                    <div className="glass-panel w-full max-w-lg rounded-3xl p-8 space-y-6 animate-in fade-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-3xl">
                                {getServiceEmoji(selectedJob.serviceType)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{selectedJob.serviceType}</h2>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${getUrgencyStyle(selectedJob.urgency)}`}>
                                    {selectedJob.urgency}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="glass-panel p-4 rounded-xl space-y-2">
                                <h3 className="text-xs font-bold text-white/40 uppercase">Problem Description</h3>
                                <p className="text-white/80">{selectedJob.description || 'Client did not provide details.'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="glass-panel p-4 rounded-xl">
                                    <h3 className="text-xs font-bold text-white/40 uppercase mb-1">Location</h3>
                                    <p className="flex items-center gap-1 text-white/80"><MapPin size={14} /> {selectedJob.location}</p>
                                </div>
                                <div className="glass-panel p-4 rounded-xl">
                                    <h3 className="text-xs font-bold text-white/40 uppercase mb-1">Payment</h3>
                                    <p className="flex items-center gap-1 text-green-400 text-xl font-bold"><IndianRupee size={16} />{selectedJob.price}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="glass-panel p-4 rounded-xl">
                                    <h3 className="text-xs font-bold text-white/40 uppercase mb-1">Posted</h3>
                                    <p className="text-white/80">{timeSince(selectedJob.createdAt)}</p>
                                </div>
                                <div className="glass-panel p-4 rounded-xl">
                                    <h3 className="text-xs font-bold text-white/40 uppercase mb-1">Booking ID</h3>
                                    <p className="text-white/80 font-mono text-sm">{selectedJob.id}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setSelectedJob(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 hover:bg-white/5 transition-all">
                                Close
                            </button>
                            <button
                                onClick={() => handleAcceptJob(selectedJob)}
                                disabled={accepting}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all disabled:opacity-50"
                            >
                                {accepting ? 'Accepting...' : '✅ Accept Job'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
