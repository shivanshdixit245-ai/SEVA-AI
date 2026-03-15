import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getDb } from '@/lib/mongodb';
import { getServerUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
    console.log('--- Worker Profile Update Started ---');
    try {
        const user = await getServerUser(request);
        const body = await request.json();
        console.log('Received Body:', { ...body, email: '***', docNumber: '***' }); // Hide sensitive info in logs
        const { userId, name, email, age, gender, profession, otherProfession, experience, phone, bio, address, docType, docNumber } = body;
        
        // SECURITY: Verify session and ownership
        if (!user || (user.id !== userId && user.role !== 'admin')) {
            return NextResponse.json({ error: 'Unauthorized: Profile ownership mismatch' }, { status: 401 });
        }
        
        const userEmail = (email || '').toLowerCase();
        if (!userEmail) {
            console.error('[PROFILE UPDATE] Email missing from request body');
            return NextResponse.json({ error: 'Email is required to identify your profile.' }, { status: 400 });
        }

        const finalProfession = profession === 'Other' ? otherProfession : profession;
        const parsedAge = parseInt(age) || 0;
        const parsedExp = parseInt(experience) || 0;
        const safeName = name || 'Worker';

        // 1. FAST PATH: Update Supabase workers table immediately
        console.log(`[PROFILE UPDATE] Supabase-First: Updating record for ${userEmail}`);
        const { error: supabaseError } = await supabaseAdmin
            .from('workers')
            .upsert({
                id: userId, // Use provided userId if available
                name: safeName,
                email: userEmail,
                role: 'worker',
                profession: finalProfession,
                experience: parsedExp,
                phone,
                bio,
                address,
                doc_type: docType,
                doc_number: docNumber,
                verification_status: 'pending',
                updated_at: new Date().toISOString()
            });

        if (supabaseError) {
            console.error('Supabase fast-path failed:', supabaseError);
            // If supabase fails, we might still want to try background sync or return error
            // But for "fast save", if supabase is up, we are good.
        }

        // 2. BACKGROUND SYNC: Move MongoDB and other tasks to un-awaited block
        (async () => {
            try {
                console.log(`[PROFILE SYNC] Starting background Mongo sync for ${userEmail}...`);
                const db = await getDb();
                
                // Find by email to get the primary Mongo ID if userId wasn't perfect
                const mongoUser = await db.collection('users').findOne({ email: userEmail });
                if (!mongoUser) {
                    console.warn(`[PROFILE SYNC] User ${userEmail} not found in MongoDB during background sync`);
                    return;
                }

                const sbId = userId || mongoUser.supabaseId || mongoUser.id;

                // Update 'users' collection
                await db.collection('users').updateOne(
                    { _id: mongoUser._id },
                    { 
                        $set: { 
                            id: sbId,
                            supabaseId: sbId,
                            name: safeName,
                            age: parsedAge,
                            gender,
                            profession: finalProfession,
                            experience: parsedExp,
                            phone,
                            bio,
                            address,
                            docType,
                            docNumber,
                            verificationStatus: 'pending',
                            updatedAt: new Date().toISOString()
                        } 
                    }
                );

                // Sync to 'helpers' collection
                await db.collection('helpers').updateOne(
                    { id: sbId },
                    {
                        $set: {
                            id: sbId,
                            supabaseId: sbId,
                            name: safeName,
                            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(safeName)}&background=random`,
                            skills: [finalProfession],
                            rating: 0, // Clean slate - no mock rating
                            completedJobs: 0,
                            isAvailable: true,
                            experience: parsedExp,
                            phone,
                            description: bio,
                            updatedAt: new Date().toISOString()
                        }
                    },
                    { upsert: true }
                );
                console.log(`[PROFILE SYNC] Background MongoDB sync successful for ${userEmail}`);
            } catch (syncErr: any) {
                console.error(`[PROFILE SYNC] CRITICAL Background Sync Failure: ${syncErr.message}`);
                // Optional: write to a dead-letter queue or retry logic
            }
        })();

        // RETURN IMMEDIATELY (Do not wait for background sync)
        return NextResponse.json({ 
            success: true, 
            message: 'Profile update initiated successfully.' 
        });

    } catch (error: any) {
        console.error('CRITICAL Profile update error:', error);
        return NextResponse.json({ 
            error: 'Failed to update profile in primary database.',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
