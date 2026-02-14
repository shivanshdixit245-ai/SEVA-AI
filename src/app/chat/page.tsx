'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MapPin, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { BookingRequest, ChatMessage, UrgencyLevel } from '@/types/booking';
import clsx from 'clsx';

const QUICK_REPLIES = [
    "Book a deep cleaning for my kitchen",
    "Urgent: Water pipe burst in bathroom",
    "AC servicing required ASAP",
    "Need an electrician for fan repair"
];

import { useAuth } from '@/context/AuthContext';

export default function ChatPage() {
    const { user } = useAuth();
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

    const handleSendMessage = async (text: string) => {
        if (!text.trim()) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();

            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
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
                id: Date.now().toString(),
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
                id: Date.now().toString(),
                role: 'assistant',
                content: "Please login to confirm your booking.",
                timestamp: Date.now()
            }]);
            return;
        }
        try {
            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...booking, userId: user.id })
            });

            if (response.ok) {
                const newBooking = await response.json();
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `✔ Booking Confirmed! \n\nService: ${newBooking.serviceType}\nID: ${newBooking.id}\nPriority: ${newBooking.urgency}\n\nA professional will be assigned shortly. You can track this in 'My Bookings'.`,
                    timestamp: Date.now()
                }]);
            } else {
                throw new Error('Booking failed');
            }
        } catch (error) {
            console.error('Booking confirmation failed:', error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "Sorry, I couldn't confirm your booking right now. Please try again.",
                timestamp: Date.now()
            }]);
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

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={clsx(
                            "flex w-full mb-4",
                            msg.role === 'user' ? "justify-end" : "justify-start"
                        )}
                    >
                        <div className={clsx(
                            "max-w-[80%] rounded-2xl p-4 shadow-lg",
                            msg.role === 'user'
                                ? "bg-[var(--color-seva-accent)] text-white rounded-br-none"
                                : "bg-white/10 text-white/80 rounded-bl-none border border-white/5"
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
                                                <p className="font-semibold">{msg.bookingData.location}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => msg.bookingData && handleConfirmBooking(msg.bookingData)}
                                        className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold transition-all"
                                    >
                                        <CheckCircle size={18} />
                                        Confirm Booking
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
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
