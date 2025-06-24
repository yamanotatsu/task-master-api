import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory and load .env files from api directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// 優先順位: .env.local → .env → 環境変数
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (!supabaseUrl) {
	console.warn('⚠️  Warning: SUPABASE_URL not configured');
	console.warn('データベース機能は利用できません');

	// Create a mock client for basic functionality
	supabase = {
		from: () => ({
			select: () => ({ data: [], error: new Error('Supabase not configured') }),
			insert: () => ({
				data: null,
				error: new Error('Supabase not configured')
			}),
			update: () => ({
				data: null,
				error: new Error('Supabase not configured')
			}),
			delete: () => ({
				data: null,
				error: new Error('Supabase not configured')
			})
		}),
		auth: {
			getUser: () => ({
				data: { user: null },
				error: new Error('Supabase not configured')
			})
		}
	};
} else {
	// Use service key if available, otherwise use anon key
	const authKey = supabaseServiceKey || supabaseAnonKey;

	if (!authKey) {
		console.warn('⚠️  Warning: No Supabase authentication key found');
		console.warn('SUPABASE_SERVICE_KEY または SUPABASE_ANON_KEY が必要です');
	}

	// Create Supabase client with available key
	supabase = createClient(supabaseUrl, authKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}

export { supabase };
