import { NextResponse, NextRequest } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { getServerUser, sanitizeText, resolveToUuid, resolveFullIdentity } from '@/lib/auth';
import { Booking } from '@/types/booking';

function estimatePrice(serviceType: string): number {
    const prices: Record<string, number> = {
        'Deep Cleaning': 1999,
        'Plumbing': 499,
        'Electrician': 399,
        'Painting': 5000,
        'Carpentry': 599,
        'Appliance Repair': 699,
        'Pest Control': 899,
        'AC Service': 799
    };
    return prices[serviceType] || 500;
}

export async function GET(request: NextRequest) {
    try {
        const user = await getServerUser(request);
        const { searchParams } = new URL(request.url);
        const rawUserId = searchParams.get('userId');
        const rawWorkerId = searchParams.get('workerId');
        const status = searchParams.get('status');
        
        // UNIVERSAL IDENTITY RESOLUTION: Find all possible aliases (UUID, Slug, Email)
        const userPool = rawUserId ? await resolveFullIdentity(rawUserId) : null;
        const workerPool = rawWorkerId ? await resolveFullIdentity(rawWorkerId) : null;

        // IDs for Supabase checks
        const userAliases = [userPool?.uuid, userPool?.slug].filter(Boolean) as string[];
        const workerAliases = [workerPool?.uuid, workerPool?.slug].filter(Boolean) as string[];

        // SECURITY: Verify session and ownership
        const userRole = String(user?.role || '').toLowerCase();
        const isAdmin = userRole === 'admin';
        // Ownership check: session user UUID must match one of the queried pools
        const isSelf = user?.id && (
            (userPool?.uuid === user.id) || 
            (workerPool?.uuid === user.id)
        );
        const isFetchingPendingWork = status === 'pending_acceptance';

        if (!user && process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!isAdmin && !isSelf && !isFetchingPendingWork && process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const isAdminDebug = isAdmin || (process.env.NODE_ENV === 'development' && (!rawUserId && !rawWorkerId));

        // 1. Fetch from Supabase (Super-Search)
        let supabaseBookings: Booking[] = [];
        try {
            let query = supabaseAdmin.from('bookings').select('*');
            
            if (!isAdminDebug) {
                // Use .in() for multi-alias search
                if (userAliases.length > 0) query = query.in('user_id', userAliases);
                if (workerAliases.length > 0) query = query.in('worker_id', workerAliases);
            }
            if (status) query = query.eq('status', status);
            query = query.order('created_at', { ascending: false });

            const { data, error: sErr } = await query;
            if (data && !sErr) {
                supabaseBookings = data.map(b => ({
                    ...b,
                    userId: b.user_id,
                    helperId: b.worker_id || b.helper_id,
                    scheduledDate: b.scheduled_date,
                    createdAt: b.created_at,
                    serviceType: b.service_type,
                    workerId: b.worker_id,
                    workerName: b.worker_name,
                    workerPhone: b.worker_phone,
                    workerProfession: b.worker_profession,
                    workerExperience: b.worker_experience,
                    workerVerified: b.worker_verified,
                    liveLat: b.live_lat,
                    liveLng: b.live_lng,
                    acceptedAt: b.accepted_at,
                    id: b.id
                }));
            }
        } catch (err: any) {
            console.error(`GET Bookings: Supabase Error: ${err.message}`);
        }

        // 2. Fetch from MongoDB (Full Identity Reconciliation)
        let mongoBookings: Booking[] = [];
        try {
            const db = await getDb();
            const filter: any = {};
            
            if (!isAdminDebug) {
                const orConditions: any[] = [];
                // Check all possible aliases in MongoDB
                if (userPool) {
                    if (userPool.uuid) orConditions.push({ userId: userPool.uuid }, { user_id: userPool.uuid });
                    if (userPool.slug) orConditions.push({ userId: userPool.slug }, { user_id: userPool.slug });
                    if (userPool.email) orConditions.push({ userId: userPool.email }, { email: userPool.email });
                }
                if (workerPool) {
                    if (workerPool.uuid) orConditions.push({ workerId: workerPool.uuid }, { worker_id: workerPool.uuid }, { helperId: workerPool.uuid });
                    if (workerPool.slug) orConditions.push({ workerId: workerPool.slug }, { worker_id: workerPool.slug }, { helperId: workerPool.slug });
                }
                if (orConditions.length > 0) filter.$or = orConditions;
            }
            if (status) filter.status = status;
            
            const results = await db.collection('bookings').find(filter).sort({ createdAt: -1 }).toArray();
            mongoBookings = results.map(b => ({
                ...b,
                userId: b.userId || b.user_id,
                helperId: b.helperId || b.helper_id,
                scheduledDate: b.scheduledDate || b.scheduled_date,
                createdAt: b.createdAt || b.created_at,
                serviceType: b.serviceType || b.service_type,
                id: b.id || b._id?.toString()
            })) as unknown as Booking[];
        } catch (dbErr: any) {
            console.error(`GET Bookings: MongoDB Error: ${dbErr.message}`);
        }

        // 3. UNION AND DEDUPLICATE (Total Coverage)
        const combined = [...supabaseBookings, ...mongoBookings];
        const uniqueMap = new Map();
        combined.forEach(b => {
             if (!uniqueMap.has(b.id)) uniqueMap.set(b.id, b);
        });

        const finalResults = Array.from(uniqueMap.values());
        finalResults.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json(finalResults);
    } catch (error: any) {
        console.error('Bookings API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch bookings', details: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const bookingData = await request.json();
        
        if (!bookingData.userId || !bookingData.serviceType) {
            return NextResponse.json({ 
                error: 'Missing required information. Please ensure you are logged in and have selected a service.' 
            }, { status: 400 });
        }

        // Resolve Slug to UUID before saving to Supabase
        const resolvedUserId = await resolveToUuid(bookingData.userId) || bookingData.userId;

        // Enrich booking data
        const newBooking: Booking = {
            id: `BK-${crypto.randomUUID().split('-')[0].toUpperCase()}`,
            status: 'pending_acceptance',
            createdAt: new Date().toISOString(),
            scheduledDate: bookingData.date || new Date(Date.now() + 86400000).toISOString(),
            otp: String(Math.floor(1000 + Math.random() * 9000)),
            price: estimatePrice(bookingData.serviceType),
            userId: resolvedUserId,
            serviceType: bookingData.serviceType,
            description: bookingData.description || '',
            location: bookingData.location || '',
            urgency: bookingData.urgency || 'Normal'
        };

        // 1. ATOMIC SYNC: Save to Supabase (Sequential)
        let supabaseSuccess = false;
        try {
            const { error: supabaseError } = await supabaseAdmin
                .from('bookings')
                .insert({
                    id: newBooking.id,
                    user_id: newBooking.userId,
                    service_type: newBooking.serviceType,
                    status: newBooking.status,
                    urgency: newBooking.urgency,
                    description: newBooking.description,
                    location: newBooking.location,
                    created_at: newBooking.createdAt,
                    scheduled_date: newBooking.scheduledDate,
                    price: newBooking.price,
                    otp: newBooking.otp
                });

            if (!supabaseError) {
                supabaseSuccess = true;
            } else {
                console.error(`POST Booking: Supabase Sync FAILED: ${supabaseError.message}`);
            }
        } catch (err: any) {
            console.error(`POST Booking: Supabase Sync Unexpected Error: ${err.message}`);
        }

        // 2. ATOMIC SYNC: Save to MongoDB
        let mongoSuccess = false;
        try {
            const db = await getDb();
            await db.collection('bookings').insertOne(newBooking);
            mongoSuccess = true;
        } catch (err: any) {
            console.error('POST Booking: MongoDB Save FAILED:', err.message);
        }

        if (!supabaseSuccess && !mongoSuccess) {
            return NextResponse.json({ 
                error: 'Service currently unavailable. Failed to persist booking.' 
            }, { status: 503 });
        }

        return NextResponse.json(newBooking);
    } catch (error: any) {
        console.error('Create Booking API Error:', error);
        return NextResponse.json({
            error: 'Failed to create booking',
            details: error.message
        }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await getServerUser(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { ids } = await request.json();

        // SECURITY: Verify ownership before delete (for non-admins)
        if (user.role !== 'admin') {
            const { data: bks } = await supabaseAdmin.from('bookings').select('user_id, worker_id').in('id', ids);
            const unauthorized = bks?.some(b => b.user_id !== user.id && b.worker_id !== user.id);
            if (unauthorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 1. Delete from MongoDB
        try {
            const db = await getDb();
            await db.collection('bookings').deleteMany({ id: { $in: ids } });
        } catch (err) {
            console.error('MongoDB: Failed to delete bookings', err);
        }

        // 2. Delete from Supabase
        const tables = ['bookings', 'confirmed_bookings', 'in_progress_bookings', 'completed_bookings'];
        for (const table of tables) {
            try {
                await supabaseAdmin.from(table).delete().in('id', ids);
            } catch (err) {
                console.error(`Supabase: Failed to delete from ${table}`);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete Booking Error:', error);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
