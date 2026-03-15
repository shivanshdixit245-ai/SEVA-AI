import { NextResponse, NextRequest } from 'next/server';
import { chatLimiter, globalApiLimiter } from './lib/rate-limit';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only apply to /api routes
    if (!pathname.startsWith('/api')) {
        return NextResponse.next();
    }

    // Determine identifier (IP address)
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    
    // Tiered Rate Limiting
    let limitResult;

    if (pathname.startsWith('/api/v1/chat')) {
        // Strict limit for AI Chat
        limitResult = chatLimiter.check(ip);
    } else {
        // Broader limit for other APIs
        limitResult = globalApiLimiter.check(ip);
    }

    if (!limitResult.success) {
        console.warn(`[RATE LIMIT] Blocked ${ip} on ${pathname}`);
        return new NextResponse(
            JSON.stringify({ 
                error: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil((limitResult.reset - Date.now()) / 1000)
            }),
            { 
                status: 429, 
                headers: { 
                    'Content-Type': 'application/json',
                    'Retry-After': Math.ceil((limitResult.reset - Date.now()) / 1000).toString()
                } 
            }
        );
    }

    return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
    matcher: '/api/:path*',
};
