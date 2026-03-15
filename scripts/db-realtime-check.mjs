
import { getDb } from '../src/lib/mongodb.ts';
import { supabaseAdmin } from '../src/lib/supabase.ts';

async function verifyDatabases() {
    console.log('--- Database Consistency Check ---');
    
    try {
        // 1. Check MongoDB
        const db = await getDb();
        const mongoUserCount = await db.collection('users').countDocuments();
        const mongoBookingCount = await db.collection('bookings').countDocuments();
        console.log(`[MongoDB] Users: ${mongoUserCount}, Bookings: ${mongoBookingCount}`);

        // 2. Check Supabase
        const { count: sbUserCount, error: userErr } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true });
        const { count: sbBookingCount, error: bookErr } = await supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true });
        
        if (userErr || bookErr) {
            console.error('[Supabase] Error fetching counts:', userErr || bookErr);
        } else {
            console.log(`[Supabase] Users: ${sbUserCount}, Bookings: ${sbBookingCount}`);
        }

        // 3. Match Check
        if (mongoUserCount !== sbUserCount || mongoBookingCount !== sbBookingCount) {
            console.warn('⚠️ WARNING: Record count mismatch between MongoDB and Supabase!');
        } else {
            console.log('✅ PASS: Record counts are synchronized.');
        }

    } catch (err) {
        console.error('Diagnostic failed:', err.message);
    }
}

async function testRealtimeBroadcast() {
    console.log('\n--- Real-time Broadcast Test ---');
    const testChannel = 'test-channel-' + Date.now();
    const channel = supabaseAdmin.channel(testChannel);
    
    try {
        const result = await channel.send({
            type: 'broadcast',
            event: 'test-event',
            payload: { message: 'hello world', timestamp: Date.now() }
        });
        console.log(`[Supabase] Broadcast status to ${testChannel}: ${result}`);
        if (result === 'ok') {
            console.log('✅ PASS: Real-time broadcast system is reachable.');
        } else {
            console.error('❌ FAIL: Real-time broadcast failed with status:', result);
        }
    } catch (err) {
        console.error('❌ FAIL: Real-time broadcast error:', err.message);
    }
}

async function run() {
    await verifyDatabases();
    await testRealtimeBroadcast();
    process.exit(0);
}

run();
