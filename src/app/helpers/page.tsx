'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, MapPin, CheckCircle, Clock } from 'lucide-react';
import { Helper } from '@/types/booking';
import clsx from 'clsx';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

const HelperSkeleton = () => (
    <div className="glass-card p-6 rounded-2xl flex flex-col gap-4 animate-pulse">
        <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/10" />
                <div className="space-y-2">
                    <div className="h-5 w-32 bg-white/10 rounded" />
                    <div className="h-4 w-20 bg-white/10 rounded" />
                </div>
            </div>
            <div className="w-3 h-3 rounded-full bg-white/10" />
        </div>
        <div className="flex gap-2">
            {[1, 2, 3].map(i => <div key={i} className="h-6 w-16 bg-white/10 rounded-full" />)}
        </div>
        <div className="h-4 w-full bg-white/10 rounded" />
        <div className="pt-4 mt-auto border-t border-white/5 flex gap-3">
            <div className="flex-1 h-9 bg-white/5 rounded-lg" />
            <div className="flex-1 h-9 bg-white/10 rounded-lg" />
        </div>
    </div>
);

import { useAuth } from '@/context/AuthContext';

export default function HelpersPage() {
    const { getAuthHeaders } = useAuth();
    const [helpers, setHelpers] = useState<(Helper & { isNew?: boolean })[]>([]);
    const [loading, setLoading] = useState(true);

    const mapHelper = (w: any): Helper & { isNew?: boolean } => ({
        id: w.id,
        name: w.name,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(w.name)}&background=random`,
        skills: w.profession ? [w.profession] : (w.skills || []),
        rating: w.rating || 0,
        completedJobs: w.completed_jobs || w.completedJobs || 0,
        isAvailable: w.is_available ?? w.isAvailable ?? true,
        location: w.address || w.location || 'Location Hidden',
        experience: w.experience || 0,
        description: w.bio || w.description || 'Professional SevaAI helper.',
        phone: w.phone || '+91 00000 00000',
        reviews: w.reviews || []
    });

    const fetchHelpers = useCallback(async () => {
        try {
            const res = await fetch('/api/v1/helpers', {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || 'Failed to fetch helpers');

            if (data) {
                setHelpers(data);
            }
        } catch (error) {
            console.error('Failed to fetch helpers:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHelpers();
    }, [fetchHelpers]);

    // Enable granular Realtime updates for an "instant" feel
    useSupabaseRealtime({
        table: 'workers',
        onData: (payload) => {
            console.log(`Partners Realtime: ${payload.eventType}`);
            
            if (payload.eventType === 'INSERT') {
                const newHelper = { ...mapHelper(payload.new), isNew: true };
                setHelpers(prev => {
                    if (prev.find(h => h.id === newHelper.id)) return prev;
                    return [newHelper, ...prev];
                });
            } else if (payload.eventType === 'UPDATE') {
                const updatedHelper = mapHelper(payload.new);
                setHelpers(prev => prev.map(h => h.id === updatedHelper.id ? { ...h, ...updatedHelper } : h));
            } else if (payload.eventType === 'DELETE') {
                const deletedId = payload.old.id;
                setHelpers(prev => prev.filter(h => h.id !== deletedId));
            }
        },
        enabled: true
    });

    return (
        <div className="space-y-8">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold font-[family-name:var(--font-display)] tracking-tight">Our Service Partners</h1>
                <p className="text-white/80 max-w-2xl mx-auto">
                    Meet our top-rated professionals ready to help you. All helpers are verified and background checked.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        [1, 2, 3, 4, 5, 6].map(i => <HelperSkeleton key={i} />)
                    ) : (
                        helpers.map((helper, index) => (
                        <motion.div
                            key={helper.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, x: -20 }}
                            transition={{ duration: 0.4, delay: helper.isNew ? 0 : index * 0.05 }}
                            className="glass-card p-6 rounded-2xl flex flex-col gap-4 hover:bg-white/5 transition-all group relative overflow-hidden"
                        >
                            {helper.isNew && (
                                <div className="absolute top-0 right-0">
                                    <div className="bg-gradient-to-l from-green-500 to-emerald-400 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-lg animate-pulse">
                                        NEW PARTNER
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <img
                                        src={helper.avatar}
                                        alt={helper.name}
                                        className="w-16 h-16 rounded-full border-2 border-white/10 object-cover"
                                    />
                                    <div>
                                        <h3 className="font-bold text-lg">{helper.name}</h3>
                                        <div className="flex items-center gap-1 text-yellow-400 text-sm">
                                            <Star size={14} fill="currentColor" />
                                            <span className="font-medium">{helper.rating}</span>
                                            <span className="text-white/50">({helper.completedJobs} jobs)</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={clsx(
                                    "w-3 h-3 rounded-full shadow-[0_0_8px]",
                                    helper.isAvailable ? "bg-green-500 shadow-green-500/50" : "bg-red-500 shadow-red-500/50"
                                )} />
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {helper.skills.slice(0, 3).map((skill) => (
                                    <span key={skill} className="px-3 py-1 bg-white/5 rounded-full text-xs font-medium text-white/70 border border-white/5">
                                        {skill}
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 text-sm text-white/60">
                                <MapPin size={16} />
                                <span>{helper.location}</span>
                            </div>

                            <div className="pt-4 mt-auto border-t border-white/5 flex gap-3">
                                <Link href={`/helpers/${helper.id}`} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg font-medium transition-colors text-sm text-center">
                                    View Profile
                                </Link>
                                <Link
                                    href={`/helpers/${helper.id}`}
                                    className={clsx(
                                        "flex-1 text-center py-2 rounded-lg font-medium transition-colors text-sm",
                                        helper.isAvailable
                                            ? "bg-[var(--color-seva-accent)] hover:bg-[var(--color-seva-accent)]/80 text-white"
                                            : "bg-white/10 cursor-not-allowed opacity-50 text-white/40"
                                    )}
                                >
                                    Hire Now
                                </Link>
                            </div>
                        </motion.div>
                    )))}
                </AnimatePresence>
            </div>
        </div>
    );
}
