import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import process from 'process';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

const LOG_FILE = 'scripts/debug-output.log';
function logFile(msg) {
    fs.appendFileSync(LOG_FILE, msg + '\n');
    console.log(msg);
}

if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);

async function testFetch() {
    logFile('--- Testing Direct Fetch from Bookings ---');
    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .limit(1);

    if (error) {
        logFile('❌ Fetch Error: ' + JSON.stringify(error, null, 2));
    } else {
        logFile('✅ Fetch Success, found: ' + data.length + ' records');
        if (data.length > 0) logFile('First ID: ' + data[0].id);
    }

    logFile('--- Testing Realtime Subscription ---');
    const channel = supabase
        .channel('test-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
            logFile('Received payload: ' + JSON.stringify(payload));
        })
        .subscribe((status) => {
            logFile('Subscription status: ' + status);
        });
    
    // Auto-timeout after 5s
    setTimeout(() => {
        logFile('Subscription check complete (timeout)');
        process.exit(0);
    }, 5000);
}

testFetch();
