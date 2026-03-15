import { NextResponse } from 'next/server';
import { registerUser, loginUser, UserRole } from '@/lib/auth';

export async function POST(request: Request) {
    console.log('--- Auth API Request Received ---');
    try {
        const body = await request.json();
        const { action, name, email, password, role } = body;
        console.log('Action:', action, 'Email:', email, 'Role:', role);

        if (!email || !password || !role) {
            console.warn('Missing required fields');
            return NextResponse.json({ error: 'Email, password, and role are required.' }, { status: 400 });
        }

        const validRoles: UserRole[] = ['client', 'worker', 'admin'];
        if (!validRoles.includes(role)) {
            console.warn('Invalid role:', role);
            return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
        }

        if (action === 'signup') {
            console.log('Starting signup process...');
            if (!name) {
                return NextResponse.json({ error: 'Name is required for sign up.' }, { status: 400 });
            }
            const result = await registerUser(name, email, password, role);
            console.log('Signup result success:', result.success);
            if (!result.success) {
                console.error('Signup failed result:', result.error);
                return NextResponse.json({ error: result.error }, { status: 400 });
            }
            return NextResponse.json({ 
                user: result.user,
                token: result.token
            });
        }

        if (action === 'login') {
            console.log('Starting login process...');
            const result = await loginUser(email, password, role);
            console.log('Login result success:', result.success);
            if (!result.success) {
                console.error('Login failed result:', result.error);
                return NextResponse.json({ error: result.error }, { status: 401 });
            }
            return NextResponse.json({ 
                user: result.user,
                token: result.token 
            });
        }

        console.warn('Invalid action:', action);
        return NextResponse.json({ error: 'Invalid action. Use "login" or "signup".' }, { status: 400 });

    } catch (error) {
        console.error('Auth API CRITICAL Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
