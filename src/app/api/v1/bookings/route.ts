import { NextResponse, NextRequest } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { getServerUser, sanitizeText } from '@/lib/auth';
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
        const userId = searchParams.get('userId');
        const workerId = searchParams.get('workerId');
        const status = searchParams.get('status');
        
        // SECURITY: Verify session and ownership
        const userRole = String(user?.role || '').toLowerCase();
        const isAdmin = userRole === 'admin';
        const isSelf = user?.id && (user.id === userId || user.id === workerId);
        const isWorkerFetchingPending = userRole === 'worker' && status === 'pending_acceptance';

        if (!user && process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
        }

        if (!isAdmin && !isSelf && !isWorkerFetchingPending && process.env.NODE_ENV === 'production') {
            console.warn(`[SECURITY] Forbidden access attempt by ${user?.email} (${userRole})`);
            return NextResponse.json({ error: 'Forbidden: You do not have permission to view these bookings' }, { status: 403 });
        }

        const isAdminDebug = isAdmin || (process.env.NODE_ENV === 'development' && (!userId && !workerId));

        // 1. PRIMARY: Fetch from Supabase (Stupidly fast)
        try {
            let query = supabaseAdmin.from('bookings').select('*').order('created_at', { ascending: false });
            
            if (!isAdminDebug) {
                if (userId) query = query.eq('user_id', userId);
                if (workerId) query = query.eq('worker_id', workerId);
                if (status) query = query.eq('status', status);
            } else if (status) {
                query = query.eq('status', status);
            }


            const { data, error } = await query;
            
            if (!error && data && data.length > 0) {
                const normalized = data.map(b => ({
                    ...b,
                    userId: b.user_id,
                    helperId: b.worker_id || b.helper_id, // Hardened mapping
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
                return NextResponse.json(normalized);
            }
            if (error) console.error(`GET Bookings: Supabase Error: ${error.message}`);
        } catch (err: any) {
            console.error(`GET Bookings: Supabase Fetch Error: ${err.message}`);
        }

        // 2. SECONDARY: Fallback to MongoDB only if Supabase is empty/fails
        let allResults: Booking[] = [];
        
        try {
            const db = await getDb();
            const filter: any = {};
            
            if (!isAdminDebug) {
                const orConditions: any[] = [];
                if (userId) orConditions.push({ userId }, { user_id: userId });
                if (workerId) orConditions.push({ workerId }, { worker_id: workerId }, { helperId: workerId }, { helper_id: workerId });
                
                if (orConditions.length > 0) {
                    filter.$or = orConditions;
                } else {
                    // Force no results if no IDs provided and not admin
                    return NextResponse.json([]);
                }
            }
            
            const mongoBookings = await db.collection('bookings')
                .find(filter)
                .sort({ createdAt: -1 })
                .toArray();
            
            const normalizedMongo = mongoBookings.map(b => ({
                ...b,
                userId: b.userId || b.user_id,
                helperId: b.helperId || b.helper_id,
                scheduledDate: b.scheduledDate || b.scheduled_date,
                createdAt: b.createdAt || b.created_at,
                serviceType: b.serviceType || b.service_type,
                id: b.id || b._id?.toString()
            })) as unknown as Booking[];
            allResults = normalizedMongo;
        } catch (dbErr: any) {
            console.error(`GET Bookings: MongoDB fallback Failed: ${dbErr.message}`);
        }

        const uniqueBookings = Array.from(new Map(allResults.map(b => [b.id, b])).values());
        uniqueBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json(uniqueBookings);
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

        // Enrich booking data
        const newBooking: Booking = {
            id: `BK-${crypto.randomUUID().split('-')[0].toUpperCase()}`,
            status: 'pending_acceptance',
            createdAt: new Date().toISOString(),
            scheduledDate: bookingData.date || new Date(Date.now() + 86400000).toISOString(),
            otp: String(Math.floor(1000 + Math.random() * 9000)),
            price: estimatePrice(bookingData.serviceType),
            ...bookingData,
            helperId: undefined // No helper until a worker accepts
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
                    helper_id: newBooking.helperId,
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

        // 2. ATOMIC SYNC: Save to MongoDB (Sequential Await)
        // In production/serverless, background promises can be terminated prematurely.
        // We await the MongoDB save to ensure data persistence before returning.
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
            console.log('MongoDB: Bookings deleted');
        } catch (err) {
            console.error('MongoDB: Failed to delete bookings', err);
        }

        // 2. Delete from Supabase
        const allSupabaseTables = ['bookings', 'confirmed_bookings', 'in_progress_bookings', 'completed_bookings'];
        for (const table of allSupabaseTables) {
            try {
                const { error } = await supabaseAdmin
                    .from(table)
                    .delete()
                    .in('id', ids);

                if (error) {
                    console.error(`Supabase '${table}': Failed to delete bookings`, error);
                } else {
                    console.log(`Supabase '${table}': Bookings deleted`);
                }
            } catch (err) {
                console.error(`Supabase '${table}': Unexpected error deleting bookings`, err);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete Booking API Error:', error);
        return NextResponse.json({ error: 'Failed to delete bookings', details: error.message }, { status: 500 });
    }
}
