import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// In development, use a global variable to preserve the client across hot reloads
const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
};

if (process.env.NODE_ENV === 'development') {
    if (!globalWithMongo._mongoClientPromise) {
        client = new MongoClient(MONGODB_URI);
        globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
} else {
    client = new MongoClient(MONGODB_URI);
    clientPromise = client.connect();
}

export default clientPromise;

export async function getDb(): Promise<Db> {
    const client = await clientPromise;
    return client.db('sevaai');
}
