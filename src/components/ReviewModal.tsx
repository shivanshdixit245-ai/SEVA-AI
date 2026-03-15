'use client';

import { useState } from 'react';
import { Star, X, MessageSquare, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookingId: string;
    workerId: string;
    workerName: string;
    onSubmitSuccess: () => void;
}

export default function ReviewModal({ isOpen, onClose, bookingId, workerId, workerName, onSubmitSuccess }: ReviewModalProps) {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (rating === 0) {
            setError('Please select a star rating.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/v1/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId,
                    workerId,
                    rating,
                    comment
                })
            });

            if (res.ok) {
                onSubmitSuccess();
                onClose();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to submit review');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg glass-panel rounded-3xl overflow-hidden border border-white/10"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h2 className="text-xl font-bold font-[family-name:var(--font-display)]">Rate <span className="text-gradient">Service</span></h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Worker Info */}
                            <div className="flex flex-col items-center text-center gap-2">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl border-4 border-white/5">
                                    {workerName.charAt(0)}
                                </div>
                                <h3 className="font-bold text-lg">{workerName}</h3>
                                <p className="text-xs text-white/40">ID: {bookingId}</p>
                            </div>

                            {/* Stars */}
                            <div className="flex flex-col items-center gap-4 py-4 bg-white/[0.02] rounded-3xl border border-white/5 mx-[-10px]">
                                <div className="space-y-1 text-center">
                                    <p className="text-sm font-bold text-white/80">How was your experience?</p>
                                    <p className="text-[10px] text-[var(--color-seva-accent)] font-bold uppercase tracking-widest animate-pulse">Rating is Required</p>
                                </div>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onMouseEnter={() => setHover(star)}
                                            onMouseLeave={() => setHover(0)}
                                            onClick={() => setRating(star)}
                                            className="p-1 transition-transform active:scale-90"
                                        >
                                            <Star 
                                                size={32} 
                                                className={clsx(
                                                    "transition-all duration-300",
                                                    (hover || rating) >= star ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" : "text-white/10"
                                                )} 
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Comment */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase tracking-widest font-bold">
                                        <MessageSquare size={12} /> Detailed Feedback
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 bg-white/10 rounded-full text-white/30 font-bold">OPTIONAL</span>
                                </div>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Tell us what you liked or how we can improve... (this helps our community)"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-[var(--color-seva-accent)]/50 transition-all min-h-[120px] resize-none"
                                />
                            </div>

                            {error && (
                                <p className="text-red-400 text-xs text-center font-medium bg-red-400/10 py-2 rounded-lg">{error}</p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-white/5 border-t border-white/5 flex flex-col gap-4">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || rating === 0}
                                className="w-full bg-[var(--color-seva-accent)] hover:bg-[var(--color-seva-glow)] text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Review'}
                            </button>
                            <div className="flex items-center justify-center gap-2 text-[10px] text-white/20 uppercase tracking-widest font-bold">
                                <ShieldCheck size={12} /> Secure Verified Review
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
