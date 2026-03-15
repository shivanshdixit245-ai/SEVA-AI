import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { supabaseAdmin } from '@/lib/supabase';

// Simple in-memory cache for ultra-fast "instant" responses
let helpersCache: { data: any[], timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000; // 60 seconds

export async function GET() {
    try {
        const now = Date.now();
        if (helpersCache && (now - helpersCache.timestamp < CACHE_TTL)) {
            console.log('Helpers API: Returning from Memory Cache (INSTANT)');
            return NextResponse.json(helpersCache.data);
        }

        console.log('--- GET Helpers (Cache Miss) ---');

        // 1. PRIMARY: Fetch from Supabase
        try {
            const { data, error } = await supabaseAdmin
                .from('workers')
                .select('*')
                .eq('role', 'worker')
                .order('created_at', { ascending: false });

            if (!error && data) {
                const mapped = data.map(w => ({
                    id: w.id,
                    name: w.name,
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(w.name)}&background=random`,
                    skills: w.profession ? [w.profession] : [],
                    rating: w.rating || 0,
                    completedJobs: w.completed_jobs || 0,
                    isAvailable: w.is_available ?? true,
                    location: w.address || 'Location Hidden',
                    experience: w.experience || 0,
                    description: w.bio || 'Professional SevaAI helper.',
                    phone: w.phone || '+91 00000 00000',
                    reviews: []
                }));

                // Update Cache
                helpersCache = { data: mapped, timestamp: now };
                return NextResponse.json(mapped);
            }
        } catch (supErr) {
            console.warn('Supabase fetch failed:', supErr);
        }

        // 2. SECONDARY: Fallback to MongoDB
        try {
            const db = await getDb();
            const helpers = await db.collection('helpers').find({ role: 'worker' }).toArray();
            if (helpers && helpers.length > 0) {
                const mappedMongo = helpers.map((h: any) => ({
                    ...h,
                    rating: h.rating || 0,
                    completedJobs: h.completedJobs || 0
                }));
                // Update Cache (even from fallback)
                helpersCache = { data: mappedMongo, timestamp: now };
                return NextResponse.json(mappedMongo);
            }
        } catch (dbErr) {
            console.warn('DB Helpers fetch failed');
        }

        return NextResponse.json([]);
    } catch (error) {
        return NextResponse.json([]);
    }
}
