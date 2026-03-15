import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getDb } from '@/lib/mongodb';
import { sanitizeText } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
    try {
        const { bookingId, workerId, rating, comment } = await req.json();

        if (!bookingId || !workerId || !rating) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Save to Supabase (Primary Review Store)
        const safeComment = sanitizeText(comment);

        const { data: reviewData, error: supabaseError } = await supabase
            .from('reviews')
            .insert([{
                booking_id: bookingId,
                worker_id: workerId,
                rating,
                comment: safeComment,
                created_at: new Date().toISOString()
            }])
            .select();

        if (supabaseError) {
            console.error('Supabase review error:', supabaseError);
            // If table doesn't exist, we'll try to fallback or log
            if (supabaseError.code === '42P01') {
                return NextResponse.json({ error: 'Review system table is being initialized.' }, { status: 503 });
            }
        }

        // 2. Background Sync to MongoDB (Asynchronous)
        (async () => {
            try {
                const db = await getDb();
                
                // Update specific booking with review reference
                await db.collection('bookings').updateOne(
                    { _id: new ObjectId(bookingId) },
                    { $set: { review: { rating, comment: safeComment, submittedAt: new Date() } } }
                );

                // Update helper's average rating
                const helperObjectId = ObjectId.isValid(workerId) ? new ObjectId(workerId) : null;
                if (helperObjectId) {
                    // Fetch all ratings for this worker from Supabase
                    const { data: allRatings } = await supabase
                        .from('reviews')
                        .select('rating')
                        .eq('worker_id', workerId);

                    if (allRatings && allRatings.length > 0) {
                        const avgRating = allRatings.reduce((acc, curr) => acc + curr.rating, 0) / allRatings.length;
                        await db.collection('helpers').updateOne(
                            { _id: helperObjectId },
                            { 
                                $set: { rating: parseFloat(avgRating.toFixed(1)) },
                                $inc: { reviewCount: 1 }
                            }
                        );
                    }
                }
            } catch (mongoError) {
                console.error('MongoDB review sync failed:', mongoError);
            }
        })();

        return NextResponse.json({ success: true, data: reviewData });

    } catch (error: any) {
        console.error('Review submission error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
