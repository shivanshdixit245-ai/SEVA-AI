export default function Loading() {
    return (
        <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto glass-panel rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-white/5 p-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
                    <div className="space-y-2">
                        <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
                        <div className="h-2 w-16 bg-white/5 rounded animate-pulse" />
                    </div>
                </div>
            </div>
            
            <div className="flex-1 p-6 space-y-6">
                <div className="flex justify-start">
                    <div className="h-16 w-[60%] bg-white/5 rounded-2xl rounded-bl-none animate-pulse" />
                </div>
                <div className="flex justify-end">
                    <div className="h-12 w-[40%] bg-[var(--color-seva-accent)]/20 rounded-2xl rounded-br-none animate-pulse" />
                </div>
            </div>

            <div className="p-4 bg-white/5 border-t border-white/10">
                <div className="h-12 bg-black/20 rounded-xl border border-white/5 animate-pulse" />
            </div>
        </div>
    );
}
