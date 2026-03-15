export function BookingSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
                <div key={i} className="glass-card rounded-2xl p-6 space-y-3">
                    <div className="flex justify-between">
                        <div className="space-y-2">
                            <div className="h-6 w-40 bg-white/5 rounded-lg" />
                            <div className="h-4 w-24 bg-white/5 rounded-lg" />
                        </div>
                        <div className="space-y-2 text-right">
                            <div className="h-6 w-16 bg-white/5 rounded-lg ml-auto" />
                            <div className="h-4 w-20 bg-white/5 rounded-lg ml-auto" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function JobCardSkeleton() {
    return (
        <div className="grid gap-4 animate-pulse">
            {[1, 2, 3].map(i => (
                <div key={i} className="glass-panel p-6 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-white/5" />
                        <div className="space-y-2">
                            <div className="h-5 w-32 bg-white/5 rounded-lg" />
                            <div className="h-3 w-48 bg-white/5 rounded-lg" />
                            <div className="h-3 w-36 bg-white/5 rounded-lg" />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="space-y-1">
                            <div className="h-6 w-14 bg-white/5 rounded-lg" />
                            <div className="h-3 w-10 bg-white/5 rounded-lg ml-auto" />
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-white/5" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function StatCardSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className={`grid grid-cols-2 md:grid-cols-${count} gap-4 animate-pulse`}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="glass-panel p-5 rounded-2xl space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5" />
                    <div className="space-y-2">
                        <div className="h-7 w-16 bg-white/5 rounded-lg" />
                        <div className="h-3 w-20 bg-white/5 rounded-lg" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function ChatThreadSkeleton() {
    return (
        <div className="space-y-2 animate-pulse">
            {[1, 2, 3].map(i => (
                <div key={i} className="glass-panel p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/5" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-28 bg-white/5 rounded-lg" />
                        <div className="h-3 w-44 bg-white/5 rounded-lg" />
                    </div>
                    <div className="h-3 w-8 bg-white/5 rounded-lg" />
                </div>
            ))}
        </div>
    );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <div className="glass-card rounded-3xl border border-white/5 overflow-hidden animate-pulse">
            <div className="bg-white/5 p-4 flex gap-8">
                {Array.from({ length: cols }).map((_, i) => (
                    <div key={i} className="h-4 w-20 bg-white/5 rounded" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="p-4 flex gap-8 border-t border-white/5">
                    {Array.from({ length: cols }).map((_, j) => (
                        <div key={j} className="h-4 w-20 bg-white/5 rounded" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function ChatSkeleton() {
    return (
        <div className="space-y-6 p-4 animate-pulse">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                    <div className="flex gap-3 max-w-[70%] items-end">
                        {i % 2 !== 0 && <div className="w-8 h-8 rounded-full bg-white/5" />}
                        <div className="space-y-2">
                            <div className={`h-12 w-48 md:w-64 bg-white/5 rounded-2xl ${i % 2 === 0 ? 'rounded-tr-none' : 'rounded-tl-none'}`} />
                            <div className={`h-3 w-12 bg-white/5 rounded mx-1 ${i % 2 === 0 ? 'ml-auto' : ''}`} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
