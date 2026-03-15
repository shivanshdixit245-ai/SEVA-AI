'use client';

import React from 'react';

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<
    { children: React.ReactNode; fallback?: React.ReactNode },
    ErrorBoundaryState
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4 text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 text-3xl">⚠️</div>
                    <h2 className="text-xl font-bold text-white/80">Something went wrong</h2>
                    <p className="text-white/40 text-sm max-w-md">{this.state.error?.message || 'An unexpected error occurred.'}</p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-6 py-2.5 rounded-xl bg-[var(--color-seva-accent)] text-white text-sm font-bold hover:opacity-80 transition-all"
                    >
                        Try Again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
