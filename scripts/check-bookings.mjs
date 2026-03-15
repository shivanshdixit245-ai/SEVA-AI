import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'sevaai';

if (!uri) {
    console.error('MONGODB_URI is not defined');
    process.exit(1);
}

async function checkBookings() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db(dbName);

        console.log('--- Checking Bookings Collection ---');
        const bookings = await db.collection('bookings').find({}).toArray();
        console.log(`Total Bookings in collection: ${bookings.length}`);

        if (bookings.length > 0) {
            console.log('Sample Booking:', JSON.stringify(bookings[0], null, 2));

            // Group by userId to see what IDs are being used
            const userIds = [...new Set(bookings.map(b => b.userId || b.user_id || 'MISSING'))];
            console.log('User IDs found in bookings:', userIds);
        }

        console.log('--- Checking Users Collection ---');
        const users = await db.collection('users').find({}).toArray();
        console.log(`Total Users in collection: ${users.length}`);
        if (users.length > 0) {
            console.log('Sample User:', JSON.stringify({
                _id: users[0]._id,
                name: users[0].name,
                email: users[0].email,
                supabaseId: users[0].supabaseId,
                role: users[0].role
            }, null, 2));
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}

checkBookings();
