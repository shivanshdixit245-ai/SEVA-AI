
'use client';

import { useState, useEffect, use } from 'react';
import { Star, MapPin, CheckCircle, Clock, Shield, Calendar, ArrowLeft } from 'lucide-react';
import { Helper } from '@/types/booking';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/context/AuthContext';

export default function HelperProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { user, selectedLocation, getAuthHeaders } = useAuth();
    const [helper, setHelper] = useState<Helper | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchHelper();
    }, [id]);

    async function fetchHelper() {
        try {
            const res = await fetch(`/api/v1/helpers/${id}`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setHelper(data);
            }
        } catch (error) {
            console.error('Failed to fetch helper', error);
        } finally {
            setLoading(false);
        }
    }

    const handleHire = async () => {
        if (!helper) return;

        // In a real app, this might open a booking modal or redirect to a booking page
        // For now, let's create a booking via API directly or redirect to a booking form
        // Simulating redirect to chat or booking page with context

        if (!user) {
            router.push('/login'); // Redirect to login if not authenticated
            return;
        }

        // For simplicity, let's create a pending booking and redirect to 'My Bookings'
        try {
            const bookingData = {
                serviceType: helper.skills[0], // Default to primary skill
                description: `Booking request for ${helper.name}`,
                location: selectedLocation || 'My Location',
                urgency: 'Normal',
                helperId: helper.id,
                price: 500, // Placeholder
                userId: user.id
            };

            const res = await fetch('/api/v1/bookings', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(bookingData)
            });

            if (res.ok) {
                router.push('/bookings');
            }
        } catch (error) {
            console.error('Booking failed', error);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-[var(--color-seva-accent)] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!helper) {
        return <div className="text-white text-center py-20">Helper not found</div>;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-[fadeIn_0.5s_ease-out]">
            <Link
                href="/helpers"
                className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors hover:-translate-x-1 duration-200"
            >
                <ArrowLeft size={20} />
                <span>Back to Workers</span>
            </Link>

            {/* Header Profile Card */}
            <div className="glass-panel rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-seva-accent)]/10 blur-[100px] rounded-full pointer-events-none" />

                <img
                    src={helper.avatar}
                    alt={helper.name}
                    className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white/10 shadow-xl object-cover"
                />

                <div className="flex-1 space-y-4 relative z-10">
                    <div>
                        <h1 className="text-3xl font-bold font-[family-name:var(--font-display)]">{helper.name}</h1>
                        <div className="flex items-center gap-2 text-white/60 mt-1">
                            <MapPin size={16} />
                            <span>{helper.location}</span>
                            <span className="mx-2">•</span>
                            <Clock size={16} />
                            <span>{helper.experience} Years Exp.</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {helper.skills.map(skill => (
                            <span key={skill} className="px-3 py-1 bg-white/10 rounded-full text-sm font-medium text-blue-200 border border-white/5">
                                {skill}
                            </span>
                        ))}
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                        <div className="flex items-center gap-1.5">
                            <Star className="text-yellow-400 fill-yellow-400" size={20} />
                            <span className="text-xl font-bold">{helper.rating}</span>
                            <span className="text-white/50 text-sm">({helper.reviews?.length || 0} reviews)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <CheckCircle className="text-green-400" size={20} />
                            <span className="text-xl font-bold">{helper.completedJobs}+</span>
                            <span className="text-white/50 text-sm">Jobs Done</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[200px] relative z-10">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1">Privacy Protected</p>
                        <p className="text-xs text-white/60">Phone number visible after booking</p>
                    </div>
                    <button
                        onClick={handleHire}
                        disabled={!helper.isAvailable}
                        className="w-full bg-[var(--color-seva-accent)] hover:bg-[var(--color-seva-accent)]/80 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                        {helper.isAvailable ? 'Hire Now' : 'Currently Busy'}
                    </button>
                    <Link 
                        href={`/messages/${helper.id}`}
                        className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-semibold border border-white/10 transition-colors flex items-center justify-center"
                    >
                        Message
                    </Link>
                    {!helper.isAvailable && (
                        <p className="text-red-400 text-xs text-center font-medium bg-red-400/10 py-1 rounded-lg">
                            Not available right now
                        </p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* About & Stats */}
                <div className="md:col-span-2 space-y-6">
                    <div className="glass-card rounded-2xl p-6 space-y-4">
                        <h2 className="text-lg font-bold uppercase tracking-wider text-white/50 flex items-center gap-2">
                            <Shield size={18} /> About Me
                        </h2>
                        <p className="text-white/80 leading-relaxed">
                            {helper.description || "No description provided."}
                        </p>
                    </div>

                    <div className="glass-card rounded-2xl p-6 space-y-4">
                        <h2 className="text-lg font-bold uppercase tracking-wider text-white/50 flex items-center gap-2">
                            <Star size={18} /> Customer Reviews
                        </h2>

                        <div className="space-y-4">
                            {helper.reviews?.map((review) => (
                                <div key={review.id} className="bg-white/5 p-4 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold">
                                                {review.userName[0]}
                                            </div>
                                            <span className="font-semibold">{review.userName}</span>
                                        </div>
                                        <span className="text-xs text-gray-500">{review.date}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-yellow-400 text-xs">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-gray-600"} />
                                        ))}
                                    </div>
                                    <p className="text-sm text-gray-300 italic">"{review.comment}"</p>
                                </div>
                            )) || <p className="text-gray-500 italic">No reviews yet.</p>}
                        </div>
                    </div>
                </div>

                {/* Sidebar Stats / Info */}
                <div className="space-y-6">
                    <div className="glass-card rounded-2xl p-6 space-y-4">
                        <h3 className="font-bold text-white">Verification</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm text-white/70">
                                <CheckCircle size={16} className="text-green-400" />
                                <span>Identity Verified</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-white/70">
                                <CheckCircle size={16} className="text-green-400" />
                                <span>Background Check</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-white/70">
                                <CheckCircle size={16} className="text-green-400" />
                                <span>Skill Certified</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
