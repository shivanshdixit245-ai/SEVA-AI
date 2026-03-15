import { NextResponse, NextRequest } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { getServerUser, sanitizeText, resolveToUuid } from '@/lib/auth';
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

        // Resolve Slugs to UUIDs
        const userId = await resolveToUuid(rawUserId) || rawUserId;
        const helperId = await resolveToUuid(rawHelperId) || rawHelperId;

        // SECURITY: Verify session and involvement in the conversation
        const isAdmin = user?.role === 'admin';
        const isParticipant = user?.id && (user.id === userId || user.id === helperId);

        if (!user && process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!isAdmin && !isParticipant && process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Forbidden: You can only access your own conversations' }, { status: 403 });
        }

        // Cache Check
        const cacheKey = [userId, helperId].sort().join('-');
        const now = Date.now();
        if (messagesCache[cacheKey] && (now - messagesCache[cacheKey].timestamp < CACHE_TTL)) {
            return NextResponse.json(messagesCache[cacheKey].data);
        }

        const db = await getDb().catch(err => {
            console.error('GET Messages: MongoDB connection failed:', err.message);
            return null;
        });

        let cloudMessages: DirectMessage[] = [];
        if (db) {
            cloudMessages = await db.collection('messages')
                .find({
                    $or: [
                        { senderId: userId, receiverId: helperId },
                        { senderId: helperId, receiverId: userId }
                    ]
                })
                .sort({ timestamp: 1 })
                .toArray() as unknown as DirectMessage[];
        }
        
        // Sort by timestamp and remove duplicates
        const uniqueMessages = Array.from(new Map(cloudMessages.map(m => [m.id, m])).values());
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

        // 1. ATOMIC SAVE: Save to MongoDB for history (Sequential Await)
        let mongoSuccess = false;
        try {
            const db = await getDb();
            await db.collection('messages').insertOne(newMessage);
            mongoSuccess = true;
        } catch (err: any) {
            console.error('POST Message: MongoDB Save FAILED:', err.message);
        }

        if (!mongoSuccess) {
            return NextResponse.json({ error: 'Failed to persist message.' }, { status: 500 });
        }

        // 2. BROADCAST: Broadcast via Supabase for real-time
        try {
            const safeSenderId = String(senderId).toLowerCase().trim();
            const safeReceiverId = String(receiverId).toLowerCase().trim();
            const channelName = `dm-${[safeSenderId, safeReceiverId].sort().join('-')}`;
            
            console.log(`[API REALTIME] Broadcasting to ${channelName}`);
            
            const channel = supabaseAdmin.channel(channelName);
            await channel.send({
                type: 'broadcast',
                event: 'dm-receive',
                payload: newMessage,
            });
            
            // Broadcast to the global user channel for notifications
            const globalChannel = `user-${safeReceiverId}`;
            await supabaseAdmin
                .channel(globalChannel)
                .send({
                    type: 'broadcast',
                    event: 'global-message',
                    payload: newMessage,
                });
        } catch (bsErr: any) {
            console.error('[API BROADCAST ERROR]', bsErr);
        }

        return NextResponse.json(newMessage);
    } catch (error: any) {
        console.error('Message API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
