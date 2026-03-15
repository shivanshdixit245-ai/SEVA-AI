import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getServerUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const user = await getServerUser(request);
        
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Fetch all from Supabase (fast, no SSL issues)
        const [usersRes, bookingsRes, workersRes] = await Promise.all([
            supabaseAdmin.from('users').select('*'),
            supabaseAdmin.from('bookings').select('*').order('created_at', { ascending: false }),
            supabaseAdmin.from('workers').select('*')
        ]);

        const users = usersRes.data || [];
        const bookings = bookingsRes.data || [];
        const workers = workersRes.data || [];

        const clients = users.filter((u: any) => u.role === 'client');
        const workerUsers = users.filter((u: any) => u.role === 'worker');

        // Map Supabase snake_case to camelCase for frontend compatibility
        const mappedBookings = bookings.map((b: any) => ({
            id: b.id,
            userId: b.user_id,
            serviceType: b.service_type,
            status: b.status,
            urgency: b.urgency,
            description: b.description,
            location: b.location,
            createdAt: b.created_at,
            scheduledDate: b.scheduled_date,
            helperId: b.helper_id,
            price: b.price,
            otp: b.otp,
            workerId: b.worker_id,
            workerName: b.worker_name,
            acceptedAt: b.accepted_at,
            liveLat: b.live_lat,
            liveLng: b.live_lng
        }));

        const mappedUsers = users.map((u: any) => ({
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.created_at || new Date().toISOString()
        }));

        const mappedWorkers = workers.map((w: any) => ({
            id: w.id,
            userId: w.user_id,
            name: w.name,
            profession: w.profession,
            experience: w.experience,
            verificationStatus: w.verification_status,
            docType: w.doc_type,
            createdAt: w.created_at
        }));

        const stats = {
            totalClients: clients.length,
            totalWorkers: workerUsers.length,
            totalBookings: mappedBookings.length,
            activeBookings: mappedBookings.filter((b: any) => ['pending_acceptance', 'Confirmed', 'In Progress'].includes(b.status)).length,
            completedBookings: mappedBookings.filter((b: any) => b.status === 'Completed').length,
            incompleteBookings: mappedBookings.filter((b: any) => b.status === 'Cancelled').length,
        };

        return NextResponse.json({
            stats,
            clients: mappedUsers.filter((u: any) => u.role === 'client'),
            workers: mappedUsers.filter((u: any) => u.role === 'worker'),
            bookings: mappedBookings,
            workerProfiles: mappedWorkers
        });
    } catch (error: any) {
        console.error('Admin Stats API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch admin statistics', details: error.message }, { status: 500 });
    }
}
