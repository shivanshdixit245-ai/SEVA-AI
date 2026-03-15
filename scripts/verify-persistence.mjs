import { getDb } from '../src/lib/mongodb.js';
import { supabaseAdmin } from '../src/lib/supabase.js';

async function verifyPersistence() {
    console.log('🧐 Verifying persistence for "load-test-user"...');
    
    // 1. Check MongoDB
    try {
        const db = await getDb();
        const mongoCount = await db.collection('bookings').countDocuments({ userId: 'load-test-user' });
        console.log(`MongoDB: Found ${mongoCount} bookings.`);
    } catch (err) {
        console.error('MongoDB Verification Failed:', err.message);
    }

    // 2. Check Supabase
    try {
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
