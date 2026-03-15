
const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. Load Environment Variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const SB_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SB_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

async function sbRequest(table, select = '*') {
    return new Promise((resolve, reject) => {
        const url = `${SB_URL}/rest/v1/${table}?select=${select}`;
        const options = {
            method: 'GET',
            headers: {
                'apikey': SB_KEY,
                'Authorization': `Bearer ${SB_KEY}`,
                'Prefer': 'count=exact'
            }
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const countHeader = res.headers['content-range'];
                const count = countHeader ? countHeader.split('/')[1] : 'unknown';
                resolve({ count, status: res.statusCode });
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function runAudit() {
    console.log('--- Supabase Backend Audit ---');
    
    if (!SB_URL || !SB_KEY) {
        console.error('❌ Missing Supabase credentials in .env.local');
        return;
    }

    try {
        const users = await sbRequest('users', 'id');
        const bookings = await sbRequest('bookings', 'id');
        const workers = await sbRequest('workers', 'id');

        console.log(`[Supabase] Users: ${users.count}`);
        console.log(`[Supabase] Bookings: ${bookings.count}`);
        console.log(`[Supabase] Workers: ${workers.count}`);
        
        if (users.status === 200) {
            console.log('✅ PASS: Supabase REST API is accessible and returning data.');
        } else {
            console.error(`❌ FAIL: Supabase returned status ${users.status}`);
        }

    } catch (err) {
        console.error('Audit failed:', err.message);
    }
}

runAudit();
