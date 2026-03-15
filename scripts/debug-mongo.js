const { MongoClient } = require('mongodb');
// Environment variables should be loaded via node --env-file=.env.local if needed

async function debugMongo() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('sevaai');
        const helpers = db.collection('helpers');
        
        console.log('--- MongoDB Helper Name Search ---');
        const allH = await helpers.find({}).toArray();
        let results = '';
        allH.forEach(h => {
             results += `ID: ${h.id} | Name: ${h.name} | Phone: ${h.phone}\n`;
        });
        
        const fs = require('fs');
        fs.writeFileSync('scripts/mongo-helpers-debug.txt', results);
        console.log('Results written to scripts/mongo-helpers-debug.txt');

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

debugMongo();
