import { createClient } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Supabase URL and Anon Key should be set in environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error('Missing Supabase environment variables');
}

// Create a supabase client configured for client-side use with cookies
export const supabase = createClientComponentClient({
	supabaseUrl,
	supabaseKey: supabaseAnonKey
});

// Types for authentication
export interface AuthUser {
	id: string;
	email?: string;
	user_metadata?: {
		full_name?: string;
		avatar_url?: string;
	};
}

export interface Profile {
	id: string;
	full_name?: string;
	avatar_url?: string;
	created_at?: string;
	updated_at?: string;
}

export interface Organization {
	id: string;
	name: string;
	description?: string;
	created_at?: string;
	updated_at?: string;
	role?: 'admin' | 'member'; // User's role in this organization
}

export interface OrganizationMember {
	organization_id: string;
	profile_id: string;
	role: 'admin' | 'member';
	joined_at?: string;
}

export interface AuthSession {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	expires_at?: number;
	token_type: string;
	user: AuthUser;
}
