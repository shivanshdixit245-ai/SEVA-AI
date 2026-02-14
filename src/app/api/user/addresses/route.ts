
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const db = await getDb();
        const user = await db.collection('users').findOne({ supabaseId: userId });

        return NextResponse.json(user?.addresses || []);
    } catch (error) {
        console.error('Addresses API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { userId, address } = await request.json();

        if (!userId || !address) {
            return NextResponse.json({ error: 'User ID and address are required' }, { status: 400 });
        }

        const db = await getDb();

        await db.collection('users').updateOne(
            { supabaseId: userId },
            { $addToSet: { addresses: address } as any } // Using addToSet to avoid duplicates
        );

        const updatedUser = await db.collection('users').findOne({ supabaseId: userId });

        return NextResponse.json(updatedUser?.addresses || []);
    } catch (error) {
        console.error('Add Address API Error:', error);
        return NextResponse.json({ error: 'Failed to add address' }, { status: 500 });
    }
}
