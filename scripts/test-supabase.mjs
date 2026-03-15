import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testSupabase() {
    console.log('--- Supabase Check ---');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('URL:', url);

    if (!url || !key) {
        console.error('Missing credentials');
        process.exit(1);
    }

    try {
        const supabase = createClient(url, key);
        console.log('Client created, fetching session...');
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.error('❌ Supabase Auth Error:', error.message);
        } else {
            console.log('✅ Supabase Auth connectivity OK');
        }
    } catch (err) {
        console.error('❌ Supabase Crash:', err.message);
    }
}

testSupabase();
