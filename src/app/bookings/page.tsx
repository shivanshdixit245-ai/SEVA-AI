'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { Booking, BookingStatus, Helper } from '@/types/booking';
import clsx from 'clsx';
import Link from 'next/link';

import { useAuth } from '@/context/AuthContext';

const STATUS_STEPS: BookingStatus[] = ['Pending', 'Confirmed', 'In Progress', 'Completed'];

export default function BookingsPage() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [helpers, setHelpers] = useState<Record<string, Helper>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'All' | 'Active' | 'History'>('Active');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    async function fetchData() {
        if (!user) return;
        setLoading(true);
        try {
            const [bookingsRes, helpersRes] = await Promise.all([
                fetch(`/api/bookings?userId=${user.id}`),
                fetch('/api/helpers')
            ]);

            if (bookingsRes.ok && helpersRes.ok) {
                const bookingsData = await bookingsRes.json();
                const helpersData: Helper[] = await helpersRes.json();

                setBookings(bookingsData);

                // Create a map of helpers for easy lookup
                const helpersMap: Record<string, Helper> = {};
                helpersData.forEach(h => {
                    helpersMap[h.id] = h;
                });
                setHelpers(helpersMap);
            }
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    }

    const getFilteredBookings = () => {
        return bookings.filter(b => {
            if (filter === 'All') return true;
            if (filter === 'Active') return ['Pending', 'Confirmed', 'In Progress'].includes(b.status);
            if (filter === 'History') return ['Completed', 'Cancelled'].includes(b.status);
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
            const res = await fetch('/api/bookings', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
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
            case 'Confirmed': return 'text-blue-400 border-blue-400/50 bg-blue-400/10';
            case 'In Progress': return 'text-[var(--color-seva-glow)] border-[var(--color-seva-glow)]/50 bg-[var(--color-seva-glow)]/10';
            case 'Completed': return 'text-green-400 border-green-400/50 bg-green-400/10';
            case 'Cancelled': return 'text-red-400 border-red-400/50 bg-red-400/10';
            default: return 'text-gray-400';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-[var(--color-seva-accent)] border-t-transparent rounded-full animate-spin"></div>
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
                                                        {booking.status}
                                                    </span>
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
                                            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/10 -z-10" />
                                            {STATUS_STEPS.map((step, index) => {
                                                const isCompleted = STATUS_STEPS.indexOf(booking.status) >= index;
                                                const isCurrent = booking.status === step;

                                                return (
                                                    <div key={step} className="flex flex-col items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-sm">
                                                        <div className={clsx(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center border transition-all",
                                                            isCompleted ? "bg-green-500 border-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]" : "bg-transparent border-white/20 text-white/30"
                                                        )}>
                                                            {isCompleted ? <CheckCircle size={16} /> : <Circle size={16} />}
                                                        </div>
                                                        <span className={clsx("text-xs font-bold tracking-wide", isCurrent ? "text-white" : "text-white/50")}>
                                                            {step}
                                                        </span>
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
                                            {assignedHelper ? (
                                                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl">
                                                    <img
                                                        src={assignedHelper.avatar}
                                                        alt={assignedHelper.name}
                                                        className="w-12 h-12 rounded-full border border-white/10 object-cover"
                                                    />
                                                    <div>
                                                        <Link href={`/helpers/${assignedHelper.id}`} className="font-bold hover:underline hover:text-[var(--color-seva-accent)]">
                                                            {assignedHelper.name}
                                                        </Link>
                                                        <div className="flex items-center gap-1 text-xs text-white/60">
                                                            <span className="text-yellow-400">⭐ {assignedHelper.rating}</span>
                                                            <span>•</span>
                                                            <span>{assignedHelper.completedJobs} Jobs</span>
                                                        </div>
                                                    </div>
                                                    <button className="ml-auto text-xs bg-[var(--color-seva-accent)] px-3 py-1.5 rounded-lg hover:bg-[var(--color-seva-accent)]/80 transition-colors">
                                                        Call
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="bg-white/5 p-4 rounded-xl flex items-center gap-3 text-white/50 italic text-sm">
                                                    <User size={20} />
                                                    {booking.status === 'Pending' ? 'Matching you with a helper...' : 'Worker will be assigned shortly.'}
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
        </div >
    );
}
