import { NextResponse, NextRequest } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { getServerUser, sanitizeText, resolveToUuid, resolveFullIdentity } from '@/lib/auth';
import { DirectMessage } from '@/types/booking';

// Memory Cache for ultra-fast "instant" chat history
let messagesCache: Record<string, { data: DirectMessage[], timestamp: number }> = {};
const CACHE_TTL = 30 * 1000; // 30 seconds

export async function GET(request: NextRequest) {
    try {
        const user = await getServerUser(request);
        const { searchParams } = new URL(request.url);
        const rawUserId = searchParams.get('userId');
        const rawHelperId = searchParams.get('helperId');

        if (!rawUserId || !rawHelperId) {
            return NextResponse.json({ error: 'Missing userId or helperId' }, { status: 400 });
        }

        // UNIVERSAL IDENTITY RESOLUTION: Find all possible aliases
        const userPool = await resolveFullIdentity(rawUserId);
        const helperPool = await resolveFullIdentity(rawHelperId);

        // Aliases for Supabase checks
        const uAs = [userPool.uuid, userPool.slug].filter(Boolean) as string[];
        const hAs = [helperPool.uuid, helperPool.slug].filter(Boolean) as string[];

        // SECURITY: Verify session and involvement
        const isAdmin = user?.role === 'admin';
        const isParticipant = user?.id && (
            (userPool.uuid === user.id) || 
            (helperPool.uuid === user.id)
        );

        if (!user && process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!isAdmin && !isParticipant && process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Cache Check
        const cacheKey = [userPool.uuid || rawUserId, helperPool.uuid || rawHelperId].sort().join('-');
        const now = Date.now();
        if (messagesCache[cacheKey] && (now - messagesCache[cacheKey].timestamp < CACHE_TTL)) {
            return NextResponse.json(messagesCache[cacheKey].data);
        }

        // 1. Fetch from Supabase (Super-Search)
        let supabaseMessages: DirectMessage[] = [];
        try {
            // Build complex OR for all possible alias permutations
            const { data, error: sErr } = await supabaseAdmin
                .from('messages')
                .select('*')
                .or(`and(sender_id.in.(${uAs.join(',')}),receiver_id.in.(${hAs.join(',')})),and(sender_id.in.(${hAs.join(',')}),receiver_id.in.(${uAs.join(',')}))`)
                .order('created_at', { ascending: true });
            
            if (data && !sErr) {
                supabaseMessages = data.map((m: any) => ({
                    id: m.id,
                    senderId: m.sender_id,
                    receiverId: m.receiver_id,
                    content: m.content,
                    timestamp: new Date(m.created_at).getTime(),
                    bookingId: m.booking_id,
                    isRead: m.is_read
                }));
            }
        } catch (err) {
            console.error('GET Messages: Supabase Super-Search FAILED:', err);
        }

        // 2. Fetch from MongoDB (Reconciled)
        let mongoMessages: DirectMessage[] = [];
        try {
            const db = await getDb();
            if (db) {
                const orConditions: any[] = [];
                // Permutation A (User -> Helper)
                orConditions.push({
                    $and: [
                        { $or: [{ senderId: userPool.uuid }, { senderId: userPool.slug }, { senderId: userPool.email }] },
                        { $or: [{ receiverId: helperPool.uuid }, { receiverId: helperPool.slug }, { receiverId: helperPool.email }] }
                    ]
                });
                // Permutation B (Helper -> User)
                orConditions.push({
                    $and: [
                        { $or: [{ senderId: helperPool.uuid }, { senderId: helperPool.slug }, { senderId: helperPool.email }] },
                        { $or: [{ receiverId: userPool.uuid }, { receiverId: userPool.slug }, { receiverId: userPool.email }] }
                    ]
                });

                mongoMessages = await db.collection('messages')
                    .find({ $or: orConditions })
                    .sort({ timestamp: 1 })
                    .toArray() as unknown as DirectMessage[];
            }
        } catch (dbErr: any) {
            console.error(`GET Messages: MongoDB Error: ${dbErr.message}`);
        }
        
        // 3. Union and Sort (Deduplicate)
        const allMessages = [...mongoMessages, ...supabaseMessages];
        const uniqueMessages = Array.from(new Map(allMessages.map(m => [m.id, m])).values());
        const sortedMessages = uniqueMessages.sort((a, b) => a.timestamp - b.timestamp);

        // Update Cache
        messagesCache[cacheKey] = { data: sortedMessages, timestamp: now };

        return NextResponse.json(sortedMessages);
    } catch (error: any) {
        console.error('GET Messages API Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getServerUser(request);
        const messageData = await request.json();
        const { senderId: rawSenderId, receiverId: rawReceiverId, content, bookingId } = messageData;

        // Resolve Slugs to UUIDs
        const senderId = await resolveToUuid(rawSenderId) || rawSenderId;
        const receiverId = await resolveToUuid(rawReceiverId) || rawReceiverId;

        // SECURITY: Verify session and that the sender is the authenticated user
        if (!user && process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (user && user.id !== senderId && user.role !== 'admin' && process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Forbidden: Cannot send messages as another user' }, { status: 403 });
        }

        if (!senderId || !receiverId || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const safeContent = sanitizeText(content);

        // Invalidate Cache for this conversation
        const cacheKey = [senderId, receiverId].sort().join('-');
        delete messagesCache[cacheKey];

        const newMessage: DirectMessage = {
            id: crypto.randomUUID(),
            senderId,
            receiverId,
            content: safeContent,
            bookingId,
            timestamp: Date.now(),
            isRead: false
        };

        // 1. PERSISTENCE: Save to Supabase (Primary) and MongoDB (Backup)
        let mongoSuccess = false;
        try {
            const db = await getDb();
            await db.collection('messages').insertOne(newMessage);
            mongoSuccess = true;
        } catch (err: any) {
            console.error('POST Message: MongoDB Save FAILED:', err.message);
        }

        // Supabase Save (This triggers Postgres Realtime)
        try {
            const { error: supabaseError } = await supabaseAdmin
                .from('messages')
                .insert({
                    id: newMessage.id,
                    sender_id: newMessage.senderId,
                    receiver_id: newMessage.receiverId,
                    content: newMessage.content,
                    booking_id: newMessage.bookingId,
                    is_read: false,
                    created_at: new Date(newMessage.timestamp).toISOString()
                });

            if (supabaseError) {
                console.error('POST Message: Supabase Save FAILED:', supabaseError.message);
                if (!mongoSuccess) {
                    return NextResponse.json({ error: 'Failed to persist message to any database.' }, { status: 500 });
                }
            }
        } catch (err: any) {
            console.error('POST Message: Supabase Save Exception:', err.message);
        }

        return NextResponse.json(newMessage);
    } catch (error: any) {
        console.error('Message API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
