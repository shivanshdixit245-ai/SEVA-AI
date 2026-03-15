import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!.trim();

if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
}

const options = {
    connectTimeoutMS: 30000,
    serverSelectionTimeoutMS: 30000,
    directConnection: MONGODB_URI.includes('localhost') || MONGODB_URI.includes('127.0.0.1')
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

export async function getDb(): Promise<Db> {
    try {
        if (!clientPromise) {
            client = new MongoClient(MONGODB_URI, options);
            
            // Create a connection promise with a strict timeout
            const connectionPromise = client.connect();
            const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('MongoDB connection timeout (30000ms)')), 30000)
            );

            clientPromise = Promise.race([connectionPromise, timeoutPromise])
                .then(c => {
                    return c;
                })
                .catch(err => {
                    console.error('❌ MongoDB connection failed:', err.message);
                    clientPromise = null; 
                    throw err;
                });
        }

        const connectedClient = await clientPromise;
        return connectedClient.db(); 
    } catch (error: any) {
        console.error('CRITICAL in getDb:', error.message);
        throw error;
    }
}

export default clientPromise;
