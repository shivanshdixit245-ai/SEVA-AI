'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MapPin, Clock, CheckCircle, AlertTriangle, Navigation } from 'lucide-react';
import { BookingRequest, ChatMessage, UrgencyLevel } from '@/types/booking';
import clsx from 'clsx';

const QUICK_REPLIES = [
    "Book a deep cleaning for my kitchen",
    "Urgent: Water pipe burst in bathroom",
    "AC servicing required ASAP",
    "Need an electrician for fan repair"
];

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatPage() {
    const { user, selectedLocation, getAuthHeaders } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Namaste! I'm SevaAI. How can I help you today? You can tell me what you need in English, Hindi, or Hinglish.",
            timestamp: Date.now()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useSupabaseRealtime({
        table: 'bookings',
        filter: user ? `user_id=eq.${user.id}` : undefined,
        onData: (payload) => {
            const updated = payload.new as any;
            if (updated && updated.status) {
                setMessages(prev => [...prev, {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: `🔔 Update for booking ${updated.id.substring(0,6)}: Status is now **${updated.status}**`,
                    timestamp: Date.now()
                }]);
            }
        },
        enabled: !!user
    });

    const handleSendMessage = async (text: string) => {
        if (!text.trim()) return;

        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: text,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/v1/chat', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();

            const aiMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: data.reply,
                isBooking: !!data.bookingData,
                bookingData: data.bookingData,
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Chat failed:', error);
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: "Sorry, I'm having trouble connecting right now. Please try again.",
                timestamp: Date.now()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmBooking = async (booking: BookingRequest) => {
        if (!user) {
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: "Please login to confirm your booking.",
                timestamp: Date.now()
            }]);
            return;
        }

        const optimisticId = crypto.randomUUID();
        const optimisticMessage: ChatMessage = {
            id: optimisticId,
            role: 'assistant',
            content: `⏳ **Confirming your booking for ${booking.serviceType}...**`,
            timestamp: Date.now()
        };

        // Add optimistic message
        setMessages(prev => [...prev, optimisticMessage]);

        try {
            const response = await fetch('/api/v1/bookings', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ 
                    ...booking, 
                    userId: user.id,
                    location: selectedLocation 
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Update optimistic message with real data instantly
                setMessages(prev => prev.map(msg => 
                    msg.id === optimisticId 
                        ? {
                            ...msg,
                            content: `✔ **Booking Confirmed!** \n\nService: ${data.serviceType}\nID: ${data.id}\nPriority: ${data.urgency}\n\nA professional will be assigned shortly. You can track this in 'My Bookings'.`
                        }
                        : msg
                ));
            } else {
                throw new Error(data.error || 'Booking failed');
            }
        } catch (error: any) {
            console.error('Booking confirmation failed:', error);
            // Replace optimistic message with error
            setMessages(prev => prev.map(msg => 
                msg.id === optimisticId 
                    ? {
                        ...msg,
                        content: `❌ **Booking Failed**\n\n${error.message || "Please try again later."}`
                    }
                    : msg
            ));
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto glass-panel rounded-2xl overflow-hidden shadow-2xl animate-[fadeIn_0.5s_ease-out]">

            {/* Header */}
            <div className="bg-white/5 p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-seva-accent)] to-[var(--color-seva-glow)] flex items-center justify-center">
                        <Sparkles className="text-white" size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold">SevaAI Assistant</h2>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-xs text-green-400">Online</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {messages.length === 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {QUICK_REPLIES.map((reply) => (
                            <button
                                key={reply}
                                onClick={() => handleSendMessage(reply)}
                                className="text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[var(--color-seva-accent)] transition-all text-sm text-white/60 hover:text-white"
                            >
                                "{reply}"
                            </button>
                        ))}
                    </div>
                )}

                <div className="space-y-4">
                    <AnimatePresence initial={false}>
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.2 }}
                                className={clsx(
                                    "flex w-full mb-4",
                                    msg.role === 'user' ? "justify-end" : "justify-start"
                                )}
                            >
                                <div className={clsx(
                                    "max-w-[80%] rounded-2xl p-4 shadow-lg transition-all",
                                    msg.role === 'user'
                                        ? "bg-[var(--color-seva-accent)] text-white rounded-br-none shadow-blue-500/20"
                                        : "bg-white/10 text-white/80 rounded-bl-none border border-white/5 backdrop-blur-md"
                                )}>
                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                                    {msg.isBooking && msg.bookingData && (
                                        <div className="mt-4 bg-black/20 rounded-xl p-4 border border-white/10 animate-[slideUp_0.4s_ease-out]">
                                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                                                <span className="text-xs font-bold uppercase tracking-wider text-white/40">Booking Preview</span>
                                                {msg.bookingData.urgency === 'Urgent' && (
                                                    <span className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-full">
                                                        <AlertTriangle size={12} /> Urgent
                                                    </span>
                                                )}
                                            </div>

                                            <div className="space-y-3 mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-[var(--color-seva-glow)]/20 flex items-center justify-center text-[var(--color-seva-glow)]">
                                                        <Sparkles size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-white/40">Service</p>
                                                        <p className="font-semibold">{msg.bookingData.serviceType}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
                                                        <MapPin size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-white/40">Location</p>
                                                        <p className="font-semibold">{selectedLocation || msg.bookingData.location}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => msg.bookingData && handleConfirmBooking(msg.bookingData)}
                                                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold transition-all transform active:scale-95"
                                            >
                                                <CheckCircle size={18} />
                                                Confirm Booking
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
                {isLoading && (
                    <div className="flex justify-start w-full">
                        <div className="bg-white/10 p-4 rounded-2xl rounded-bl-none flex gap-2 items-center">
                            <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white/5 border-t border-white/10">
                <div className="flex items-center gap-3 bg-black/20 p-2 rounded-xl border border-white/5 focus-within:border-[var(--color-seva-accent)] transition-colors">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(input)}
                        placeholder="Type your request... (e.g. 'I need a plumber for a leak')"
                        className="flex-1 bg-transparent px-4 py-2 outline-none text-white placeholder-white/30"
                        disabled={isLoading}
                    />
                    <button
                        onClick={() => handleSendMessage(input)}
                        disabled={!input.trim() || isLoading}
                        className="p-3 bg-[var(--color-seva-accent)] hover:bg-[var(--color-seva-accent)]/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
                    >
                        <Send size={18} />
                    </button>
                </div>
                <p className="text-center text-xs text-white/30 mt-2">
                    SevaAI can make mistakes. Please verify booking details.
                </p>
            </div>

        </div>
    );
}
