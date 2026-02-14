
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = await getDb();
        const helper = await db.collection('helpers').findOne({ id: id });

        if (!helper) {
            return NextResponse.json({ error: 'Helper not found' }, { status: 404 });
        }

        return NextResponse.json(helper);
    } catch (error) {
        console.error('Helper API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch helper' }, { status: 500 });
    }
}
