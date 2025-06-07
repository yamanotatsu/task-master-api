import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory and load .env from api directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || (!supabaseAnonKey && !supabaseServiceKey)) {
  throw new Error('Missing Supabase authentication environment variables. Please set SUPABASE_URL and either SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY');
}

// Use anon key if available, otherwise fallback to service key for development
const authKey = supabaseAnonKey || supabaseServiceKey;

/**
 * Supabase client for authentication operations
 * Uses the anon key for client-side compatible operations
 */
export const supabaseAuth = createClient(supabaseUrl, authKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  }
});

/**
 * Helper function to verify a JWT token
 * @param {string} token - The JWT token to verify
 * @returns {Promise<{user: Object|null, error: Error|null}>}
 */
export const verifyToken = async (token) => {
  try {
    const { data, error } = await supabaseAuth.auth.getUser(token);
    return { user: data?.user || null, error };
  } catch (error) {
    return { user: null, error };
  }
};

/**
 * Helper function to create a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<{user: Object|null, session: Object|null, error: Error|null}>}
 */
export const createUser = async ({ email, password, fullName }) => {
  try {
    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });
    
    return { user: data?.user || null, session: data?.session || null, error };
  } catch (error) {
    return { user: null, session: null, error };
  }
};

/**
 * Helper function to sign in a user
 * @param {Object} credentials - User login credentials
 * @returns {Promise<{user: Object|null, session: Object|null, error: Error|null}>}
 */
export const signInUser = async ({ email, password }) => {
  try {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password
    });
    
    return { user: data?.user || null, session: data?.session || null, error };
  } catch (error) {
    return { user: null, session: null, error };
  }
};

/**
 * Helper function to sign out a user
 * @returns {Promise<{error: Error|null}>}
 */
export const signOutUser = async () => {
  try {
    const { error } = await supabaseAuth.auth.signOut();
    return { error };
  } catch (error) {
    return { error };
  }
};

/**
 * Helper function to refresh a session
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<{session: Object|null, error: Error|null}>}
 */
export const refreshSession = async (refreshToken) => {
  try {
    const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token: refreshToken });
    return { session: data?.session || null, error };
  } catch (error) {
    return { session: null, error };
  }
};

/**
 * Helper function to request a password reset
 * @param {string} email - The user's email
 * @returns {Promise<{error: Error|null}>}
 */
export const resetPasswordRequest = async (email) => {
  try {
    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`
    });
    return { error };
  } catch (error) {
    return { error };
  }
};

/**
 * Helper function to update a user's password
 * @param {string} newPassword - The new password
 * @returns {Promise<{user: Object|null, error: Error|null}>}
 */
export const updatePassword = async (newPassword) => {
  try {
    const { data, error } = await supabaseAuth.auth.updateUser({
      password: newPassword
    });
    return { user: data?.user || null, error };
  } catch (error) {
    return { user: null, error };
  }
};

/**
 * Helper function to verify an email with OTP
 * @param {Object} params - OTP verification parameters
 * @returns {Promise<{user: Object|null, session: Object|null, error: Error|null}>}
 */
export const verifyOtp = async ({ email, token, type = 'email' }) => {
  try {
    const { data, error } = await supabaseAuth.auth.verifyOtp({
      email,
      token,
      type
    });
    return { user: data?.user || null, session: data?.session || null, error };
  } catch (error) {
    return { user: null, session: null, error };
  }
};

/**
 * Helper function to get user by email (requires service role key)
 * This should only be used server-side with proper authentication
 * @param {string} email - The user's email
 * @returns {Promise<{user: Object|null, error: Error|null}>}
 */
export const getUserByEmail = async (email) => {
  try {
    // This requires admin/service role key
    // For now, we'll use a different approach
    const { data, error } = await supabaseAuth
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    return { user: data || null, error };
  } catch (error) {
    return { user: null, error };
  }
};

/**
 * Helper function to validate password strength
 * @param {string} password - The password to validate
 * @param {Object} userInfo - User information to check against
 * @returns {Array<string>} Array of validation errors
 */
export const validatePassword = (password, userInfo = {}) => {
  const errors = [];
  
  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Lowercase check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Number check
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Common passwords check
  const commonPasswords = [
    'password', '12345678', 'qwerty', 'abc12345',
    'password123', 'admin', 'letmein', '123456789'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('This password is too common and not secure');
  }
  
  // Check if password contains user info
  const userFields = [
    userInfo.email?.split('@')[0],
    userInfo.fullName?.toLowerCase().replace(/\s+/g, ''),
  ].filter(Boolean);
  
  for (const field of userFields) {
    if (field && password.toLowerCase().includes(field)) {
      errors.push('Password should not contain personal information');
    }
  }
  
  return errors;
};

/**
 * Helper function to validate email format
 * @param {string} email - The email to validate
 * @returns {boolean} Whether the email is valid
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Helper function to sanitize user input
 * @param {string} input - The input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove any HTML tags
  return input
    .replace(/<[^>]*>/g, '')
    .trim();
};