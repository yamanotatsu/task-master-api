'use client';

import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback
} from 'react';
import { useRouter } from 'next/navigation';
import {
	supabase,
	AuthUser,
	Profile,
	Organization,
	OrganizationMember
} from './supabase';
import { User, Session } from '@supabase/supabase-js';
import Cookies from 'js-cookie';

interface AuthContextType {
	user: User | null;
	session: Session | null;
	profile: Profile | null;
	organizations: Organization[];
	currentOrganization: Organization | null;
	loading: boolean;
	error: string | null;
	login: (
		email: string,
		password: string,
		redirectTo?: string
	) => Promise<void>;
	signup: (email: string, password: string, fullName: string) => Promise<void>;
	logout: () => Promise<void>;
	resetPassword: (email: string) => Promise<void>;
	updatePassword: (newPassword: string) => Promise<void>;
	changePassword: (
		currentPassword: string,
		newPassword: string
	) => Promise<void>;
	deleteAccount: (password: string) => Promise<void>;
	updateProfile: (updates: Partial<Profile>) => Promise<void>;
	setCurrentOrganization: (org: Organization | null) => void;
	refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [organizations, setOrganizations] = useState<Organization[]>([]);
	const [currentOrganization, setCurrentOrganization] =
		useState<Organization | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	// Load user profile
	const loadProfile = useCallback(async (userId: string) => {
		try {
			const { data, error } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', userId)
				.single();

			if (error) throw error;
			setProfile(data);
		} catch (err) {
			console.error('Error loading profile:', err);
			setError(err instanceof Error ? err.message : 'Failed to load profile');
		}
	}, []);

	// Load user organizations
	const loadOrganizations = useCallback(async (userId: string) => {
		try {
			// ユーザーのプロファイルから現在の組織IDを取得
			const { data: profileData } = await supabase
				.from('profiles')
				.select('current_organization_id')
				.eq('id', userId)
				.single();

			// organization_membersから所属組織を取得
			const { data, error } = await supabase
				.from('organization_members')
				.select(
					`
          organization_id,
          role,
          organizations (
            id,
            name,
            description,
            created_at,
            updated_at
          )
        `
				)
				.eq('user_id', userId);

			if (error) throw error;

			const orgs =
				data?.map((item: any) => ({
					...item.organizations,
					role: item.role
				})) || [];

			setOrganizations(orgs);

			// current_organization_idが設定されている場合はそれを優先
			if (profileData?.current_organization_id) {
				const currentOrg = orgs.find(
					(org: any) => org.id === profileData.current_organization_id
				);
				if (currentOrg) {
					setCurrentOrganization(currentOrg);
					Cookies.set('current_organization', currentOrg.id);
				} else {
					// 現在の組織IDが無効な場合はクリア
					setCurrentOrganization(null);
					Cookies.remove('current_organization');
				}
			} else {
				// current_organization_idが未設定の場合
				setCurrentOrganization(null);
				Cookies.remove('current_organization');
			}
		} catch (err) {
			console.error('Error loading organizations:', err);
			setError(
				err instanceof Error ? err.message : 'Failed to load organizations'
			);
		}
	}, []);

	// Initialize auth state
	useEffect(() => {
		const initAuth = async () => {
			try {
				const {
					data: { session }
				} = await supabase.auth.getSession();

				if (session?.user) {
					setUser(session.user);
					setSession(session);
					await loadProfile(session.user.id);
					await loadOrganizations(session.user.id);
				}
			} catch (err) {
				console.error('Error initializing auth:', err);
				setError(
					err instanceof Error
						? err.message
						: 'Failed to initialize authentication'
				);
			} finally {
				setLoading(false);
			}
		};

		initAuth();

		// Listen for auth changes
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			if (event === 'SIGNED_IN' && session?.user) {
				setUser(session.user);
				setSession(session);
				await loadProfile(session.user.id);
				await loadOrganizations(session.user.id);
			} else if (event === 'SIGNED_OUT') {
				setUser(null);
				setSession(null);
				setProfile(null);
				setOrganizations([]);
				setCurrentOrganization(null);
				Cookies.remove('current_organization');
			} else if (event === 'TOKEN_REFRESHED' && session?.user) {
				setUser(session.user);
				setSession(session);
			}
		});

