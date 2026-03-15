import { MongoClient } from 'mongodb';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

async function testConnections() {
    console.log('--- Environment Check ---');
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Defined' : 'Missing');
    console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Defined' : 'Missing');

    console.log('\n--- Testing MongoDB ---');
    if (!process.env.MONGODB_URI) {
        console.error('Error: MONGODB_URI is missing');
    } else {
        try {
            const client = new MongoClient(process.env.MONGODB_URI, {
                tls: true,
                tlsAllowInvalidCertificates: true,
                serverSelectionTimeoutMS: 5000
            });
            await client.connect();
            console.log('✅ MongoDB Connected Successfully');
            await client.close();
        } catch (err) {
            console.error('❌ MongoDB Connection Failed:', err.message);
        }
    }

    console.log('\n--- Testing Supabase ---');
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('Error: Supabase credentials missing');
    } else {
        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            console.log('✅ Supabase Connection (Auth) Successful');
        } catch (err) {
            console.error('❌ Supabase Connection Failed:', err.message);
        }
    }
}

testConnections();
