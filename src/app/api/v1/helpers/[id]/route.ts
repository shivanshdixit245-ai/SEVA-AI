
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

const FALLBACK_HELPERS = [
    {
        id: 'rahul-sharma',
        name: 'Rahul Sharma',
        avatar: 'https://ui-avatars.com/api/?name=Rahul+Sharma&background=random',
        skills: ['Deep Cleaning', 'Pest Control'],
        rating: 4.8,
        completedJobs: 520,
        isAvailable: true,
        location: 'Sector 45, Gurgaon',
        experience: 5,
        phone: '+91 98765 43210',
        description: 'Professional cleaner with 5 years of experience in deep home cleaning.',
        reviews: [
            { id: 'r1', userName: 'Amit K.', rating: 5, comment: 'Excellent service, very thorough!', date: '2 days ago' },
            { id: 'r2', userName: 'Priya S.', rating: 4, comment: 'Good cleaning, arrived on time.', date: '1 week ago' }
        ]
    },
    {
        id: 'vikram-singh',
        name: 'Vikram Singh',
        avatar: 'https://ui-avatars.com/api/?name=Vikram+Singh&background=random',
        skills: ['Plumbing', 'Carpentry'],
        rating: 4.5,
        completedJobs: 310,
        isAvailable: false,
        location: 'DLF Phase 3',
        experience: 8,
        phone: '+91 91234 56789',
        description: 'Multi-skilled professional specializing in plumbing and carpentry repairs.',
        reviews: []
    }
];

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        try {
            const db = await getDb();
            // 1. Try finding in helpers collection (slug-based or ID-based)
            let helper = await db.collection('helpers').findOne({ id: id });
            
            // 2. Fallback: Search in users collection (bridge slugs to supabaseId)
            if (!helper) {
                console.log(`[API HELPERS] Checking users collection for match: ${id}`);
                const user = await db.collection('users').findOne({ 
                    $or: [
                        { supabaseId: id },
                        { id: id },
                        { slug: id },
                        { email: id.toLowerCase() }
                    ],
                    role: 'worker' 
                });
                
                if (user) {
                    console.log(`[API HELPERS] Found match in users: ${user.supabaseId || user.id}`);
                    helper = {
                        id: user.supabaseId || user.id || id,
                        supabaseId: user.supabaseId || user.id,
                        name: user.name,
                        avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`,
                        skills: user.profession ? [user.profession] : [],
                        rating: user.rating || 4.8,
                        completedJobs: user.completedJobs || 0,
                        isAvailable: true,
                        location: user.address || user.location || 'Location Hidden',
                        experience: user.experience || 0,
                        phone: user.phone || '',
                        description: user.bio || user.description || '',
                        reviews: []
                    } as any;
                }
            }
            
            if (helper) return NextResponse.json(helper);
        } catch (dbErr) {
            console.warn('DB Helper fetch failed, checking fallback', dbErr);
        }

        const fallback = FALLBACK_HELPERS.find(h => h.id === id);
        if (fallback) return NextResponse.json(fallback);

        return NextResponse.json({ error: 'Helper not found' }, { status: 404 });
    } catch (error) {
        console.error('Helper API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch helper' }, { status: 500 });
    }
}
