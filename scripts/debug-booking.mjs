import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

async function debugBooking() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(url, key);

    console.log('--- Checking Booking BK-96A81ECC ---');
    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', 'BK-96A81ECC')
        .single();
    
    if (error) {
        fs.writeFileSync('scripts/booking-debug.txt', `ERROR: ${error.message}`);
    } else {
        fs.writeFileSync('scripts/booking-debug.txt', JSON.stringify(data, null, 2));
    }
    console.log('Result written to scripts/booking-debug.txt');
}

debugBooking();
