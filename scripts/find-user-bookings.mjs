import { supabase } from './src/lib/supabase.js';

async function findUserBookings() {
    const userId = '445e8167-3a04-4f9b-b27c-3a04d4609c41';
    console.log(`Checking bookings for user: ${userId}`);
    
    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(JSON.stringify(data, null, 2));
}

findUserBookings();
