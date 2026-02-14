
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkBookings() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI is not defined');
        return;
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('sevaai');
        const bookings = await db.collection('bookings').find({}).toArray();

        console.log(`Found ${bookings.length} bookings in database.`);
        if (bookings.length > 0) {
            console.log('Sample booking:', JSON.stringify(bookings[0], null, 2));
        } else {
            console.log('No bookings found. You might want to create one via the app.');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}

checkBookings();
