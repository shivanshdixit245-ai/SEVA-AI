'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { supabase } from '@/lib/supabase';
import { Send, Lock, ArrowLeft, AlertCircle } from 'lucide-react';
import { ChatThreadSkeleton } from '@/components/Skeletons';
import { motion } from 'framer-motion';

interface ChatThread {
    bookingId: string;
    clientId: string;
    clientName: string;
    serviceType: string;
    status: string;
    lastMessage: string;
    lastMessageTime: string;
}

interface Message {
    id: string;
    text: string;
    sender: 'worker' | 'client';
    timestamp: string;
}

export default function WorkerChatsPage() {
    const { user, getAuthHeaders } = useAuth();
    const [threads, setThreads] = useState<ChatThread[]>([]);
    const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendingMsg, setSendingMsg] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const mountedRef = useRef(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const channelRef = useRef<any>(null);

    const broadcastDirectly = (payload: any) => {
        if (channelRef.current) {
            console.log(`[REALTIME DEBUG] Worker broadcasting on ${channelRef.current.name}:`, payload);
            channelRef.current.send({
                type: 'broadcast',
                event: 'dm-receive',
                payload
            });
        }
    };

    const fetchThreads = useCallback(async () => {
        if (!user) return;
        try {
            // Get all bookings assigned to this worker
            const { data, error: fetchErr } = await supabase
                .from('bookings')
                .select('*')
                .eq('worker_id', user.id)
                .order('created_at', { ascending: false });

            if (fetchErr) throw fetchErr;

            const mapped = (data || []).map((b: any) => ({
                bookingId: b.id,
                clientId: b.user_id,
                clientName: b.client_name || 'Client',
                serviceType: b.service_type || 'Service',
                status: b.status,
                lastMessage: b.description || 'No messages yet',
                lastMessageTime: b.created_at
            }));

            if (mountedRef.current) {
                setThreads(mapped);
                setError(null);
            }
        } catch (err: any) {
            if (mountedRef.current) setError(err.message);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        mountedRef.current = true;
        
        const safetyTimeout = setTimeout(() => {
            if (mountedRef.current) setLoading(false);
        }, 5000);

        if (user) {
            fetchThreads().finally(() => {
                if (mountedRef.current) setLoading(false);
                clearTimeout(safetyTimeout);
            });
        } else {
            setLoading(false);
            clearTimeout(safetyTimeout);
        }

        return () => { 
            mountedRef.current = false;
            clearTimeout(safetyTimeout);
        };
    }, [user, fetchThreads]);

    // Realtime updates for booking status changes (e.g. job completed = lock chat)
    useSupabaseRealtime({
        table: 'bookings',
        onData: (payload) => {
            const record = payload.new as any;
            if (record?.worker_id === user?.id) {
                fetchThreads();
                // Update active thread status
                if (selectedThread && record.id === selectedThread.bookingId) {
                    setSelectedThread(prev => prev ? { ...prev, status: record.status } : null);
                }
            }
        },
        enabled: !!user
    });

    const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [realtimeError, setRealtimeError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isAuthSynced, setIsAuthSynced] = useState(false);

    // 1. Sync check: Ensure Supabase client is actually authenticated before subscribing
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) setIsAuthSynced(true);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) setIsAuthSynced(true);
            else setIsAuthSynced(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    // 2. Realtime Database & Broadcast listener
    useEffect(() => {
        if (!user || !selectedThread || !isAuthSynced) {
            console.log('[REALTIME DEBUG] Worker waiting for auth sync...', { user: !!user, isAuthSynced });
            return;
        }
        
        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
        const safeUserId = String(user.id).toLowerCase().trim();
        let resolvedClientId = isUUID(selectedThread.clientId) ? selectedThread.clientId : null;

        if (!resolvedClientId) {
            console.log('[REALTIME DEBUG] Waiting for Client UUID verification...');
            return;
        }

        const finalClientId = String(resolvedClientId).toLowerCase().trim();
        const sortedIds = [safeUserId, finalClientId].sort();
        const roomChannelName = `room:${sortedIds[0]}-${sortedIds[1]}`;

        console.log(`[REALTIME DEBUG] Worker joining AUTH-READY room: ${roomChannelName} (Attempt ${retryCount + 1})`);
        setRealtimeStatus('connecting');
        setRealtimeError(null);

        const timeout = setTimeout(() => {
            if (realtimeStatus === 'connecting') {
                setRealtimeStatus('error');
                setRealtimeError('TIMEOUT');
            }
        }, 10000);

        // Listen for new messages where the worker is the receiver
        const channel = supabase
            .channel(roomChannelName)
            .on('broadcast', { event: 'dm-receive' }, (payload) => {
                const msg = payload.payload as any;
                console.log('[REALTIME BROADCAST] Worker received:', msg);
                if (String(msg.senderId).toLowerCase().trim() === finalClientId) {
                    setMessages(prev => {
                        if (prev.find(m => m.id === msg.id)) return prev;
                        return [...prev, {
                            id: msg.id,
                            text: msg.content,
                            sender: 'client',
                            timestamp: new Date(msg.timestamp).toISOString()
                        }];
                    });
                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 10);
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
                    table: 'messages'
                    // ENGINE BYPASS: Remove server-side filter
                },
                (payload) => {
                    const record = payload.new as any;
                    console.log('[REALTIME DB] RAW PACKET RECEIVED BY WORKER:', record);
                    
                    const isForMe = String(record.receiver_id).toLowerCase().trim() === safeUserId;
                    const isFromPeer = String(record.sender_id).toLowerCase().trim() === finalClientId;

                    if (isForMe && isFromPeer) {
                        console.log('[REALTIME DB] Worker Match found!');
                        setMessages(prev => {
                            if (prev.find(m => m.id === record.id)) return prev;
                            return [...prev, {
                                id: record.id,
                                text: record.content,
                                sender: 'client',
                                timestamp: record.created_at
                            }];
                        });
                        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 10);
                    } else {
                        console.log('[REALTIME DB] Worker ignored packet', { isForMe, isFromPeer });
                    }
                }
            )
            .subscribe((status, err) => {
                console.log(`[REALTIME DEBUG] Worker status [${status}]:`, err || '');
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
    }, [user, selectedThread, retryCount, isAuthSynced]);

    // ZERO-FAILURE FALLBACK: Poll for new messages every 3s if Realtime is not 'Live'
    useEffect(() => {
        if (!user || !selectedThread || realtimeStatus === 'connected') return;

        console.log('[REALTIME] Safety polling active (Status: ' + realtimeStatus + ')');
        const interval = setInterval(() => {
            fetchMessages(selectedThread.clientId).catch(() => {});
        }, 3000);

        return () => clearInterval(interval);
    }, [user, selectedThread, realtimeStatus]);

    const fetchMessages = async (clientId: string) => {
        if (!user) return;
        try {
            const res = await fetch(`/api/v1/messages?userId=${clientId}&helperId=${user.id}`, {
                headers: getAuthHeaders()
            });
            if (res.ok && mountedRef.current) {
                const data = await res.json();
                setMessages((prev) => {
                    const newMessages = (data || []).map((m: any) => ({
                        id: m.id,
                        text: m.content,
                        sender: m.senderId === user.id ? 'worker' : 'client' as 'worker'|'client',
                        timestamp: new Date(m.timestamp).toISOString()
                    }));
                    
                    // Simple de-duplication: only add if ID not already in state
                    const existingIds = new Set(prev.map(m => m.id));
                    const filtered = newMessages.filter((m: any) => !existingIds.has(m.id));
                    
                    if (filtered.length === 0) return prev;
                    return [...prev, ...filtered].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                });
            }

            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 10);
        } catch {}
    };

    const handleSelectThread = async (thread: ChatThread) => {
        setSelectedThread(thread);
        
        // Resolve UUID if needed
        const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
        if (!isUUID(thread.clientId)) {
            console.log('[WHATSAPP SYNC] Worker resolving client UUID:', thread.clientId);
            try {
                const res = await fetch(`/api/v1/helpers/${thread.clientId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.supabaseId) {
                        console.log('[WHATSAPP SYNC] Resolved client UUID:', data.supabaseId);
                        thread.clientId = data.supabaseId;
                        setSelectedThread({ ...thread }); // Force re-render with UUID
                    }
                }
            } catch (err) {
                console.error('Failed to resolve client UUID:', err);
            }
        }

        fetchMessages(thread.clientId as string);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        if (!user || !selectedThread) return;

        const safeWorkerId = String(user.id).toLowerCase().trim();
        const safeClientId = String(selectedThread.clientId).toLowerCase().trim();
        const channelName = `dm-${[safeWorkerId, safeClientId].sort().join('-')}`;
        
        console.log(`[REALTIME DEBUG] Worker sending typing on: ${channelName}`);
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

    const handleSend = async () => {
        if (!newMessage.trim() || !selectedThread || !user) return;
        const text = newMessage.trim();
        setNewMessage('');
        setSendingMsg(true);

        // Stop typing indicator
        const safeWorkerId = String(user.id).toLowerCase().trim();
        const safeClientId = String(selectedThread.clientId).toLowerCase().trim();
        const channelName = `dm-${[safeWorkerId, safeClientId].sort().join('-')}`;
        
        console.log(`[REALTIME DEBUG] Worker sending stop-typing on: ${channelName}`);
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'typing',
                payload: { senderId: user.id, isTyping: false },
            });
        }

        // Optimistic UI
        const optimisticMsg: any = {
            id: crypto.randomUUID(),
            senderId: user.id,
            receiverId: selectedThread.clientId,
            content: text,
            timestamp: Date.now(),
            isRead: false
        };
        
        setMessages(prev => [...prev, {
            id: optimisticMsg.id,
            text,
            sender: 'worker',
            timestamp: new Date().toISOString()
        }]);

        // 1. INSTANT BROADCAST
        broadcastDirectly(optimisticMsg);

        // 2. Background Persistence (Non-awaited)
        fetch('/api/v1/messages', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                senderId: user.id,
                receiverId: selectedThread.clientId,
                content: text
            })
        }).catch(err => console.error('Worker background message sync failed:', err));

        setSendingMsg(false);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 10);
    };

    const isLocked = selectedThread?.status === 'Completed' || selectedThread?.status === 'Cancelled';
    const timeSince = (d: string) => {
        const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
        if (m < 1) return 'now';
        if (m < 60) return `${m}m`;
        if (m < 1440) return `${Math.floor(m / 60)}h`;
        return `${Math.floor(m / 1440)}d`;
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="h-10 w-48 bg-white/5 rounded-xl animate-pulse" />
                <ChatThreadSkeleton />
            </div>
        );
    }

    // Chat detail view
    if (selectedThread) {
        return (
            <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
                {/* Header */}
                <div className="glass-panel p-4 rounded-t-3xl flex items-center gap-4 border-b border-white/5">
                    <button onClick={() => setSelectedThread(null)} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {selectedThread.clientName.charAt(0)}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <p className="font-bold">{selectedThread.clientName}</p>
                            <div 
                                className={`w-2 h-2 rounded-full ${
                                    realtimeStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                                    realtimeStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                                }`}
                                title={`Real-time: ${realtimeStatus} ${realtimeError || ''}`}
                            />
                            <span className={`text-[10px] uppercase tracking-tighter font-bold ${
                                realtimeStatus === 'connected' ? 'text-green-500' : 
                                realtimeStatus === 'error' ? 'text-red-500' : 'text-white/20'
                            }`}>
                                {realtimeStatus === 'connected' ? 'Live' : 
                                 realtimeStatus === 'error' ? `Error (${realtimeError || 'Failed'})` : 
                                 !isAuthSynced ? 'Authenticating' : 'Syncing'}
                            </span>
                            {realtimeStatus === 'connected' && (
                                <span 
                                    className="text-[10px] text-white/20 font-mono border border-white/5 px-1 rounded ml-1" 
                                    title="Room Hash: Verify this code matches the client's screen."
                                >
                                    #{ user ? [user.id, selectedThread.clientId].sort().join('').substring(0,4) : '...' }
                                </span>
                            )}
                            {realtimeStatus === 'error' && (
                                <button 
                                    onClick={() => setRetryCount(prev => prev + 1)}
                                    className="text-[10px] bg-white/10 hover:bg-white/20 px-1 py-0.5 rounded text-white transition-colors"
                                >
                                    Retry
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-white/40">{selectedThread.serviceType} • {selectedThread.bookingId}</p>
                    </div>
                    {isLocked && (
                        <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full">
                            <Lock size={12} /> Locked
                        </span>
                    )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 glass-panel">
                    {messages.length === 0 && (
                        <p className="text-center text-white/20 text-sm py-8">No messages yet. Start the conversation!</p>
                    )}
                    {messages.map(msg => {
                        const isNew = Date.now() - new Date(msg.timestamp).getTime() < 2000;
                        return (
                            <div key={msg.id} className={`flex ${msg.sender === 'worker' ? 'justify-end' : 'justify-start'}`}>
                                <motion.div 
                                    initial={isNew ? { opacity: 0, scale: 0.9, y: 10 } : false}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                                        msg.sender === 'worker'
                                            ? 'bg-[var(--color-seva-accent)] text-white rounded-br-md'
                                            : 'bg-white/10 text-white/80 rounded-bl-md'
                                    }`}
                                >
                                    <p>{msg.text}</p>
                                    <p className={`text-[10px] mt-1 ${msg.sender === 'worker' ? 'text-white/50' : 'text-white/30'}`}>
                                        {timeSince(msg.timestamp)}
                                    </p>
                                </motion.div>
                            </div>
                        );
                    })}
                    
                    {isTyping && (
                        <div className="flex justify-start mb-2">
                            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl rounded-bl-none border border-white/5 flex gap-1 items-center">
                                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                {isLocked ? (
                    <div className="glass-panel p-4 rounded-b-3xl border-t border-white/5 flex items-center gap-2 text-amber-400 text-sm">
                        <Lock size={14} />
                        This chat is locked because the job has been completed.
                    </div>
                ) : (
                    <div className="glass-panel p-4 rounded-b-3xl border-t border-white/5 flex items-center gap-3">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={handleInputChange}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type a message..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--color-seva-accent)] transition-all"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!newMessage.trim() || sendingMsg}
                            className="p-2.5 rounded-xl bg-[var(--color-seva-accent)] hover:opacity-80 transition-all disabled:opacity-30"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Thread list
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="space-y-2">
                <h1 className="text-4xl font-bold font-[family-name:var(--font-display)]">Worker <span className="text-gradient">Chats</span></h1>
                <p className="text-white/60">Chat with your clients. Messages update in real-time.</p>
            </div>

            {error && (
                <div className="glass-panel p-4 rounded-xl border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {threads.length === 0 ? (
                <div className="glass-panel p-12 rounded-3xl text-center space-y-4">
                    <AlertCircle className="mx-auto text-white/20" size={48} />
                    <h2 className="text-xl font-bold text-white/40">No Chats Yet</h2>
                    <p className="text-white/30 text-sm">Accept a job to start chatting with clients.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {threads.map(thread => (
                        <div
                            key={thread.bookingId}
                            onClick={() => handleSelectThread(thread)}
                            className="glass-panel p-4 rounded-2xl hover:bg-white/5 transition-all cursor-pointer flex items-center gap-4"
                        >
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                {thread.clientName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <p className="font-bold text-sm">{thread.clientName}</p>
                                    <p className="text-[10px] text-white/30">{timeSince(thread.lastMessageTime)}</p>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs text-white/40 truncate">{thread.lastMessage}</p>
                                    {thread.status === 'Completed' && (
                                        <Lock size={12} className="text-amber-400 flex-shrink-0" />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
