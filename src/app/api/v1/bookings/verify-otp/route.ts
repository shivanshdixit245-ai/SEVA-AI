import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getDb } from '@/lib/mongodb';
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'scripts', 'otp-debug.log');

function logDebug(message: string) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}\n`;
    console.log(`[OTP-API] ${message}`);
    try {
        if (!fs.existsSync(path.dirname(LOG_FILE))) fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
        fs.appendFileSync(LOG_FILE, line);
    } catch (err) {
        console.error('Failed to write to log file', err);
    }
}

export async function POST(request: Request) {
    try {
        const { bookingId, otp, workerId } = await request.json();
        logDebug(`Start verification for ${bookingId} by worker ${workerId}`);

        if (!bookingId || !otp) {
            logDebug(`FAIL: Missing bookingId or otp`);
            return NextResponse.json({ error: 'Booking ID and OTP are required' }, { status: 400 });
        }

        // 1. Fetch the booking to verify OTP
        const { data: booking, error: fetchError } = await supabaseAdmin
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();

        if (fetchError || !booking) {
            logDebug(`FAIL: Booking not found in Supabase: ${fetchError?.message || 'NOT_FOUND'}`);
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        logDebug(`Found booking ${bookingId}. Raw OTP from DB: ${booking.otp} (type: ${typeof booking.otp}). Entered: ${otp} (type: ${typeof otp})`);

        // 2. Check OTP - Use String conversion to avoid type mismatches
        if (String(booking.otp) !== String(otp)) {
            logDebug(`FAIL: OTP Mismatch. Expected ${booking.otp}, got ${otp}`);
            return NextResponse.json({ 
                error: 'Invalid OTP. Please ask the client for the correct code.',
                debug: { expected: booking.otp, received: otp }
            }, { status: 401 });
        }

        logDebug(`SUCCESS: OTP Match. Completing booking...`);

        // 3. Update status to 'Completed' (as requested: "show arrived and completed")
        const now = new Date().toISOString();
        const { error: updateError } = await supabaseAdmin
            .from('bookings')
            .update({ 
                status: 'Completed',
                completed_at: now,
                arrival_otp_verified: true
            })
            .eq('id', bookingId);

        if (updateError) {
            logDebug(`FAIL: Supabase update failed: ${updateError.message}`);
            throw updateError;
        }

        logDebug(`SUCCESS: Supabase updated. Job marked Completed.`);

        console.log(`✅ OTP Verified for booking ${bookingId}`);

        // 4. Sync to MongoDB (Background)
        getDb().then(async (db) => {
            try {
                // Try update by 'id' field
                const res = await db.collection('bookings').updateOne(
                    { id: bookingId },
                    { $set: { status: 'Completed', completedAt: now, arrival_otp_verified: true } }
                );
                console.log(`MongoDB sync result for ${bookingId}:`, res.modifiedCount);
            } catch (e) {
                console.error('Mongo sync failed for OTP verification:', e);
            }
        }).catch(() => {});

        return NextResponse.json({ 
            success: true, 
            message: 'OTP Verified! Job marked as completed.' 
        });

    } catch (error: any) {
        logDebug(`CRITICAL ERROR: ${error.message}`);
        console.error('CRITICAL OTP Verification Error:', error.message, error.stack);
        return NextResponse.json({ 
            error: 'Failed to verify OTP', 
            details: error.message 
        }, { status: 500 });
    }
}
