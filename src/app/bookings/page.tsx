'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, Clock, MapPin, User, CheckCircle, Circle, AlertCircle, Navigation, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Booking, BookingStatus, Helper } from '@/types/booking';
import clsx from 'clsx';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { BookingSkeleton } from '@/components/Skeletons';
import ReviewModal from '@/components/ReviewModal';

const STATUS_STEPS: BookingStatus[] = ['pending_acceptance', 'Confirmed', 'In Progress', 'Completed'];
const STATUS_LABELS: Record<string, string> = { 'pending_acceptance': 'Finding Helper', 'Confirmed': 'Confirmed', 'In Progress': 'In Progress', 'Completed': 'Completed' };

export default function BookingsPage() {
    const { user, getAuthHeaders } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [helpers, setHelpers] = useState<Record<string, Helper>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'All' | 'Active' | 'History'>('All');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
    const mountedRef = useRef(true);

    const mapBooking = (b: any): Booking => ({
        ...b,
        userId: b.user_id,
        helperId: b.worker_id || b.helper_id,
        scheduledDate: b.scheduled_date,
        createdAt: b.created_at,
        serviceType: b.service_type,
        workerId: b.worker_id,
        workerName: b.worker_name,
        workerPhone: b.worker_phone,
        workerProfession: b.worker_profession,
        workerExperience: b.worker_experience,
        workerVerified: b.worker_verified,
        liveLat: b.live_lat,
        liveLng: b.live_lng,
        acceptedAt: b.accepted_at,
        id: b.id
    });

    const fetchData = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch(`/api/v1/bookings?userId=${user.id}`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            
            if (!res.ok) {
                console.error("Booking API Error Response:", data);
                throw new Error(data.error || 'Failed to fetch bookings');
            }

            if (mountedRef.current) {
                setBookings(data || []);
            }
        } catch (error: any) {
            console.error("Failed to fetch bookings:", {
                message: error.message,
                user: user.id,
                error
            });
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        mountedRef.current = true;
        if (user) fetchData();
        else setLoading(false);
        return () => { mountedRef.current = false; };
    }, [user, fetchData]);

    // Supabase Realtime — granular instant updates
    useSupabaseRealtime({
        table: 'bookings',
        filter: user ? `user_id=eq.${user.id}` : undefined,
        onData: (payload) => {
            if (!mountedRef.current) return;
            
            if (payload.eventType === 'INSERT') {
                const newItem = mapBooking(payload.new);
                setBookings(prev => [newItem, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
                const updatedItem = mapBooking(payload.new);
                setBookings(prev => prev.map(b => b.id === updatedItem.id ? { ...b, ...updatedItem } : b));
            } else if (payload.eventType === 'DELETE') {
                const deletedId = payload.old.id;
                setBookings(prev => prev.filter(b => b.id !== deletedId));
            }
        },
        enabled: !!user
    });

    const getFilteredBookings = () => {
        return bookings.filter(b => {
            const status = (b.status || '').toLowerCase();
            if (filter === 'All') return true;
            if (filter === 'Active') return ['pending', 'pending_acceptance', 'confirmed', 'in progress', 'in_progress'].includes(status);
            if (filter === 'History') return ['completed', 'cancelled'].includes(status);
            return true;
        });
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const handleClearHistory = async () => {
        const historyIds = bookings.filter(b => ['Completed', 'Cancelled'].includes(b.status)).map(b => b.id);
        if (historyIds.length === 0) return;
        await deleteBookings(historyIds);
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        await deleteBookings(Array.from(selectedIds));
        setSelectedIds(new Set());
    };

    const deleteBookings = async (ids: string[]) => {
        try {
            const res = await fetch('/api/v1/bookings', {
                method: 'DELETE',
                headers: getAuthHeaders(),
                body: JSON.stringify({ ids })
            });
            if (res.ok) {
                setBookings(prev => prev.filter(b => !ids.includes(b.id)));
            }
        } catch (error) {
            console.error("Failed to delete bookings", error);
        }
    };

    const getStatusColor = (status: BookingStatus) => {
        switch (status) {
            case 'Pending': return 'text-yellow-400 border-yellow-400/50 bg-yellow-400/10';
            case 'pending_acceptance': return 'text-amber-400 border-amber-400/50 bg-amber-400/10';
            case 'Confirmed': return 'text-blue-400 border-blue-400/50 bg-blue-400/10';
            case 'In Progress': return 'text-[var(--color-seva-glow)] border-[var(--color-seva-glow)]/50 bg-[var(--color-seva-glow)]/10';
            case 'Completed': return 'text-green-400 border-green-400/50 bg-green-400/10';
            case 'Cancelled': return 'text-red-400 border-red-400/50 bg-red-400/10';
            default: return 'text-gray-400';
        }
    };

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <div className="h-10 w-48 bg-white/5 animate-pulse rounded-xl" />
                </div>
                <BookingSkeleton />
            </div>
        );
    }

    const filteredBookings = getFilteredBookings();

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold font-[family-name:var(--font-display)]">My Bookings</h1>
                <div className="flex items-center gap-4">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            className="px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors border border-red-400/20"
                        >
                            Delete Selected ({selectedIds.size})
                        </button>
                    )}
                    {filter === 'History' && bookings.some(b => ['Completed', 'Cancelled'].includes(b.status)) && (
                        <button
                            onClick={handleClearHistory}
                            className="px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors border border-red-400/20"
                        >
                            Clear History
                        </button>
                    )}
                </div>
            </div>

            <div className="flex gap-2 text-sm border-b border-white/5 pb-1">
                {['All', 'Active', 'History'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab as any)}
                        className={clsx(
                            "px-4 py-2 rounded-lg transition-all",
                            filter === tab ? "bg-white/10 text-white font-medium" : "text-white/60 hover:text-white hover:bg-white/5"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {filteredBookings.length === 0 ? (
                <div className="text-center py-12 glass-panel rounded-2xl">
                    <p className="text-white/60 mb-4">No bookings found in {filter}.</p>
                    {filter !== 'All' && (
                        <button onClick={() => setFilter('All')} className="text-[var(--color-seva-accent)] hover:underline">
                            View All Bookings
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredBookings.map((booking) => {
                        const assignedHelper = booking.helperId ? helpers[booking.helperId] : null;

                        return (
                            <div
                                key={booking.id}
                                className={clsx(
                                    "glass-card rounded-2xl overflow-hidden transition-all border-l-4",
                                    selectedIds.has(booking.id) ? "border-l-[var(--color-seva-accent)] bg-white/5" : "border-l-transparent"
                                )}
                            >
                                <div className="p-6 flex items-start gap-4">
                                    <div className="pt-1">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(booking.id)}
                                            onChange={() => toggleSelection(booking.id)}
                                            className="w-5 h-5 rounded border-gray-600 bg-black/20 text-[var(--color-seva-accent)] focus:ring-offset-0 focus:ring-0 cursor-pointer"
                                        />
                                    </div>

                                    <div
                                        className="flex-1 cursor-pointer"
                                        onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-xl font-bold">{booking.serviceType}</h3>
                                                    <span className={clsx("text-xs px-2 py-0.5 rounded-full border", getStatusColor(booking.status))}>
                                                        {STATUS_LABELS[booking.status] || booking.status}
                                                    </span>
                                                    {booking.status === 'pending_acceptance' && (
                                                        <span className="flex items-center gap-1 text-[10px] text-amber-400 animate-pulse">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Searching...
                                                        </span>
                                                    )}
                                                    {booking.urgency === 'Urgent' && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full border border-red-400/50 text-red-400 bg-red-400/10 flex items-center gap-1">
                                                            <AlertCircle size={10} /> Urgent
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-white/50">ID: {booking.id}</p>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <p className="font-bold text-lg">{booking.price ? `₹${booking.price}` : 'Estimating...'}</p>
                                                <p className="text-xs text-white/60">{new Date(booking.scheduledDate).toLocaleDateString()}</p>
                                                {booking.otp && booking.status !== 'Completed' && booking.status !== 'Cancelled' && (
                                                    <div className="mt-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-lg px-3 py-1.5">
                                                        <p className="text-[10px] text-emerald-300/70 uppercase tracking-wider font-medium">Verification OTP</p>
                                                        <p className="text-lg font-mono font-bold text-emerald-400 tracking-[0.3em]">{booking.otp}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                <div className={clsx(
                                    "border-t border-white/5 bg-white/[0.02] transition-all duration-300 ease-in-out px-6",
                                    expandedId === booking.id ? "max-h-[600px] py-6 opacity-100" : "max-h-0 py-0 opacity-0 overflow-hidden"
                                )}>
                                    {/* Status Tracker */}
                                    {booking.status !== 'Cancelled' && (
                                        <div className="flex items-center justify-between relative mb-8 px-4">
                                            {/* Connector segments */}
                                            <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-0.5 flex -z-10">
                                                {STATUS_STEPS.slice(1).map((_, i) => {
                                                    const isSegmentCompleted = STATUS_STEPS.indexOf(booking.status) > i;
                                                    return (
                                                        <div 
                                                            key={i} 
                                                            className={clsx(
                                                                "flex-1 h-full transition-all duration-700",
                                                                isSegmentCompleted ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-white/10"
                                                            )}
                                                        />
                                                    );
                                                })}
                                            </div>

                                            {STATUS_STEPS.map((step, index) => {
                                                const isCompleted = STATUS_STEPS.indexOf(booking.status) >= index;
                                                const isCurrent = booking.status === step;

                                                return (
                                                    <div key={step} className="flex flex-col items-center gap-2 relative">
                                                        <div className={clsx(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-500 relative z-10",
                                                            isCompleted ? "bg-green-500 border-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)] scale-110" : "bg-black/40 border-white/20 text-white/30 backdrop-blur-md"
                                                        )}>
                                                            {isCompleted ? <CheckCircle size={16} /> : <Circle size={16} />}
                                                        </div>
                                                        <span className={clsx("text-[10px] font-bold tracking-widest uppercase transition-colors duration-500 whitespace-nowrap px-1", isCurrent ? "text-white" : "text-white/30")}>
                                                            {STATUS_LABELS[step] || step}
                                                        </span>
                                                        {isCurrent && (
                                                            <motion.div 
                                                                layoutId={`pulse-${booking.id}`}
                                                                className="absolute -top-1 -left-1 -right-1 -bottom-5 border border-[var(--color-seva-accent)]/30 rounded-xl"
                                                                animate={{ opacity: [0.2, 0.5, 0.2] }}
                                                                transition={{ duration: 2, repeat: Infinity }}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/40">Details</h4>
                                            <div className="space-y-3">
                                                <div className="flex items-start gap-3 text-sm">
                                                    <Clock className="text-white/40 mt-0.5" size={16} />
                                                    <div>
                                                        <p className="text-white/40">Scheduled For</p>
                                                        <p>{new Date(booking.scheduledDate).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 text-sm">
                                                    <MapPin className="text-white/40 mt-0.5" size={16} />
                                                    <div>
                                                        <p className="text-white/40">Location</p>
                                                        <p>{booking.location}</p>
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 p-3 rounded-lg text-sm text-white/80">
                                                    "{booking.description}"
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/40">Assigned Professional</h4>
                                            {(booking as any).workerId ? (
                                                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg border border-white/10">
                                                        {((booking as any).workerName || 'H').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold">{(booking as any).workerName || 'Helper'}</p>
                                                        <div className="flex items-center gap-2 text-xs text-white/60">
                                                            {(booking as any).workerProfession && (
                                                                <span>{(booking as any).workerProfession}</span>
                                                            )}
                                                            {(booking as any).workerExperience > 0 && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>{(booking as any).workerExperience} yrs exp</span>
                                                                </>
                                                            )}
                                                            {(booking as any).workerVerified && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="text-green-400">✓ Verified</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="ml-auto flex flex-col gap-2">
                                                        {booking.status === 'Completed' && (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setReviewBooking(booking);
                                                                }}
                                                                className="text-xs bg-yellow-400/10 border border-yellow-400/20 px-4 py-2 rounded-lg hover:bg-yellow-400/20 transition-colors text-center font-bold flex items-center justify-center gap-2 text-yellow-400"
                                                            >
                                                                <Star size={14} />
                                                                Rate Service
                                                            </button>
                                                        )}
                                                        {booking.helperId && booking.helperId !== 'null' && (
                                                            <Link 
                                                                href={`/messages/${booking.helperId}`}
                                                                className="text-xs bg-white/5 border border-white/10 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-center font-bold flex items-center justify-center gap-2 text-blue-400"
                                                            >
                                                                Chat
                                                            </Link>
                                                        )}
                                                        <Link 
                                                            href={`/bookings/track/${booking.id}`}
                                                            className="text-xs bg-[var(--color-seva-accent)] px-4 py-2 rounded-lg hover:bg-[var(--color-seva-accent)]/80 transition-all font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                                                        >
                                                            <Navigation size={14} className="rotate-45" />
                                                            Track
                                                        </Link>
                                                        {(booking as any).workerPhone && (
                                                            <a href={`tel:${(booking as any).workerPhone}`} className="text-xs bg-white/5 border border-white/10 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-center">
                                                                Call
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-white/5 p-4 rounded-xl flex items-center gap-3 text-white/50 italic text-sm">
                                                    <User size={20} />
                                                    {booking.status === 'pending_acceptance' 
                                                        ? '🔍 Finding a nearby helper for you... This updates in real-time.' 
                                                        : booking.status === 'Pending' 
                                                        ? 'Matching you with a helper...' 
                                                        : 'Worker will be assigned shortly.'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )
            }
            
            {reviewBooking && (
                <ReviewModal 
                    isOpen={!!reviewBooking}
                    onClose={() => setReviewBooking(null)}
                    bookingId={reviewBooking.id}
                    workerId={(reviewBooking as any).workerId || ''}
                    workerName={(reviewBooking as any).workerName || 'Professional'}
                    onSubmitSuccess={() => {
                        // Optional: show a toast or refresh
                        fetchData();
                    }}
                />
            )}
        </div >
    );
}