		return () => subscription.unsubscribe();
	}, [loadProfile, loadOrganizations]);

	// Login function with optional redirect
	const login = async (
		email: string,
		password: string,
		redirectTo?: string
	) => {
		try {
			setError(null);
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password
			});

			if (error) {
				// Supabaseのエラーを詳細に処理
				if (
					error.message?.includes('email not confirmed') ||
					error.message?.includes('Email not confirmed')
				) {
					const emailNotVerifiedError = new Error('Email not confirmed');
					(emailNotVerifiedError as any).code = 'AUTH_EMAIL_NOT_VERIFIED';
					throw emailNotVerifiedError;
				}
				throw error;
			}

			if (data.user) {
				await loadProfile(data.user.id);
				await loadOrganizations(data.user.id);

				// Check if there's a redirect URL (e.g., from invitation)
				if (redirectTo) {
					router.push(redirectTo);
					return;
				}

				// current_organization_idをチェック
				const { data: profileData } = await supabase
					.from('profiles')
					.select('current_organization_id')
					.eq('id', data.user.id)
					.single();

				if (!profileData?.current_organization_id) {
					// 組織に所属していない場合は組織作成ページへ
					router.push('/setup/organization');
				} else {
					// 組織に所属している場合はダッシュボードへ
					router.push('/');
				}
			}
		} catch (err) {
			console.error('Login error:', err);
			setError(err instanceof Error ? err.message : 'Login failed');
			throw err;
		}
	};

	// Signup function
	const signup = async (email: string, password: string, fullName: string) => {
		try {
			setError(null);
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						full_name: fullName
					}
				}
			});

			if (error) throw error;

			if (data.user) {
				// サインアップ成功 - メール確認は別途SignupFormで処理
				// ここではリダイレクトしない（SignupFormでverify-emailページへリダイレクト）
			}
		} catch (err) {
			console.error('Signup error:', err);
			setError(err instanceof Error ? err.message : 'Signup failed');
			throw err;
		}
	};

	// Logout function
	const logout = async () => {
		try {
			setError(null);
			const { error } = await supabase.auth.signOut();
			if (error) throw error;

			Cookies.remove('current_organization');
			router.push('/login');
		} catch (err) {
			console.error('Logout error:', err);
			setError(err instanceof Error ? err.message : 'Logout failed');
			throw err;
		}
	};

	// Reset password
	const resetPassword = async (email: string) => {
		try {
			setError(null);
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/auth/reset-password`
			});
			if (error) throw error;
		} catch (err) {
			console.error('Reset password error:', err);
			setError(
				err instanceof Error ? err.message : 'Failed to send reset email'
			);
			throw err;
		}
	};

	// Update password
	const updatePassword = async (newPassword: string) => {
		try {
			setError(null);
			const { error } = await supabase.auth.updateUser({
				password: newPassword
			});
			if (error) throw error;
		} catch (err) {
			console.error('Update password error:', err);
			setError(
				err instanceof Error ? err.message : 'Failed to update password'
			);
			throw err;
		}
	};

	// Change password (with current password verification)
	const changePassword = async (
		currentPassword: string,
		newPassword: string
	) => {
		try {
			setError(null);
			if (!user?.email) throw new Error('No user logged in');

			// Verify current password
			const { error: signInError } = await supabase.auth.signInWithPassword({
				email: user.email,
				password: currentPassword
			});

			if (signInError) {
				throw new Error('Current password is incorrect');
			}

			// Update to new password
			const { error: updateError } = await supabase.auth.updateUser({
				password: newPassword
			});

			if (updateError) throw updateError;
		} catch (err) {
			console.error('Change password error:', err);
			setError(
				err instanceof Error ? err.message : 'Failed to change password'
			);
			throw err;
		}
	};

	// Delete account
	const deleteAccount = async (password: string) => {
		try {
			setError(null);
			if (!user?.email) throw new Error('No user logged in');

			// Verify password before deletion
			const { error: signInError } = await supabase.auth.signInWithPassword({
				email: user.email,
				password: password
			});

			if (signInError) {
				throw new Error('Password is incorrect');
			}

			// Delete user account
			// Note: This requires service role key on the server side
			// For now, we'll mark the account for deletion and handle it server-side
			const { error: deleteError } = await supabase
				.from('profiles')
				.update({ deleted_at: new Date().toISOString() })
				.eq('id', user.id);

			if (deleteError) throw deleteError;

			// Sign out after marking for deletion
			await logout();
		} catch (err) {
			console.error('Delete account error:', err);
			setError(err instanceof Error ? err.message : 'Failed to delete account');
			throw err;
		}
	};

	// Update profile
	const updateProfile = async (updates: Partial<Profile>) => {
		try {
			setError(null);
			if (!user) throw new Error('No user logged in');

			const { data, error } = await supabase
				.from('profiles')
				.update(updates)
				.eq('id', user.id)
				.select()
				.single();

			if (error) throw error;
			setProfile(data);
		} catch (err) {
			console.error('Update profile error:', err);
			setError(err instanceof Error ? err.message : 'Failed to update profile');
			throw err;
		}
	};

	// Set current organization
	const handleSetCurrentOrganization = (org: Organization | null) => {
		setCurrentOrganization(org);
		if (org) {
			Cookies.set('current_organization', org.id);
		} else {
			Cookies.remove('current_organization');
		}
	};

	// Refresh session
	const refreshSession = async () => {
		try {
			const {
				data: { session },
				error
			} = await supabase.auth.refreshSession();
			if (error) throw error;
			if (session?.user) {
				setUser(session.user);
			}
		} catch (err) {
			console.error('Refresh session error:', err);
			setError(
				err instanceof Error ? err.message : 'Failed to refresh session'
			);
			throw err;
		}
	};

	const value: AuthContextType = {
		user,
		session,
		profile,
		organizations,
		currentOrganization,
		loading,
		error,
		login,
		signup,
		logout,
		resetPassword,
		updatePassword,
		changePassword,
		deleteAccount,
		updateProfile,
		setCurrentOrganization: handleSetCurrentOrganization,
		refreshSession
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
}

// HOC for protecting routes
export function withAuth<P extends object>(
	Component: React.ComponentType<P>,
	requireOrganization = true
) {
	return function ProtectedRoute(props: P) {
		const { user, currentOrganization, loading } = useAuth();
		const router = useRouter();

		useEffect(() => {
			if (!loading) {
				if (!user) {
					router.push('/login');
					return;
				}

				if (requireOrganization && !currentOrganization) {
					// 組織が必要だが現在の組織がない場合
					router.push('/setup/organization');
					return;
				}
			}
		}, [user, currentOrganization, loading, router]);

		if (loading) {
			return (
				<div className="flex items-center justify-center min-h-screen">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
				</div>
			);
		}

		if (!user) {
			return null;
		}

		if (requireOrganization && !currentOrganization) {
			return null;
		}

		return <Component {...props} />;
	};
}
