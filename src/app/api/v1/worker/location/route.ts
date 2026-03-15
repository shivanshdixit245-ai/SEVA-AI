import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getDb } from '@/lib/mongodb';
import { getServerUser } from '@/lib/auth';

// Worker updates their live location for a booking
export async function POST(request: NextRequest) {
    try {
        const user = await getServerUser(request);
        const { bookingId, lat, lng } = await request.json();

        if (!bookingId || lat === undefined || lng === undefined) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // SECURITY: Verify session and that the user is the worker for this booking
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const { data: booking } = await supabaseAdmin.from('bookings').select('worker_id').eq('id', bookingId).single();
        if (!booking || (booking.worker_id !== user.id && user.role !== 'admin')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Update Supabase (primary for real-time)
        try {
            const { error } = await supabaseAdmin
                .from('bookings')
                .update({ live_lat: lat, live_lng: lng })
                .eq('id', bookingId);
            if (error) console.warn('Supabase location update failed:', error);
        } catch (e: any) {
            console.warn('Supabase location sync error:', e.message);
        }

        // Update MongoDB
        try {
            const db = await getDb();
            await db.collection('bookings').updateOne(
                { id: bookingId },
                { $set: { liveLat: lat, liveLng: lng, locationUpdatedAt: new Date().toISOString() } }
            );
        } catch (e: any) {
            console.warn('MongoDB location update error:', e.message);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Client fetches worker's live location for a booking
export async function GET(request: NextRequest) {
    try {
        const user = await getServerUser(request);
        const { searchParams } = new URL(request.url);
        const bookingId = searchParams.get('bookingId');

        if (!bookingId) {
            return NextResponse.json({ error: 'bookingId required' }, { status: 400 });
        }

        // SECURITY: Verify session and that the user is either the client or the worker or an admin
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const db = await getDb();
        const booking = await db.collection('bookings').findOne(
            { id: bookingId }
        );

        if (!booking) {
            return NextResponse.json({ liveLat: null, liveLng: null });
        }

        const isAdmin = user.role === 'admin';
        const isClient = booking.userId === user.id || booking.user_id === user.id;
        const isWorker = booking.workerId === user.id || booking.worker_id === user.id;

        if (!isAdmin && !isClient && !isWorker) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (!booking) {
            return NextResponse.json({ liveLat: null, liveLng: null });
        }

        return NextResponse.json({
            liveLat: booking.liveLat,
            liveLng: booking.liveLng,
            status: booking.status,
            workerId: booking.workerId,
            updatedAt: booking.locationUpdatedAt
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
