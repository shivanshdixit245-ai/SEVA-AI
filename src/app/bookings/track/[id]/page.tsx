'use client';

import { useState, useEffect, useRef, use } from 'react';
import { MapPin, Phone, MessageSquare, Clock, Shield, ArrowLeft, Navigation, Star, Map as MapIcon } from 'lucide-react';
import Link from 'next/link';
import { Booking, Helper } from '@/types/booking';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { supabase } from '@/lib/supabase';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

export default function TrackingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [helper, setHelper] = useState<Helper | null>(null);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('Assigning tracker...');
    const [showPhone, setShowPhone] = useState(false);
    const [mapLoaded, setMapLoaded] = useState(false);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);

    useEffect(() => {
        fetchData();
        
        // Load Leaflet dynamically
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => setMapLoaded(true);
        document.head.appendChild(script);

        // Real-time status text logic
        const updateStatusText = (status: string) => {
            switch(status) {
                case 'pending_acceptance': setStatusText('Finding a helper near you...'); break;
                case 'Confirmed': setStatusText('Helper is on the way!'); break;
                case 'Arrived': setStatusText('Helper has arrived at your location.'); break;
                case 'Completed': setStatusText('Service completed successfully!'); break;
                default: setStatusText('Connecting to service tracker...');
            }
        };

        if (booking) updateStatusText(booking.status);

        return () => {
            if (mapRef.current) mapRef.current.remove();
        };
    }, [id]);

    // Initialize/Update Map
    useEffect(() => {
        if (!mapLoaded || !mapContainerRef.current || !booking) return;

        // @ts-ignore
        const L = window.L;
        if (!L) return;

        // Try to parse coordinates from booking location
        let clientPos: [number, number] = [28.4595, 77.0266]; // Gurgaon Default
        const coordMatch = booking.location.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (coordMatch) {
            clientPos = [parseFloat(coordMatch[1]), parseFloat(coordMatch[2])];
        } else if (booking.location.toLowerCase().includes('delhi')) {
            clientPos = [28.6139, 77.2090];
        }

        const startPos: [number, number] = [clientPos[0] - 0.01, clientPos[1] - 0.01];
        
        if (!mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current, {
                zoomControl: false,
                attributionControl: false
            }).setView(clientPos, 14);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 19
            }).addTo(mapRef.current);

            // Client Marker
            L.circleMarker(clientPos, {
                radius: 8,
                fillColor: "#3b82f6",
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(mapRef.current).bindPopup('Your Location');
        }

        // Use real live location if available, otherwise use simulated progress
        let lat = startPos[0] + (clientPos[0] - startPos[0]) * (progress / 100);
        let lng = startPos[1] + (clientPos[1] - startPos[1]) * (progress / 100);

        // If Supabase provides live_lat/live_lng, override the simulation
        if ((booking as any).liveLat && (booking as any).liveLng) {
            lat = parseFloat((booking as any).liveLat);
            lng = parseFloat((booking as any).liveLng);
        }

        if (!markerRef.current) {
            const helperIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center rotate-45 shadow-lg shadow-orange-500/50 border-2 border-white">
                        <div class="-rotate-45 text-white">📍</div>
                       </div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });
            markerRef.current = L.marker([lat, lng], { icon: helperIcon }).addTo(mapRef.current);
        } else {
            markerRef.current.setLatLng([lat, lng]);
        }

        // Auto-center occasionally
        if (progress % 20 < 5) {
            mapRef.current.panTo([lat, lng]);
        }

    }, [mapLoaded, progress, booking]);

    const fetchData = async () => {
        try {
            // Fetch directly from Supabase (fast, no debug-all fetch)
            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('id', id)
                .single();

            if (data && !error) {
                const mappedBooking = {
                    ...data,
                    userId: data.user_id,
                    helperId: data.worker_id || data.helper_id,
                    serviceType: data.service_type,
                    scheduledDate: data.scheduled_date,
                    createdAt: data.created_at,
                    price: data.price || 0,
                    location: data.location || '',
                    description: data.description || '',
                    urgency: data.urgency || 'Normal',
                    status: data.status,
                    liveLat: data.live_lat,
                    liveLng: data.live_lng
                };
                setBooking(mappedBooking as any);

                // Fetch helper profile
                if (data.worker_id) {
                    setHelper({
                        id: data.worker_id,
                        name: data.worker_name || 'Service Provider',
                        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.worker_name || 'Worker')}&background=0D8ABC&color=fff`,
                        phone: data.worker_phone || 'N/A',
                        skills: [data.worker_profession || mappedBooking.serviceType],
                        rating: 5.0,
                        completedJobs: 1,
                        isAvailable: false,
                        location: mappedBooking.location,
                        experience: data.worker_experience || 0,
                        description: 'Verified Service Provider',
                        reviews: []
                    });
                } else if (mappedBooking.helperId) {
                    try {
                        const hRes = await fetch(`/api/v1/helpers/${mappedBooking.helperId}`);
                        if (hRes.ok) setHelper(await hRes.json());
                    } catch (e) { console.error('Helper fetch error', e); }
                }
            }
        } catch (e) { 
            console.error('Tracking fetch error:', e); 
        }
    };

    useSupabaseRealtime({
        table: 'bookings',
        filter: `id=eq.${id}`,
        onData: (payload) => {
            const record = payload.new as any;
            if (record) {
                setBooking(prev => prev ? {
                    ...prev,
                    status: record.status,
                    price: record.price,
                    liveLat: record.live_lat,
                    liveLng: record.live_lng
                } as any : null);
            }
        },
        enabled: true
    });

    if (!booking) return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-white/40">
            <div className="w-12 h-12 border-4 border-[var(--color-seva-accent)] border-t-transparent rounded-full animate-spin mb-4" />
            <p>Locating your helper...</p>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-[fadeIn_0.5s_ease-out] pb-20">
            <Link href="/bookings" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <ArrowLeft size={18} /> Back to My Bookings
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tracking View */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-panel rounded-3xl overflow-hidden relative aspect-[4/3] md:aspect-video bg-black/40">
                        {/* Real Map */}
                        <div ref={mapContainerRef} className="absolute inset-0 z-0" />
                        
                        {!mapLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 backdrop-blur-sm">
                                <div className="flex flex-col items-center gap-3">
                                    <MapIcon className="animate-pulse text-white/20" size={40} />
                                    <p className="text-xs text-white/40 font-medium tracking-widest uppercase">Initializing Map Radar</p>
                                </div>
                            </div>
                        )}

                        {/* Top Overlay Stats */}
                        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between pointer-events-none">
                            <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl">
                                <p className="text-[10px] text-white/40 font-bold uppercase mb-0.5">Live Tracking</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-xs font-bold text-white uppercase tracking-wider">Active</span>
                                </div>
                            </div>
                        </div>

                        <div className="absolute bottom-6 left-6 right-6 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 flex items-center gap-4 z-20">
                            <div className="flex-1">
                                <p className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">Status</p>
                                <p className="text-sm font-semibold text-white truncate">{statusText}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-white/40 font-bold uppercase tracking-widest mb-1">Passcode</p>
                                <p className="text-sm font-bold text-[var(--color-seva-accent)] tracking-widest">{(booking as any).otp || '----'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Progress Steps */}
                    <div className="glass-panel rounded-2xl p-6">
                         <div className="flex items-center justify-between mb-8">
                            <h2 className="font-bold">Booking Progress</h2>
                            <span className="text-xs bg-white/5 px-3 py-1 rounded-full text-white/60">ID: {booking.id}</span>
                         </div>
                         
                         <div className="relative pl-8 space-y-10">
                            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-white/5" />
                            
                            {[
                                { status: 'Confirmed', desc: 'Booking confirmed and professional assigned.', activeOn: ['Confirmed', 'Arrived', 'Completed'] },
                                { status: 'Arrived', desc: 'Professional has reached your location.', activeOn: ['Arrived', 'Completed'] },
                                { status: 'Completed', desc: 'Service successfully finished.', activeOn: ['Completed'] }
                            ].map((step, i) => {
                                const isDone = step.activeOn.includes(booking.status);
                                const isCurrent = booking.status === step.status;

                                return (
                                    <div key={i} className="relative group">
                                        <div className={clsx(
                                            "absolute -left-7 top-1 w-4 h-4 rounded-full border-4 transition-all z-10 shadow-[0_0_10px_rgba(255,255,255,0.1)]",
                                            isDone ? "bg-green-500 border-green-500 shadow-green-500/50" : "bg-black border-white/20",
                                            isCurrent && "animate-pulse border-[var(--color-seva-accent)]"
                                        )} />
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className={clsx("font-bold", isDone ? "text-white" : "text-white/40")}>{step.status}</h3>
                                                <p className="text-sm text-white/40 mt-1 max-w-sm">{step.desc}</p>
                                            </div>
                                            <span className="text-xs font-mono text-white/20">
                                                {isDone ? 'Completed' : isCurrent ? 'Active' : '--:--'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                         </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {/* Helper Card */}
                    <AnimatePresence mode="wait">
                        {helper && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card rounded-3xl p-6 border border-white/10 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full" />
                                
                                <div className="flex flex-col items-center text-center gap-4 relative z-10">
                                    <div className="relative">
                                        <img src={helper.avatar} className="w-24 h-24 rounded-full border-4 border-white/10 object-cover" />
                                        <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-4 border-[#0a0a0a] rounded-full" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">{helper.name}</h3>
                                        <div className="flex items-center justify-center gap-1 text-yellow-400 mt-1">
                                            <Star size={16} fill="currentColor" />
                                            <span className="font-bold">{helper.rating}</span>
                                            <span className="text-white/40 text-xs">({helper.completedJobs} Jobs)</span>
                                        </div>
                                    </div>

                                    {/* Phone Number Reveal */}
                                    <div className="w-full mt-2">
                                        <AnimatePresence mode="wait">
                                            {showPhone ? (
                                                <motion.div 
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className="bg-white/5 border border-white/10 rounded-2xl py-3 px-4 flex items-center justify-between"
                                                >
                                                    <span className="text-lg font-mono font-bold tracking-tighter text-blue-400">{helper.phone}</span>
                                                    <a href={`tel:${helper.phone}`} className="p-2 bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors">
                                                        <Phone size={16} className="text-white" />
                                                    </a>
                                                </motion.div>
                                            ) : (
                                                <button 
                                                    onClick={() => setShowPhone(true)}
                                                    className="w-full bg-[var(--color-seva-accent)]/10 hover:bg-[var(--color-seva-accent)]/20 border border-[var(--color-seva-accent)]/30 text-[var(--color-seva-accent)] py-3 rounded-2xl text-sm font-bold transition-all active:scale-95"
                                                >
                                                    Reveal Phone Number
                                                </button>
                                            )}
                                        </AnimatePresence>
                                        <p className="text-[10px] text-white/30 mt-2 italic">Call only for service directions</p>
                                    </div>

                                    <div className="grid grid-cols-2 w-full gap-3 pt-4 border-t border-white/5 mt-2">
                                        {helper.id && helper.id !== 'null' && (
                                            <Link 
                                                href={`/messages/${helper.id}`} 
                                                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 py-3 rounded-2xl transition-all group"
                                            >
                                                <MessageSquare size={18} className="group-hover:text-blue-400 transition-colors" />
                                                <span className="text-sm font-bold">Chat</span>
                                            </Link>
                                        )}
                                        <a href={`tel:${helper.phone}`} className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 py-3 rounded-2xl transition-all group">
                                            <Phone size={18} className="group-hover:text-green-400 transition-colors" />
                                            <span className="text-sm font-bold">Quick Call</span>
                                        </a>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Safety Shield */}
                    <div className="glass-panel rounded-2xl p-4 bg-emerald-500/5 border-emerald-500/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <Shield size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-emerald-400">Secure Service</p>
                                <p className="text-xs text-emerald-400/60">Verified Professional</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel rounded-2xl p-6 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white/30">Booking Details</h4>
                        <div className="space-y-3">
                             <div className="flex items-center justify-between text-sm">
                                <span className="text-white/40">Service</span>
                                <span className="font-semibold">{booking.serviceType}</span>
                             </div>
                             <div className="flex items-center justify-between text-sm">
                                <span className="text-white/40">Amount</span>
                                <span className="font-bold text-lg">₹{booking.price}</span>
                             </div>
                             <div className="pt-3 border-t border-white/5">
                                <p className="text-xs text-white/40 mb-1">Job Description</p>
                                <p className="text-sm leading-relaxed text-white/80 italic">"{booking.description}"</p>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
