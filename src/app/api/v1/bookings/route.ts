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
        const { searchParams } = new URL(request.url);
        
        // --- TEMPORARY DEBUG DUMP ---
        if (searchParams.get('debug') === 'dump55') {
            const db = await getDb();
            const allMongo = await db.collection('bookings').find({}).toArray();
            const { data: allSupabase } = await supabaseAdmin.from('bookings').select('*');
            const allUsers = await db.collection('users').find({}).toArray();
            return NextResponse.json({
                userDbMatches: allUsers.map(u => ({ slug: u.slug, email: u.email, id: u.supabaseId })),
                mongoCount: allMongo.length,
                supabaseCount: allSupabase?.length || 0,
                mongoSamples: allMongo.slice(0, 10),
                supabaseSamples: allSupabase?.slice(0, 10),
            });
        }

        const user = await getServerUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rawUserId = searchParams.get('userId');
        const rawWorkerId = searchParams.get('workerId');
        const status = searchParams.get('status');

        
        // --- IDENTITY RESOLUTION ---
        // If neither userId nor workerId is provided, we default to the current user's identity
        let targetUserId = rawUserId || (!rawWorkerId ? user.id : null);
        let targetWorkerId = rawWorkerId;

        const userPoolById = targetUserId ? await resolveFullIdentity(targetUserId) : null;
        // DOUBLE-RESOLUTION: If this is the current user, also resolve by their email to catch disconnected legacy MongoDB records
        const userPoolByEmail = (targetUserId === user.id && user.email) ? await resolveFullIdentity(user.email) : null;
        
        const userPool = targetUserId ? {
            uuid: userPoolById?.uuid || userPoolByEmail?.uuid || null,
            slug: userPoolById?.slug || userPoolByEmail?.slug || null,
            email: userPoolById?.email || userPoolByEmail?.email || null
        } : null;

        const workerPoolById = targetWorkerId ? await resolveFullIdentity(targetWorkerId) : null;
        const workerPoolByEmail = (targetWorkerId === user.id && user.email) ? await resolveFullIdentity(user.email) : null;

        const workerPool = targetWorkerId ? {
            uuid: workerPoolById?.uuid || workerPoolByEmail?.uuid || null,
            slug: workerPoolById?.slug || workerPoolByEmail?.slug || null,
            email: workerPoolById?.email || workerPoolByEmail?.email || null
        } : null;

        // SECURITY: Verify session and ownership
        const userRole = String(user?.role || '').toLowerCase();
        const isAdminFromRegistry = userRole === 'admin' || user.email === process.env.ADMIN_EMAIL;
        
        // ADMIN UNIVERSAL VISION: If they are admin, reset targets to null so they fetch EVERYTHING
        if (isAdminFromRegistry) {
            targetUserId = null;
            targetWorkerId = null;
        }

        // Ownership check: session user UUID must match one of the queried pools
        const isSelf = (userPool?.uuid === user.id) || 
                       (userPool?.slug === user.id) || 
                       (userPoolByEmail?.uuid === user.id) ||
                       (workerPool?.uuid === user.id) ||
                       (!rawUserId && !rawWorkerId); // Default to self if no specific filter

        if (!isAdminFromRegistry && !isSelf) {
            return NextResponse.json({ error: 'Access Denied: You can only view your own bookings.' }, { status: 403 });
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        // --- 1. SUPABASE SEARCH ---
        let supabaseBookings: Booking[] = [];
        try {
            let query = supabaseAdmin.from('bookings').select('*');
            
            // Apply User Filter (UUID only for Supabase)
            if (targetUserId) {
                const uuids = [userPool?.uuid, userPoolByEmail?.uuid].filter(id => id && uuidRegex.test(id)) as string[];
                if (uuids.length > 0) {
                    query = query.in('user_id', uuids);
                } else {
                    // If we have no valid UUID for the target user, Supabase can't have record (it's a UUID column)
                    query = query.eq('id', 'none'); 
                }
            }

            // Apply Worker Filter (UUID only for Supabase)
            if (targetWorkerId) {
                const uuids = [workerPool?.uuid].filter(id => id && uuidRegex.test(id)) as string[];
                if (uuids.length > 0) {
                    query = query.in('worker_id', uuids);
                } else {
                    query = query.eq('id', 'none');
                }
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
            console.error(`GET Bookings Supabase Error: ${err.message}`);
        }

        // --- 2. MONGODB SEARCH ---
        let mongoBookings: Booking[] = [];
        try {
            const db = await getDb();
            const mongoFilter: any = {};
            
            const orConditions: any[] = [];
            
            // Raw Fallbacks (Critical for surviving arbitrary unlinked IDs like 'guest-user')
            if (targetUserId) orConditions.push({ userId: targetUserId }, { user_id: targetUserId });
            if (targetWorkerId) orConditions.push({ workerId: targetWorkerId }, { worker_id: targetWorkerId }, { helperId: targetWorkerId });

            if (userPool) {
                if (userPool.uuid) orConditions.push({ userId: userPool.uuid }, { user_id: userPool.uuid });
                if (userPool.slug) orConditions.push({ userId: userPool.slug }, { user_id: userPool.slug });
                if (userPool.email) orConditions.push({ userId: userPool.email }, { email: userPool.email });
            }
            if (workerPool) {
                if (workerPool.uuid) orConditions.push({ workerId: workerPool.uuid }, { worker_id: workerPool.uuid }, { helperId: workerPool.uuid });
                if (workerPool.slug) orConditions.push({ workerId: workerPool.slug }, { worker_id: workerPool.slug }, { helperId: workerPool.slug });
            }

            if (orConditions.length > 0 && !isAdminFromRegistry) mongoFilter.$or = orConditions;
            if (status) mongoFilter.status = status;
            
            const results = await db.collection('bookings').find(mongoFilter).sort({ createdAt: -1 }).toArray();
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
            console.error(`GET Bookings MongoDB Error: ${dbErr.message}`);
        }

        // --- 3. DEDUPLICATE & SORT ---
        const combined = [...supabaseBookings, ...mongoBookings];
        const uniqueMap = new Map();
        combined.forEach(b => {
             if (!uniqueMap.has(b.id)) uniqueMap.set(b.id, b);
        });

        const finalResults = Array.from(uniqueMap.values());
        finalResults.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json(finalResults);
    } catch (error: any) {
        console.error('Bookings API CRITICAL Error:', error);
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
