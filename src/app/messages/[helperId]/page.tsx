'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { Send, ArrowLeft, MoreVertical, Phone, Star, ShieldCheck, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
// Removed unused useSupabaseRealtime
import { DirectMessage, Helper } from '@/types/booking';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

import { ChatSkeleton } from '@/components/Skeletons';

export default function DirectMessagePage({ params }: { params: Promise<{ helperId: string }> }) {
    const { helperId } = use(params);
    const [hasMounted, setHasMounted] = useState(false);
    const { user } = useAuth();
    
    useEffect(() => {
        setHasMounted(true);
    }, []);

    const [messages, setMessages] = useState<DirectMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [helper, setHelper] = useState<Helper | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const mountedRef = useRef(true);
    const channelRef = useRef<any>(null);

    // Helper to send messages over the realtime channel
    const broadcastMessage = (msg: DirectMessage) => {
        if (channelRef.current) {
            console.log(`[REALTIME DEBUG] Client broadcasting on ${channelRef.current.name}:`, msg);
            channelRef.current.send({
                type: 'broadcast',
                event: 'dm-receive',
                payload: msg,
            });
        }
    };

    const fetchHelper = useCallback(async () => {
        try {
            const res = await fetch(`/api/v1/helpers/${helperId}`);
            if (res.ok && mountedRef.current) setHelper(await res.json());
        } catch (e) { console.error(e); }
    }, [helperId]);

    const fetchMessages = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch(`/api/v1/messages?userId=${user.id}&helperId=${helperId}`);
            if (res.ok && mountedRef.current) {
                const data = await res.json();
                setMessages(data || []);
            }
        } catch (e) { console.error('Error fetching messages:', e); }
    }, [user, helperId]);

    const scrollToBottom = (instant = false) => {
        messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
    };

    useEffect(() => {
        mountedRef.current = true;
        
        // Safety timeout to ensure loading never hangs more than 8 seconds
        const safetyTimeout = setTimeout(() => {
            if (mountedRef.current) setIsLoading(false);
        }, 8000);

        if (!user) {
            // Keep loading true while auth is potentially initializing
            // But if it takes too long, the safety timeout will kick in
            return;
        }
        
        const init = async () => {
            try {
                let resolvedId = (window as any).__resolvedHelperId;
                const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

                // AGGRESSIVE RESOLVER: If helperId is "null" OR not a UUID, we must resolve it
                if (helperId === 'null' || !isUUID(helperId)) {
                    console.log('🚨 [WHATSAPP SYNC] Resolving professional UUID for reliable sync...');
                    
                    // Fetch the absolute latest bookings (no cache)
                    const res = await fetch(`/api/v1/bookings?userId=${user.id}&_t=${Date.now()}`);
                    const bks = await res.json();
                    
                    // Find the most recent active booking that has an assigned worker
                    const activeBooking = (bks || []).find((b: any) => 
                        ['Confirmed', 'In Progress'].includes(b.status) && b.helperId && b.helperId !== 'null'
                    );

                    if (activeBooking) {
                        resolvedId = activeBooking.helperId;
                        console.log('✅ [WHATSAPP SYNC] Resolved ID from booking:', resolvedId);
                    } else if (helperId !== 'null' && !isUUID(helperId)) {
                        // If it's a slug but no active booking, we still try to fetch the helper profile to get its UUID
                        const helperRes = await fetch(`/api/v1/helpers/${helperId}`);
                        if (helperRes.ok) {
                            const hData = await helperRes.json();
                            if (hData?.supabaseId && isUUID(hData.supabaseId)) {
                                resolvedId = hData.supabaseId;
                                console.log('✅ [WHATSAPP SYNC] Resolved ID from profile slug:', resolvedId);
                            }
                        }
                    }
                }

                const targetId = resolvedId || helperId;
                
                // REDIRECT if we have a UUID and the URL is using a slug/null
                if (isUUID(targetId) && targetId !== helperId) {
                    console.log('🔀 [WHATSAPP SYNC] Redirecting to verified UUID room:', targetId);
                    window.location.replace(`/messages/${targetId}`);
                    return; 
                }

                // Wait for data
                await Promise.all([fetchHelper(), fetchMessages()]);
            } catch (err) {
                console.error('[WHATSAPP SYNC] resolution error:', err);
            } finally {
                if (mountedRef.current) setIsLoading(false);
                clearTimeout(safetyTimeout);
            }
        };

        if (user) {
            init();
        }

        return () => { 
            mountedRef.current = false;
            clearTimeout(safetyTimeout);
        };
    }, [user, helperId, fetchHelper, fetchMessages]);

    const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [realtimeError, setRealtimeError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    // Realtime Database & Broadcast listener
    useEffect(() => {
        if (!user) return;

        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
        const safeUserId = String(user.id).toLowerCase().trim();
        let resolvedPeerId = helper?.supabaseId || (isUUID(helperId) ? helperId : null);
        
        if (!resolvedPeerId && !isUUID(helperId)) {
            console.log('[REALTIME DEBUG] Waiting for Peer UUID resolution...');
            return;
        }

        const finalPeerId = String(resolvedPeerId || helperId).toLowerCase().trim();
        const sortedIds = [safeUserId, finalPeerId].sort();
        const roomChannelName = `room:${sortedIds[0]}-${sortedIds[1]}`;
        
        console.log(`[REALTIME DEBUG] Client joining bulletproof room (Attempt ${retryCount + 1}): ${roomChannelName}`);
        setRealtimeStatus('connecting');
        setRealtimeError(null);

        // Self-healing timeout: If not connected in 8 seconds, retry
        const timeout = setTimeout(() => {
            if (realtimeStatus === 'connecting') {
                console.warn('[REALTIME] Connection timeout, retrying...');
                setRealtimeStatus('error');
                setRealtimeError('TIMEOUT');
            }
        }, 8000);

        const channel = supabase
            .channel(roomChannelName)
            .on('broadcast', { event: 'dm-receive' }, (payload) => {
                const msg = payload.payload as DirectMessage;
                if (String(msg.senderId).toLowerCase().trim() === finalPeerId) {
                    setMessages(prev => {
                        if (prev.find(m => m.id === msg.id)) return prev;
                        return [...prev, msg].sort((a, b) => a.timestamp - b.timestamp);
                    });
                    setTimeout(() => scrollToBottom(true), 10);
                }
            })
            .on('broadcast', { event: 'typing' }, (payload) => {
                if (String(payload.payload.senderId).toLowerCase().trim() !== safeUserId) {
                    setIsTyping(payload.payload.isTyping);
                }
            })
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${safeUserId}`
                },
                (payload) => {
                    const record = payload.new as any;
                    if (String(record.sender_id).toLowerCase().trim() === finalPeerId) {
                        const newMsg: DirectMessage = {
                            id: record.id,
                            senderId: record.sender_id,
                            receiverId: record.receiver_id,
                            content: record.content,
                            timestamp: new Date(record.created_at).getTime(),
                            bookingId: record.booking_id,
                            isRead: record.is_read
                        };
                        setMessages(prev => {
                            if (prev.find(m => m.id === newMsg.id)) return prev;
                            return [...prev, newMsg].sort((a, b) => a.timestamp - b.timestamp);
                        });
                        setTimeout(() => scrollToBottom(true), 10);
                    }
                }
            )
            .subscribe((status, err) => {
                console.log(`[REALTIME DEBUG] Client status [${status}]:`, err || '');
                clearTimeout(timeout);
                
                if (status === 'SUBSCRIBED') {
                    setRealtimeStatus('connected');
                    setRealtimeError(null);
                    channelRef.current = channel;
                } else {
                    setRealtimeStatus('error');
                    setRealtimeError(status);
                }
            });

        return () => {
            clearTimeout(timeout);
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [user, helper, helperId, retryCount]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputText(e.target.value);
        if (!user || (!helper && !helperId)) return;

        // Emit typing event
        const resolvedPeerId = helper?.supabaseId || helper?.id || helperId;
        const safeClientId = String(user.id).toLowerCase().trim();
        const safeHelperId = String(resolvedPeerId).toLowerCase().trim();
        const channelName = `dm-${[safeClientId, safeHelperId].sort().join('-')}`;
        
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { senderId: user.id, isTyping: true },
            });
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'typing',
                    payload: { senderId: user.id, isTyping: false },
                });
            }
        }, 3000);
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !user) return;

        const text = inputText.trim();
        setInputText('');

        // Stop typing indicator immediately
        const resolvedPeerId = helper?.supabaseId || helper?.id || helperId;
        const safeClientId = String(user.id).toLowerCase().trim();
        const safeHelperId = String(resolvedPeerId).toLowerCase().trim();
        const channelName = `dm-${[safeClientId, safeHelperId].sort().join('-')}`;
        
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { senderId: user.id, isTyping: false },
            });
        }

        // Optimistic update
        const optimisticMsg: DirectMessage = {
            id: crypto.randomUUID(),
            senderId: user.id,
            receiverId: resolvedPeerId, // Use resolved ID
            content: text,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setTimeout(() => scrollToBottom(true), 10);

        // 1. Instant Realtime Broadcast
        broadcastMessage(optimisticMsg);

        // 2. Background Persistence (Non-awaited)
        fetch('/api/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senderId: user.id,
                receiverId: resolvedPeerId,
                content: text
            })
        }).catch(err => console.error('Background message sync failed:', err));
    };

    if (!hasMounted) return null;

    if (isLoading && user) {
        return (
            <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                <div className="p-4 md:p-6 bg-white/5 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-4 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-white/5" />
                        <div className="space-y-2">
                            <div className="h-4 w-24 bg-white/5 rounded" />
                            <div className="h-3 w-16 bg-white/5 rounded" />
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <ChatSkeleton />
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-white/40 px-6 text-center">
                <ShieldCheck size={48} className="mb-4 text-white/10" />
                <h2 className="text-xl font-bold text-white mb-2">Private Connection</h2>
                <p className="max-w-xs mb-6 text-sm">Please log in to securely chat with your professional.</p>
                <Link href="/login" className="bg-[var(--color-seva-accent)] text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                    Sign In
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col glass-panel rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            {/* Header */}
            <div className="p-4 md:p-6 bg-white/5 border-b border-white/10 flex items-center justify-between backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <Link href="/bookings" className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-white/60" />
                    </Link>
                    {helper && (
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <img src={helper.avatar} className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/20 object-cover" />
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0a0a0a] rounded-full" />
                            </div>
                            <div>
                                <h2 className="font-bold text-white text-sm md:text-base">{helper.name}</h2>
                                <div className="flex items-center gap-2 text-xs text-white/40">
                                    <span className="flex items-center gap-1"><Star size={10} className="text-yellow-400 fill-yellow-400" /> {helper.rating}</span>
                                    <span>•</span>
                                    <div className="flex items-center gap-1.5">
                                        <div 
                                            className={clsx(
                                                "w-2 h-2 rounded-full",
                                                realtimeStatus === 'connected' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : 
                                                realtimeStatus === 'connecting' ? "bg-yellow-500 animate-pulse" : "bg-red-500"
                                            )} 
                                            title={`Real-time: ${realtimeStatus} ${realtimeError || ''}`}
                                        />
                                        <span className={clsx(
                                            "font-medium",
                                            realtimeStatus === 'connected' ? "text-green-400" : 
                                            realtimeStatus === 'error' ? "text-red-400" : "text-white/40"
                                        )}>
                                            {realtimeStatus === 'connected' ? 'Live' : 
                                             realtimeStatus === 'error' ? `Error (${realtimeError || 'Connect Failed'})` : 'Syncing...'}
                                        </span>
                                        {realtimeStatus === 'error' && (
                                            <button 
                                                onClick={() => setRetryCount(prev => prev + 1)}
                                                className="ml-1 text-[10px] bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded text-white transition-colors"
                                            >
                                                Retry
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                    <button className="p-2 md:p-3 hover:bg-white/5 rounded-xl transition-colors text-white/60">
                        <Phone size={20} />
                    </button>
                    <button className="p-2 md:p-3 hover:bg-white/5 rounded-xl transition-colors text-white/60">
                        <MoreVertical size={20} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-hide">
                <div className="flex flex-col items-center py-8 text-center space-y-2 opacity-40">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
                        <ShieldCheck size={24} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest">End-to-End Encrypted</p>
                    <p className="text-[10px] max-w-[200px]">Messages are secure and only visible to you and your professional.</p>
                </div>

                <AnimatePresence initial={false}>
                    {messages.map((msg, idx) => {
                        const isMe = msg.senderId === user?.id;
                        const showAvatar = idx === 0 || messages[idx - 1].senderId !== msg.senderId;
                        const isNew = Date.now() - msg.timestamp < 2000;
                        
                        return (
                            <motion.div
                                key={msg.id}
                                initial={isNew ? { opacity: 0, x: isMe ? 20 : -20, y: 10 } : false}
                                animate={{ opacity: 1, x: 0, y: 0 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className={clsx(
                                    "flex w-full mb-2",
                                    isMe ? "justify-end" : "justify-start"
                                )}
                            >
                                <div className={clsx(
                                    "flex max-w-[85%] md:max-w-[70%] gap-3",
                                    isMe ? "flex-row-reverse" : "flex-row"
                                )}>
                                    {!isMe && showAvatar && helper && (
                                        <img src={helper.avatar} className="w-8 h-8 rounded-full border border-white/10 mt-1 flex-shrink-0 object-cover" />
                                    )}
                                    {!isMe && !showAvatar && <div className="w-8" />}
                                    
                                    <div className="flex flex-col">
                                        <div className={clsx(
                                            "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                                            isMe 
                                                ? "bg-[var(--color-seva-accent)] text-white rounded-tr-none shadow-lg shadow-blue-500/20" 
                                                : "bg-white/10 text-white/90 rounded-tl-none border border-white/5 backdrop-blur-md"
                                        )}>
                                            {msg.content}
                                        </div>
                                        <span className={clsx(
                                            "text-[10px] mt-1 opacity-30 font-mono",
                                            isMe ? "text-right" : "text-left"
                                        )}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                
                {isTyping && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="flex justify-start mb-4"
                    >
                        <div className="flex gap-3 items-end">
                            {helper && <img src={helper.avatar} className="w-8 h-8 rounded-full border border-white/10 flex-shrink-0 object-cover" />}
                            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl rounded-bl-none border border-white/5 flex gap-1 items-center">
                                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </motion.div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 bg-white/5 border-t border-white/5 backdrop-blur-2xl">
                <form onSubmit={handleSendMessage} className="flex gap-3 items-center">
                    <div className="flex-1 relative group">
                        <input
                            type="text"
                            value={inputText}
                            onChange={handleInputChange}
                            placeholder="Type a message..."
                            className="w-full bg-white/5 border border-white/10 focus:border-[var(--color-seva-accent)]/50 focus:bg-white/10 rounded-2xl px-6 py-4 text-sm outline-none transition-all group-hover:border-white/20"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-white/20">
                            <Clock size={16} />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={!inputText.trim()}
                        className="bg-[var(--color-seva-accent)] hover:bg-[var(--color-seva-accent)]/80 disabled:opacity-30 disabled:grayscale p-4 rounded-2xl text-white shadow-xl shadow-blue-500/20 transition-all active:scale-95"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
}
