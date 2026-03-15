import { MongoClient } from 'mongodb';
import { createClient } from '@supabase/supabase-client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function verifyPersistence() {
    console.log('🧐 Verifying persistence for "load-test-user"...');
    
    // 1. Check MongoDB
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db();
        const mongoCount = await db.collection('bookings').countDocuments({ userId: 'load-test-user' });
        console.log(`MongoDB: Found ${mongoCount} bookings.`);
        await client.close();
    } catch (err) {
        console.error('MongoDB Verification Failed:', err.message);
    }

    // 2. Check Supabase
    try {
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { count, error } = await supabaseAdmin
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', 'load-test-user');
        
        if (error) throw error;
        console.log(`Supabase: Found ${count} bookings.`);
    } catch (err) {
        console.error('Supabase Verification Failed:', err.message);
    }
}

verifyPersistence();
