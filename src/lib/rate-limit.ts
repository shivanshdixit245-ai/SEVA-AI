
/**
 * Sliding Window Rate Limiter
 * Stores request timestamps in memory (simple for single-instance deployments).
 */
export class RateLimiter {
    private requests: Map<string, number[]> = new Map();
    private windowMs: number;
    private maxRequests: number;
    private lastCleanup: number = Date.now();

    constructor(windowMs: number, maxRequests: number) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
    }

    /**
     * Checks if a user is within their rate limit.
     */
    check(identifier: string) {
        const now = Date.now();
        
        // Proactive cleanup every 5 minutes to prevent memory leaks in long-running processes
        if (now - this.lastCleanup > 5 * 60 * 1000) {
            this.cleanup();
            this.lastCleanup = now;
        }

        const timestamps = this.requests.get(identifier) || [];
        
        // Remove timestamps outside the current window
        const recentTimestamps = timestamps.filter(t => now - t < this.windowMs);
        
        if (recentTimestamps.length >= this.maxRequests) {
            const oldest = recentTimestamps[0];
            const reset = oldest + this.windowMs;
            return {
                success: false,
                remaining: 0,
                reset
            };
        }

        recentTimestamps.push(now);
        this.requests.set(identifier, recentTimestamps);

        return {
            success: true,
            remaining: this.maxRequests - recentTimestamps.length,
            reset: now + this.windowMs
        };
    }

    /**
     * Cleanup old entries to prevent memory leaks
     */
    cleanup() {
        const now = Date.now();
        for (const [id, timestamps] of this.requests.entries()) {
            const recent = timestamps.filter(t => now - t < this.windowMs);
            if (recent.length === 0) {
                this.requests.delete(id);
            } else {
                this.requests.set(id, recent);
            }
        }
    }
}

// Global instances for different tiers
export const chatLimiter = new RateLimiter(60 * 1000, 5); // 5 requests per minute
export const globalApiLimiter = new RateLimiter(60 * 1000, 60); // 60 requests per minute
