import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getDb } from '@/lib/mongodb';
import { getServerUser } from '@/lib/auth';

// GET: Fetch all pending jobs (for workers to browse)
export async function GET(request: NextRequest) {
    try {
        const user = await getServerUser(request);
        if (!user || user.role !== 'worker') {
            return NextResponse.json({ error: 'Unauthorized: Worker access required' }, { status: 401 });
        }
        // FAST PATH: Query Supabase
        const { data, error } = await supabaseAdmin
            .from('bookings')
            .select('*')
            .eq('status', 'pending_acceptance')
            .order('created_at', { ascending: false })
            .limit(50);

        if (!error && data) {
            // Map to camelCase
            return NextResponse.json(data.map(b => ({
                id: b.id,
                userId: b.user_id,
                serviceType: b.service_type,
                description: b.description,
                location: b.location,
                urgency: b.urgency,
                price: b.price,
                createdAt: b.created_at,
                status: b.status
            })));
        }

        // SLOW FALLBACK
        const db = await getDb();
        const jobs = await db.collection('bookings')
            .find({ status: 'pending_acceptance' })
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();

        return NextResponse.json(jobs || []);
    } catch (error: any) {
        console.error('Fetch jobs error:', error);
        return NextResponse.json([]);
    }
}

// POST: Worker accepts a job
export async function POST(request: NextRequest) {
    try {
        const user = await getServerUser(request);
        const { bookingId, workerId, workerName } = await request.json();

        if (!user || (user.id !== workerId && user.role !== 'admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!bookingId || !workerId) {
            return NextResponse.json({ error: 'Booking ID and Worker ID are required' }, { status: 400 });
        }

        const now = new Date().toISOString();

        // 1. FAST PATH: Fetch worker's profile directly from Supabase (instead of MongoDB)
        let workerProfile: any = null;
        const { data: sbProfile } = await supabaseAdmin.from('workers').select('*').eq('id', workerId).single();
        if (sbProfile) {
            workerProfile = sbProfile;
        } else {
            // Fallback to fast promise race for MongoDB
            try {
                const db = await getDb();
                workerProfile = await Promise.race([
                    db.collection('users').findOne({ supabaseId: workerId }),
                    new Promise((_, r) => setTimeout(() => r(null), 3000))
                ]);
            } catch (e) { console.warn('Worker profile missing'); }
        }

        const workerDisplayName = workerProfile?.name || workerName || 'Helper';
        const workerPhone = workerProfile?.phone || '';
        const workerProfession = workerProfile?.profession || workerProfile?.doc_type || 'Professional Worker';
        const workerExperience = parseInt(workerProfile?.experience) || 0;
        const isVerified = workerProfile?.verificationStatus === 'verified' || workerProfile?.verification_status === 'verified' || workerProfile?.verificationStatus === 'pending';

        // 2. ATOMIC SUPABASE UPDATE: Only update if it's currently 'pending_acceptance'
        const { data: updatedRecord, error: updateError } = await supabaseAdmin
            .from('bookings')
            .update({ 
                status: 'Confirmed', 
                worker_id: workerId,
                worker_name: workerDisplayName,
                worker_phone: workerPhone,
                worker_profession: workerProfession,
                worker_experience: workerExperience,
                worker_verified: isVerified,
                accepted_at: now
            })
            .eq('id', bookingId)
            .eq('status', 'pending_acceptance')
            .select()
            .single();

        if (updateError || !updatedRecord) {
            return NextResponse.json({ error: 'This job has already been taken or no longer exists' }, { status: 409 });
        }

        // 3. BACKGROUND SYNC TO MONGODB (Un-Awaited)
        getDb().then(async (db) => {
            try {
                await db.collection('bookings').updateOne(
                    { id: bookingId },
                    { 
                        $set: { 
                            status: 'Confirmed', 
                            workerId: workerId,
                            workerName: workerDisplayName,
                            workerPhone: workerPhone,
                            workerProfession: workerProfession,
                            workerExperience: workerExperience,
                            workerVerified: isVerified,
                            acceptedAt: now
                        } 
                    }
                );
            } catch (e) { console.warn('Background Mongo sync failed'); }
        }).catch(() => {});

        // 4. RETURN INSTANTLY
        return NextResponse.json({ 
            success: true, 
            message: 'Job accepted!',
            workerName: workerDisplayName
        });
    } catch (error: any) {
        console.error('Accept job error:', error);
        return NextResponse.json({ error: 'Failed to accept job' }, { status: 500 });
    }
}
