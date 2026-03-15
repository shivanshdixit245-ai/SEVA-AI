import { NextRequest } from 'next/server';
import { supabase, supabaseAdmin } from './supabase';
import { getDb } from './mongodb';

export type UserRole = 'client' | 'worker' | 'admin';

export interface UserProfile {
    supabaseId: string;
    name: string;
    email: string;
    role: UserRole;
    createdAt: string;
    hasProfile?: boolean;
}

export interface SafeUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    createdAt: string;
    hasProfile?: boolean;
}

// Admin credentials (securely stored in environment variables)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

/**
 * SECURITY: Aggressive Input Sanitization
 * Escapes HTML tags and potential script content to prevent XSS.
 */
export function sanitizeText(text: string): string {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * SECURITY: Server-Side Session Validation
 * Verifies the Supabase JWT from the request headers to prevent IDOR attacks.
 */
export async function getServerUser(request: NextRequest): Promise<SafeUser | null> {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];

        if (!token) return null;

        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            console.error('getServerUser: Token verification failed', error?.message);
            return null;
        }

        // Fetch additional role/profile info
        const profile = await getProfile(user.id);
        
        return {
            id: user.id,
            email: user.email || '',
            name: profile?.name || user.user_metadata?.name || 'User',
            role: (profile?.role as UserRole) || (user.user_metadata?.role as UserRole) || 'client',
            createdAt: user.created_at || new Date().toISOString()
        };
    } catch (err) {
        console.error('getServerUser Error:', err);
        return null;
    }
}

// ─── MongoDB Profile Operations ────────────────────────────────────────────

async function saveProfile(profile: UserProfile): Promise<void> {
    // 1. Save to MongoDB
    try {
        const db = await getDb();
        await db.collection('users').updateOne(
            { supabaseId: profile.supabaseId },
            { $set: profile },
            { upsert: true }
        );
        console.log('MongoDB: Profile saved successfully');
    } catch (err) {
        console.error('MongoDB: Failed to save profile', err);
        // We don't throw here to allow Supabase to still try
    }

    // 2. Save to Supabase (Postgres)
    try {
        // Save to master profiles table
        const { error: profileErr } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: profile.supabaseId,
                name: profile.name,
                email: profile.email,
                role: profile.role,
                created_at: profile.createdAt
            });

        if (profileErr) console.error('Supabase Profiles: Failed to save', profileErr);

        // Save to role-specific table (Clients or Workers)
        const roleTable = profile.role === 'worker' ? 'workers' : 'clients';
        const { error: roleErr } = await supabaseAdmin
            .from(roleTable)
            .upsert({
                id: profile.supabaseId,
                name: profile.name,
                email: profile.email,
                created_at: profile.createdAt
            });

        if (roleErr) {
            console.error(`Supabase ${roleTable}: Failed to save`, roleErr);
        } else {
            console.log(`Supabase: Profile saved to ${roleTable} successfully`);
        }
    } catch (err) {
        console.error('Supabase: Unexpected error saving profile', err);
    }
}

async function getProfile(supabaseId: string): Promise<UserProfile | null> {
    // Primary source: MongoDB
    try {
        const db = await getDb();
        const profile = await db.collection('users').findOne({ supabaseId });
        if (profile) return profile as unknown as UserProfile;
    } catch (err) {
        console.warn('MongoDB getProfile failed, attempting Supabase fallback', err);
    }

    // Fallback: Supabase Table
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseId)
        .single();

    if (data && !error) {
        return {
            supabaseId: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            createdAt: data.created_at
        };
    }

    return null;
}

async function getProfileByEmail(email: string): Promise<UserProfile | null> {
    // Primary: MongoDB
    try {
        const db = await getDb();
        const profile = await db.collection('users').findOne({ email: email.toLowerCase() });
        if (profile) return profile as unknown as UserProfile;
    } catch (err) {
        console.warn('MongoDB getProfileByEmail failed, attempting Supabase fallback', err);
    }

    // Fallback: Supabase Table
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

    if (data && !error) {
        return {
            supabaseId: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            createdAt: data.created_at
        };
    }
    return null;
}

/**
 * Robustly resolves a slug, email, or temporary ID to a Supabase UUID.
 * Essential for Realtime sync where both parties must agree on the channel name.
 */
export async function resolveToUuid(idOrSlug: string): Promise<string | null> {
    if (!idOrSlug) return null;
    
    // Check if it's already a UUID (v4/v5 format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(idOrSlug)) return idOrSlug;

    try {
        const db = await getDb();
        const user = await db.collection('users').findOne({
            $or: [
                { slug: idOrSlug },
                { email: idOrSlug.toLowerCase() },
                { id: idOrSlug },
                { supabaseId: idOrSlug }
            ]
        });
        return user?.supabaseId || user?.id || null;
    } catch (err) {
        console.error('resolveToUuid Error:', err);
        return null;
    }
}

// ─── Auth Operations ───────────────────────────────────────────────────────

export async function registerUser(
    name: string,
    email: string,
    password: string,
    role: UserRole
): Promise<{ success: boolean; user?: SafeUser; token?: string; error?: string }> {
    if (role === 'admin') {
        return { success: false, error: 'Admin accounts cannot be registered.' };
    }

    try {
        // Check if profile already exists in MongoDB
        const existing = await getProfileByEmail(email);
        if (existing) {
            return { success: false, error: 'An account with this email already exists.' };
        }

        // Create Supabase auth user using Admin client to bypass email confirmation and rate limits
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name, role }
        });

        if (error) {
            console.error('Supabase Admin createUser Error:', error);
            // If it's still a rate limit, we should inform user
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

        // Auto-login to get token
        const { data: signInData } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        const token = signInData?.session?.access_token;

        return {
            success: true,
            token,
            user: {
                id: data.user.id,
                name,
                email: email.toLowerCase(),
                role,
                createdAt: profile.createdAt,
                hasProfile: false // New user doesn't have a profile yet
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
): Promise<{ success: boolean; user?: SafeUser; token?: string; error?: string }> {
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
                },
                token: 'admin-token' // Dummy token for admin session persistence
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
            token: data.session?.access_token,
            user: {
                id: data.user.id,
                name: profile.name,
                email: profile.email,
                role: profile.role,
                createdAt: profile.createdAt,
                hasProfile: profile.role === 'worker' ? (await supabaseAdmin.from('workers').select('id').eq('id', data.user.id).single()).data !== null : false
            }
        };
    } catch (err: any) {
        console.error('Login error:', err);
        return { success: false, error: err.message || 'Login failed.' };
    }
}
