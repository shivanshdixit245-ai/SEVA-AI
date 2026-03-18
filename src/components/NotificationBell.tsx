'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, MessageSquare, CheckCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import Link from 'next/link';

interface NotificationItem {
    id: string;
    type: 'message' | 'booking';
    title: string;
    content: string;
    timestamp: string;
    link: string;
    read: boolean;
}

export default function NotificationBell() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch initial notifications
    useEffect(() => {
        if (!user) return;

        const fetchNotifications = async () => {
            try {
                // Fetch recent bookings relevant to user
                let bookingQuery = supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(20);
                if (user.role === 'worker') {
                    bookingQuery = bookingQuery.or(`worker_id.eq.${user.id},status.eq.pending_acceptance`);
                } else if (user.role === 'client') {
                    bookingQuery = bookingQuery.eq('user_id', user.id);
                }

                const { data: bData } = await bookingQuery;

                // Fetch recent messages via API
                const mRes = await fetch(`/api/v1/messages?userId=${user.id}&helperId=all`);
                let mData = [];
                if (mRes.ok) {
                    mData = await mRes.json();
                }

                const notifs: NotificationItem[] = [];
                
                // Map Bookings
                if (bData) {
                    bData.forEach((b: any) => {
                        let include = false;
                        let title = '';
                        let content = '';

                        if (user.role === 'worker' && b.status === 'pending_acceptance') {
                            include = true;
                            title = 'New Job Available';
                            content = `${b.service_type} in ${b.location}`;
                        } else if (user.role === 'worker' && b.worker_id === user.id && ['Confirmed', 'In Progress'].includes(b.status)) {
                            // Don't show active ongoing jobs as notifications unless they just assigned
                            if (new Date(b.accepted_at).getTime() > Date.now() - 86400000) {
                                include = true;
                                title = 'Job Accepted';
                                content = `You accepted ${b.service_type}`;
                            }
                        } else if (user.role === 'client' && b.status !== 'pending_acceptance' && b.status !== 'Pending') {
                            include = true;
                            title = `Booking ${b.status}`;
                            content = `${b.worker_name || 'A helper'} for ${b.service_type}`;
                        }

                        if (include) {
                            notifs.push({
                                id: `b-${b.id}-${b.status}`,
                                type: 'booking',
                                title,
                                content,
                                timestamp: b.status === 'pending_acceptance' ? b.created_at : (b.accepted_at || b.created_at),
                                link: user.role === 'worker' ? '/worker/jobs' : `/bookings/track/${b.id}`,
                                read: false
                            });
                        }
                    });
                }

                // Map Messages
                if (mData) {
                    mData.slice(0, 20).forEach((m: any) => {
                        notifs.push({
                            id: `m-${m.id}`,
                            type: 'message',
                            title: 'New Message',
                            content: m.content,
                            timestamp: new Date(m.timestamp).toISOString(),
                            link: user.role === 'worker' ? '/worker/chats' : `/messages/${m.senderId}`,
                            read: false
                        });
                    });
                }

                // Sort by timestamp
                notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                // Apply read status from local storage
                const lastCheck = localStorage.getItem(`notif_last_check_${user.id}`);
                const checkTime = lastCheck ? new Date(lastCheck).getTime() : 0;
                
                const finalNotifs = notifs.map(n => ({
                    ...n,
                    read: new Date(n.timestamp).getTime() <= checkTime
                })).slice(0, 15); // Keep top 15

                setNotifications(finalNotifs);
                setUnreadCount(finalNotifs.filter(n => !n.read).length);

            } catch (e) { console.error('Error fetching notifications', e); }
        };

        fetchNotifications();
    }, [user]);

    // Update real-time (Listen to bookings & messages)
    useSupabaseRealtime({
        table: 'bookings',
        onData: () => {
            // Very simplified: just reload
            // In a huge app we'd inject the specific notif
            if (user) window.dispatchEvent(new Event('reload_notifs'));
        },
        enabled: !!user
    });

    useEffect(() => {
        if (!user) return;

        // Listen for new messages across all conversations for this user
        const channel = supabase
            .channel(`public:messages:notif-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${user.id}`
                },
                (payload) => {
                    const m = payload.new as any;
                    console.log('[REALTIME DEBUG] NotificationBell received DB change:', m);
                    
                    const newNotif: NotificationItem = {
                        id: `m-${m.id}`,
                        type: 'message',
                        title: 'New Message',
                        content: m.content,
                        timestamp: m.created_at,
                        link: user.role === 'worker' ? '/worker/chats' : `/messages/${m.sender_id}`,
                        read: false
                    };
                    
                    setNotifications(prev => {
                        if (prev.find(n => n.id === newNotif.id)) return prev;
                        return [newNotif, ...prev].slice(0, 15);
                    });
                    setUnreadCount(prev => prev + 1);
                }
            )
            .subscribe((status) => {
                console.log(`[REALTIME DEBUG] NotificationBell DB Subscription:`, status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    // Hook up reload listener
    useEffect(() => {
        const handler = () => { /* re-fetch logic could go here but too heavy, we'll rely on local state updates */ };
        window.addEventListener('reload_notifs', handler);
        return () => window.removeEventListener('reload_notifs', handler);
    }, []);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen && user) {
            setUnreadCount(0);
            localStorage.setItem(`notif_last_check_${user.id}`, new Date().toISOString());
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }
    };

    const timeSince = (d: string) => {
        const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
        if (m < 1) return 'now';
        if (m < 60) return `${m}m`;
        if (m < 1440) return `${Math.floor(m / 60)}h`;
        return `${Math.floor(m / 1440)}d`;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={handleOpen}
                className="relative p-2.5 text-white/60 hover:text-white transition-all hover:bg-white/10 rounded-xl active:scale-95 group"
            >
                <Bell size={20} className="group-hover:rotate-12 transition-transform" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-black/50"></span>
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-full right-0 mt-3 w-80 md:w-96 glass-panel border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[100] backdrop-blur-3xl"
                    >
                        <div className="p-5 border-b border-white/5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-3xl flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg text-white">Notifications</h3>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Activity Feed</p>
                            </div>
                            {unreadCount > 0 ? (
                                <span className="text-[10px] bg-[var(--color-seva-accent)] text-white px-2.5 py-1 rounded-full font-bold shadow-lg shadow-blue-500/40">
                                    {unreadCount} NEW
                                </span>
                            ) : (
                                <button className="text-[10px] text-white/20 hover:text-white/40 transition-colors uppercase font-bold tracking-wider">
                                    Clear all
                                </button>
                            )}
                        </div>
                        
                        <div className="max-h-[450px] overflow-y-auto scrollbar-hide py-2">
                            {notifications.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/5">
                                        <Bell className="text-white/10" size={24} />
                                    </div>
                                    <h4 className="text-white/60 font-bold mb-1">Silence is golden</h4>
                                    <p className="text-white/30 text-xs">No updates at the moment. We'll alert you when something happens.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col px-2 gap-1">
                                    {notifications.map((notif) => (
                                        <motion.div
                                            key={notif.id}
                                            whileHover={{ x: 4 }}
                                            className="contents"
                                        >
                                            <Link 
                                                href={notif.link} 
                                                onClick={() => setIsOpen(false)}
                                                className={`group p-4 rounded-2xl transition-all flex gap-4 ${!notif.read ? 'bg-white/[0.05] border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}
                                            >
                                                <div className="flex-shrink-0 mt-0.5">
                                                    {notif.type === 'message' ? (
                                                        <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                                                            <MessageSquare size={18} />
                                                        </div>
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-2xl bg-green-500/20 text-green-400 flex items-center justify-center border border-green-500/20 group-hover:bg-green-500/30 transition-colors">
                                                            {notif.title.includes('Available') ? <Clock size={18} /> : <CheckCircle size={18} />}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className={`text-sm truncate leading-tight ${!notif.read ? 'font-bold text-white' : 'font-medium text-white/70'}`}>
                                                            {notif.title}
                                                        </p>
                                                        <span className="text-[10px] text-white/20 flex-shrink-0 font-mono mt-0.5">
                                                            {timeSince(notif.timestamp)}
                                                        </span>
                                                    </div>
                                                    <p className={`text-xs mt-1.5 line-clamp-2 leading-relaxed ${!notif.read ? 'text-white/60' : 'text-white/30'}`}>
                                                        {notif.content}
                                                    </p>
                                                </div>
                                                {!notif.read && (
                                                    <div className="flex-shrink-0 self-center">
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                                                    </div>
                                                )}
                                            </Link>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 border-t border-white/5 bg-black/20 text-center">
                            <button className="text-[10px] text-white/40 hover:text-white transition-colors uppercase tracking-[0.2em] font-bold">
                                View all Notifications
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
