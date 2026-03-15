import { supabase } from './src/lib/supabase.js';

async function findActive() {
    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .in('status', ['Confirmed', 'In Progress']);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(JSON.stringify(data, null, 2));
}

findActive();
