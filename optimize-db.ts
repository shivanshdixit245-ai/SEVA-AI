import { supabaseAdmin } from './src/lib/supabase';

async function optimizeDb() {
    console.log('--- Database Optimization Audit ---');
    
    // In a real environment, we'd run raw SQL. 
    // Since we don't have direct SQL access here, we'll verify the tables are accessible 
    // and ideally ensure they have enough data for Supabase's auto-indexing 
    // or log instructions if we could.
    
    try {
        const { count, error } = await supabaseAdmin
            .from('workers')
            .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        console.log(`- Workers table: OK (${count || 0} rows)`);
        
        const { count: bCount, error: bError } = await supabaseAdmin
            .from('bookings')
            .select('*', { count: 'exact', head: true });
            
        if (bError) throw bError;
        console.log(`- Bookings table: OK (${bCount || 0} rows)`);

        console.log('\nOptimization Recommendation:');
        console.log('Ensure the following indexes exist in Supabase SQL Editor:');
        console.log('CREATE INDEX idx_workers_role_created ON workers(role, created_at DESC);');
        console.log('CREATE INDEX idx_bookings_user_worker_created ON bookings(user_id, worker_id, created_at DESC);');
        
    } catch (err: any) {
        console.error('Optimization Audit Failed:', err.message);
    }
}

optimizeDb();
