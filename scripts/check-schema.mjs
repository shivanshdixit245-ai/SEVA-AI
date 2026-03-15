import { supabaseAdmin } from './src/lib/supabase.js';

async function checkSchema() {
    console.log('--- Checking Bookings Schema ---');
    const { data, error } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching booking:', error);
        return;
    }

    if (data && data.length > 0) {
        const first = data[0];
        console.log('Sample Booking ID:', first.id);
        console.log('OTP Type:', typeof first.otp, 'Value:', first.otp);
        console.log('Keys:', Object.keys(first));
    } else {
        console.log('No bookings found.');
    }
}

checkSchema();
