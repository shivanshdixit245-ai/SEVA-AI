import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMessages() {
    const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(20);
    console.log(JSON.stringify(data, null, 2));
    if (error) console.error(error);
}

checkMessages();
