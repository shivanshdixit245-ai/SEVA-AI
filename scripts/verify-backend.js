
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables manually for the script
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function verifyDatabases() {
    console.log('--- Database Consistency Check ---');
    
    if (!MONGODB_URI || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('❌ Missing environment variables. Check .env.local');
        return;
    }

    const mongoClient = new MongoClient(MONGODB_URI);
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    try {
        // 1. Check MongoDB
        await mongoClient.connect();
        const db = mongoClient.db();
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
    } finally {
        await mongoClient.close();
    }
}

async function testRealtimeBroadcast() {
    console.log('\n--- Real-time Broadcast Test ---');
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const testChannelID = 'test-channel-' + Math.random().toString(36).substring(7);
    const channel = supabaseAdmin.channel(testChannelID);
    
    try {
        const result = await channel.send({
            type: 'broadcast',
            event: 'test-event',
            payload: { message: 'hello world', timestamp: Date.now() }
        });
        console.log(`[Supabase] Broadcast status to ${testChannelID}: ${result}`);
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
}

run();
