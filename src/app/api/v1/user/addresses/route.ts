
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getServerUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const user = await getServerUser(request);
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!user || (user.id !== userId && user.role !== 'admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = await getDb();
        const mongoUser = await db.collection('users').findOne({ supabaseId: userId });

        return NextResponse.json(mongoUser?.addresses || []);
    } catch (error) {
        console.error('Addresses API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getServerUser(request);
        const { userId, address } = await request.json();

        if (!user || (user.id !== userId && user.role !== 'admin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!address) {
            return NextResponse.json({ error: 'Address is required' }, { status: 400 });
        }

        const db = await getDb();

        await db.collection('users').updateOne(
            { supabaseId: userId },
            { $addToSet: { addresses: address } as any } // Using addToSet to avoid duplicates
        );

        const updatedMongoUser = await db.collection('users').findOne({ supabaseId: userId });

        return NextResponse.json(updatedMongoUser?.addresses || []);
    } catch (error) {
        console.error('Add Address API Error:', error);
        return NextResponse.json({ error: 'Failed to add address' }, { status: 500 });
    }
}
