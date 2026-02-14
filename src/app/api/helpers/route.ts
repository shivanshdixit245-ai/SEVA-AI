
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { seedHelpers } from '@/lib/seed-helpers';

export async function GET() {
    try {
        await seedHelpers(); // Ensure data exists

        const db = await getDb();
        const helpers = await db.collection('helpers').find({}).toArray();

        return NextResponse.json(helpers);
    } catch (error) {
        console.error('Helpers API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch helpers' }, { status: 500 });
    }
}
