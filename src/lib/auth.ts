import { supabase } from './supabase';
import { getDb } from './mongodb';

export type UserRole = 'client' | 'worker' | 'admin';

export interface UserProfile {
    supabaseId: string;
    name: string;
    email: string;
    role: UserRole;
    createdAt: string;
}

export interface SafeUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    createdAt: string;
}

// Admin credentials (hardcoded, no Supabase account needed)
const ADMIN_EMAIL = 'admin@123';
const ADMIN_PASSWORD = 'admin@123';

// ─── MongoDB Profile Operations ────────────────────────────────────────────

async function saveProfile(profile: UserProfile): Promise<void> {
    const db = await getDb();
    await db.collection('users').updateOne(
        { supabaseId: profile.supabaseId },
        { $set: profile },
        { upsert: true }
    );
}

async function getProfile(supabaseId: string): Promise<UserProfile | null> {
    const db = await getDb();
    const profile = await db.collection('users').findOne({ supabaseId });
    return profile as UserProfile | null;
}

async function getProfileByEmail(email: string): Promise<UserProfile | null> {
    const db = await getDb();
    const profile = await db.collection('users').findOne({ email: email.toLowerCase() });
    return profile as UserProfile | null;
}

// ─── Auth Operations ───────────────────────────────────────────────────────

export async function registerUser(
    name: string,
    email: string,
    password: string,
    role: UserRole
): Promise<{ success: boolean; user?: SafeUser; error?: string }> {
    if (role === 'admin') {
        return { success: false, error: 'Admin accounts cannot be registered.' };
    }

    try {
        // Check if profile already exists in MongoDB
        const existing = await getProfileByEmail(email);
        if (existing) {
            return { success: false, error: 'An account with this email already exists.' };
        }

        // Create Supabase auth user
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name, role }
            }
        });

        if (error) {
            return { success: false, error: error.message };
        }

        if (!data.user) {
            return { success: false, error: 'Failed to create account.' };
        }

        // Save profile to MongoDB
        const profile: UserProfile = {
            supabaseId: data.user.id,
            name,
            email: email.toLowerCase(),
            role,
            createdAt: new Date().toISOString()
        };

        await saveProfile(profile);

        return {
            success: true,
            user: {
                id: data.user.id,
                name,
                email: email.toLowerCase(),
                role,
                createdAt: profile.createdAt
            }
        };
    } catch (err: any) {
        console.error('Registration error:', err);
        return { success: false, error: err.message || 'Registration failed.' };
    }
}

export async function loginUser(
    email: string,
    password: string,
    role: UserRole
): Promise<{ success: boolean; user?: SafeUser; error?: string }> {
    // Admin check (hardcoded, no Supabase)
    if (role === 'admin') {
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            return {
                success: true,
                user: {
                    id: 'admin-001',
                    name: 'Administrator',
                    email: ADMIN_EMAIL,
                    role: 'admin',
                    createdAt: '2026-01-01T00:00:00Z'
                }
            };
        }
        return { success: false, error: 'Invalid admin credentials.' };
    }

    try {
        // Authenticate with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return { success: false, error: error.message };
        }

        if (!data.user) {
            return { success: false, error: 'Login failed.' };
        }

        // Fetch profile from MongoDB
        let profile = await getProfile(data.user.id);

        // If no MongoDB profile exists yet (e.g., created before migration), create one
        if (!profile) {
            profile = {
                supabaseId: data.user.id,
                name: data.user.user_metadata?.name || email.split('@')[0],
                email: email.toLowerCase(),
                role,
                createdAt: data.user.created_at || new Date().toISOString()
            };
            await saveProfile(profile);
        }

        // Verify role matches
        if (profile.role !== role) {
            return { success: false, error: `No ${role} account found with this email. You are registered as a ${profile.role}.` };
        }

        return {
            success: true,
            user: {
                id: data.user.id,
                name: profile.name,
                email: profile.email,
                role: profile.role,
                createdAt: profile.createdAt
            }
        };
    } catch (err: any) {
        console.error('Login error:', err);
        return { success: false, error: err.message || 'Login failed.' };
    }
}
