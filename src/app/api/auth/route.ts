import { NextResponse } from 'next/server';
import { registerUser, loginUser, UserRole } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const { action, name, email, password, role } = await request.json();

        if (!email || !password || !role) {
            return NextResponse.json({ error: 'Email, password, and role are required.' }, { status: 400 });
        }

        const validRoles: UserRole[] = ['client', 'worker', 'admin'];
        if (!validRoles.includes(role)) {
            return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
        }

        if (action === 'signup') {
            if (!name) {
                return NextResponse.json({ error: 'Name is required for sign up.' }, { status: 400 });
            }
            const result = await registerUser(name, email, password, role);
            if (!result.success) {
                return NextResponse.json({ error: result.error }, { status: 400 });
            }
            return NextResponse.json({ user: result.user });
        }

        if (action === 'login') {
            const result = await loginUser(email, password, role);
            if (!result.success) {
                return NextResponse.json({ error: result.error }, { status: 401 });
            }
            return NextResponse.json({ user: result.user });
        }

        return NextResponse.json({ error: 'Invalid action. Use "login" or "signup".' }, { status: 400 });

    } catch (error) {
        console.error('Auth API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
