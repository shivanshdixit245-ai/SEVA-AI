
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert import.meta.url to __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Must import AFTER loading env vars
import { createClient } from '@supabase/supabase-js';
import { MongoClient, ServerApiVersion } from 'mongodb';

async function verifyConnections() {
    console.log('--- Verifying Connections ---');

    // 1. Check Environment Variables
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('❌ Supabase credentials missing in .env.local');
        return;
    }
    if (!MONGODB_URI) {
        console.error('❌ MongoDB URI missing in .env.local');
        return;
    }

    console.log('✅ Environment variables loaded.');
    console.log(`   - Supabase URL: ${SUPABASE_URL}`);
    console.log(`   - MongoDB URI: ${MONGODB_URI.substring(0, 20)}...`);

    // 2. Test Supabase Connection (Public Client)
    try {
        console.log('Testing Supabase connection...');
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.error('❌ Supabase connection failed:', error.message);
        } else {
            console.log('✅ Supabase connection successful (Public Client).');
        }
    } catch (err: any) {
        console.error('❌ Supabase connection error:', err.message);
    }

    // 3. Test MongoDB Connection
    let mongoClient;
    try {
        console.log('Testing MongoDB connection...');
        mongoClient = new MongoClient(MONGODB_URI, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            },
            connectTimeoutMS: 10000, // 10s timeout
            socketTimeoutMS: 10000,
        });

        await mongoClient.connect();
        console.log('✅ MongoDB connection successful.');

        const db = mongoClient.db('sevaai');
        console.log('   Ping database...');
        await db.command({ ping: 1 });
        console.log('   Ping successful.');

        const collections = await db.listCollections().toArray();
        console.log('   Collections found:', collections.map(c => c.name).join(', ') || 'None');

        // 4. List Users (answering user request)
        console.log('\n--- MongoDB Data: Users ---');
        const users = await db.collection('users').find({}).limit(5).toArray();
        if (users.length === 0) {
            console.log('   No users found in "users" collection.');
        } else {
            users.forEach(user => {
                console.log(`   - ${user.name} (${user.email}) [Role: ${user.role}]`);
            });
        }

    } catch (err: any) {
        console.error('❌ MongoDB connection error:', err);
    } finally {
        if (mongoClient) {
            await mongoClient.close();
            console.log('MongoDB connection closed.');
        }
    }
}

verifyConnections().catch(console.error);
