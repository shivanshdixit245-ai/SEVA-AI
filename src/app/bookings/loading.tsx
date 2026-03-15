export default function Loading() {
    return (
        <div className="space-y-8 animate-pulse">
            <div className="flex justify-between items-center">
                <div className="h-10 w-48 bg-white/5 rounded-xl" />
                <div className="h-10 w-32 bg-white/5 rounded-xl" />
            </div>
            
            <div className="flex gap-2 border-b border-white/5 pb-1">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-10 w-24 bg-white/5 rounded-lg" />
                ))}
            </div>

            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-white/5 rounded-2xl w-full" />
                ))}
            </div>
        </div>
    );
}
