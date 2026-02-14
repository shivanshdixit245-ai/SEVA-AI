'use client';

import { useState, useEffect } from 'react';
import { Star, MapPin, CheckCircle, Clock } from 'lucide-react';
import { Helper } from '@/types/booking';
import clsx from 'clsx';
import Link from 'next/link';

export default function HelpersPage() {
    const [helpers, setHelpers] = useState<Helper[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHelpers();
    }, []);

    async function fetchHelpers() {
        try {
            const res = await fetch('/api/helpers');
            if (res.ok) {
                const data = await res.json();
                setHelpers(data);
            }
        } catch (error) {
            console.error('Failed to fetch helpers', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-[var(--color-seva-accent)] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold font-[family-name:var(--font-display)]">Our Service Partners</h1>
                <p className="text-white/80 max-w-2xl mx-auto">
                    Meet our top-rated professionals ready to help you. All helpers are verified and background checked.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {helpers.map((helper, index) => (
                    <div
                        key={helper.id}
                        className="glass-card p-6 rounded-2xl flex flex-col gap-4 hover:bg-white/5 transition-all group"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
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
                    </div>
                ))}
            </div>
        </div>
    );
}
