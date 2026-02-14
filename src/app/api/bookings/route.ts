import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { Booking } from '@/types/booking';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const db = await getDb();
        // sort by createdAt desc
        const bookings = await db.collection('bookings')
            .find({ userId })
            .sort({ createdAt: -1 })
            .toArray();

        return NextResponse.json(bookings);
    } catch (error) {
        console.error('Bookings API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const bookingData = await request.json();

        if (!bookingData) {
            return NextResponse.json({ error: 'Booking data is required' }, { status: 400 });
        }

        if (!bookingData.userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const db = await getDb();

        // Automatic Assignment Logic
        let assignedHelperId = bookingData.helperId;

        if (!assignedHelperId && bookingData.serviceType) {
            // Find helpers with matching skill
            const matchingHelpers = await db.collection('helpers').find({
                skills: bookingData.serviceType,
                isAvailable: true // Optional: could check availability
            }).toArray();

            if (matchingHelpers.length > 0) {
                // Randomly select one
                const randomHelper = matchingHelpers[Math.floor(Math.random() * matchingHelpers.length)];
                assignedHelperId = randomHelper.id;
            }
        }

        // Enrich booking data
        const newBooking: Booking = {
            id: `BK-${Date.now()}`, // Simple ID generation
            status: 'Confirmed',
            createdAt: new Date().toISOString(),
            scheduledDate: bookingData.date || new Date(Date.now() + 86400000).toISOString(),
            otp: String(Math.floor(1000 + Math.random() * 9000)),
            price: estimatePrice(bookingData.serviceType),
            ...bookingData,
            helperId: assignedHelperId // Assign the helper
        };

        await db.collection('bookings').insertOne(newBooking);

        return NextResponse.json(newBooking);
    } catch (error) {
        console.error('Create Booking API Error:', error);
        return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { ids } = await request.json();

        if (!ids || !Array.isArray(ids)) {
            return NextResponse.json({ error: 'Invalid booking IDs' }, { status: 400 });
        }

        const db = await getDb();
        await db.collection('bookings').deleteMany({ id: { $in: ids } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Booking API Error:', error);
        return NextResponse.json({ error: 'Failed to delete bookings' }, { status: 500 });
    }
}

function estimatePrice(serviceType: string): number {
    const prices: Record<string, number> = {
        'Deep Cleaning': 1999,
        'Plumbing': 499,
        'Electrician': 399,
        'Painting': 5000,
        'Carpentry': 599,
        'Appliance Repair': 699,
        'Pest Control': 899,
        'AC Service': 799
    };
    return prices[serviceType] || 500;
}
