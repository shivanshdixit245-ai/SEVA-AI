import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

async function debugIds() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        console.error('Missing credentials');
        process.exit(1);
    }

    const supabase = createClient(url, key);
    let output = 'ID COMPARISON REPORT\n====================\n\n';

    const ids = [
        'c4cb74cb-9420-46d1-a51e-6c2cb740d2d3',
        'c4cb74cb-9420-46d1-a51e-6c2c6662f22b'
    ];

    for (const id of ids) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            output += `ID ${id}: Profile Not Found: ${error.message}\n`;
        } else {
            output += `ID ${id}: FOUND Profile! ${JSON.stringify(data)}\n`;
        }
        
        const { data: worker, error: wError } = await supabase
            .from('workers')
            .select('*')
            .eq('id', id)
            .single();

        if (wError) {
             output += `ID ${id}: Worker Not Found: ${wError.message}\n`;
        } else {
             output += `ID ${id}: FOUND in Workers! ${JSON.stringify(worker)}\n`;
        }
        output += '\n------------------\n';
    }

    fs.writeFileSync('scripts/id-summary-v2.txt', output);
    console.log('Analysis written to scripts/id-summary-v2.txt');
}

debugIds();
