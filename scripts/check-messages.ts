import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: messages, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(10);
    console.log("Recent messages:", JSON.stringify(messages, null, 2));
    if (error) console.error("Error:", error);
}

main();
