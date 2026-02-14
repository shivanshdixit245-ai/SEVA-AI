'use client';

import { useState } from 'react';
import { useAuth, UserRole } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Shield, Wrench, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import clsx from 'clsx';

type AuthMode = 'login' | 'signup';

const ROLES: { id: UserRole; label: string; icon: typeof User; desc: string }[] = [
    { id: 'client', label: 'Client', icon: User, desc: 'Book home services' },
    { id: 'worker', label: 'Worker', icon: Wrench, desc: 'Provide services' },
    { id: 'admin', label: 'Admin', icon: Shield, desc: 'Manage platform' },
];

export default function LoginPage() {
    const { login, signup } = useAuth();
    const router = useRouter();

    const [mode, setMode] = useState<AuthMode>('login');
    const [role, setRole] = useState<UserRole>('client');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Admin can only login, not sign up
    const canSignUp = role !== 'admin';

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let result;
            if (mode === 'login') {
                result = await login(email, password, role);
            } else {
                if (!name.trim()) {
                    setError('Please enter your name.');
                    setLoading(false);
                    return;
                }
                result = await signup(name, email, password, role);
            }

            if (result.success) {
                router.push('/');
            } else {
                setError(result.error || 'Something went wrong');
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-seva-accent)]/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-seva-glow)]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/5 rounded-full blur-[150px]" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-seva-accent)] to-[var(--color-seva-glow)] shadow-[0_0_40px_rgba(139,92,246,0.4)] mb-4">
                        <Sparkles className="text-white" size={28} />
                    </div>
                    <h1 className="text-3xl font-bold font-[family-name:var(--font-display)] tracking-wide">
                        Seva<span className="text-[var(--color-seva-glow)]">AI</span>
                    </h1>
                    <p className="text-gray-400 mt-1 text-sm">AI-Powered Home Service Booking</p>
                </div>

                {/* Card */}
                <div className="glass-card rounded-3xl p-8 border border-white/10 shadow-2xl backdrop-blur-xl">
                    {/* Role Selector */}
                    <div className="mb-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">I am a</p>
                        <div className="grid grid-cols-3 gap-2">
                            {ROLES.map(r => {
                                const Icon = r.icon;
                                const isSelected = role === r.id;
                                return (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => {
                                            setRole(r.id);
                                            if (r.id === 'admin') setMode('login');
                                            setError('');
                                        }}
                                        className={clsx(
                                            "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200",
                                            isSelected
                                                ? "bg-gradient-to-b from-[var(--color-seva-accent)]/20 to-transparent border-[var(--color-seva-accent)]/50 text-white shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                                                : "border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20 hover:bg-white/5"
                                        )}
                                    >
                                        <Icon size={18} />
                                        <span className="text-xs font-medium">{r.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Mode Tabs (hide signup for admin) */}
                    <div className="flex bg-white/5 rounded-xl p-1 mb-6">
                        <button
                            type="button"
                            onClick={() => { setMode('login'); setError(''); }}
                            className={clsx(
                                "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                                mode === 'login'
                                    ? "bg-[var(--color-seva-accent)] text-white shadow-lg"
                                    : "text-gray-400 hover:text-white"
                            )}
                        >
                            Login
                        </button>
                        {canSignUp && (
                            <button
                                type="button"
                                onClick={() => { setMode('signup'); setError(''); }}
                                className={clsx(
                                    "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                                    mode === 'signup'
                                        ? "bg-[var(--color-seva-accent)] text-white shadow-lg"
                                        : "text-gray-400 hover:text-white"
                                )}
                            >
                                Sign Up
                            </button>
                        )}
                    </div>

                    {/* Admin notice */}
                    {role === 'admin' && (
                        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                            <Shield size={14} />
                            Admin access is login-only. Contact super admin for credentials.
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'signup' && (
                            <div className="relative">
                                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-[var(--color-seva-accent)] focus:bg-white/10 focus:outline-none transition-all"
                                />
                            </div>
                        )}

                        <div className="relative">
                            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type={role === 'admin' ? 'text' : 'email'}
                                placeholder={role === 'admin' ? 'Admin Username' : 'Email Address'}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-[var(--color-seva-accent)] focus:bg-white/10 focus:outline-none transition-all"
                            />
                        </div>

                        <div className="relative">
                            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                className="w-full pl-11 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-[var(--color-seva-accent)] focus:bg-white/10 focus:outline-none transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-[fadeIn_0.2s_ease-out]">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={clsx(
                                "w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300",
                                loading
                                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-[var(--color-seva-accent)] to-[var(--color-seva-glow)] text-white hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:scale-[1.02] active:scale-[0.98]"
                            )}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    {mode === 'login' ? 'Log In' : 'Create Account'}
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Toggle */}
                    {canSignUp && (
                        <p className="text-center text-sm text-gray-500 mt-6">
                            {mode === 'login' ? (
                                <>Don&apos;t have an account?{' '}
                                    <button onClick={() => { setMode('signup'); setError(''); }} className="text-[var(--color-seva-glow)] hover:underline font-medium">
                                        Sign Up
                                    </button>
                                </>
                            ) : (
                                <>Already have an account?{' '}
                                    <button onClick={() => { setMode('login'); setError(''); }} className="text-[var(--color-seva-glow)] hover:underline font-medium">
                                        Log In
                                    </button>
                                </>
                            )}
                        </p>
                    )}
                </div>

                {/* Guest note */}
                <p className="text-center text-xs text-gray-600 mt-6">
                    You can also browse as a guest from the home page.
                </p>
            </div>
        </div>
    );
}
