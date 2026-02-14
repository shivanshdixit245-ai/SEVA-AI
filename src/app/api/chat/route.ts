import { NextResponse } from 'next/server';
import { detectServiceIntent } from '@/lib/ai';

export async function POST(request: Request) {
    try {
        const { message } = await request.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const { booking: bookingData, clarification } = await detectServiceIntent(message);

        // If AI needs clarification, return the question
        if (clarification) {
            return NextResponse.json({
                reply: clarification,
                bookingData: null
            });
        }

        // Generate a natural language response based on the detected intent
        let reply = "I'm not sure how to help with that. Could you describe the problem in more detail?";

        if (bookingData) {
            const confidenceNote = bookingData.confidence && bookingData.confidence < 80
                ? `\n\n_(Confidence: ${bookingData.confidence}% — If this isn't right, please describe your issue differently.)_`
                : '';

            if (bookingData.urgency === 'Urgent') {
                reply = `🚨 I've noted this is **URGENT**! Please confirm the **${bookingData.serviceType}** booking below so I can assign a priority helper immediately.${confidenceNote}`;
            } else {
                reply = `I've prepared a **${bookingData.serviceType}** booking for you. Please review the details below and confirm to proceed.${confidenceNote}`;
            }
        }

        return NextResponse.json({
            reply,
            bookingData
        });

    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
