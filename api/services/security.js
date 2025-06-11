import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_SERVICE_KEY
);

class SecurityService {
	constructor() {
		this.maxLoginAttempts = 5;
		this.lockoutDuration = 30 * 60 * 1000; // 30 minutes
		this.progressiveDelayFactor = 2; // Exponential backoff factor
	}

	/**
	 * Track a login attempt (success or failure)
	 */
	async trackLoginAttempt(
		identifier,
		identifierType = 'email',
		success = false,
		metadata = {}
	) {
		try {
			const { error } = await supabase.from('login_attempts').insert({
				identifier,
				identifier_type: identifierType,
				success,
				ip_address: metadata.ip,
				user_agent: metadata.userAgent,
				attempted_at: new Date().toISOString(),
				metadata
			});

			if (error) {
				console.error('Failed to track login attempt:', error);
			}

			// Clear old attempts on successful login
			if (success) {
				await this.clearFailedAttempts(identifier, identifierType);
			}
		} catch (err) {
			console.error('Error tracking login attempt:', err);
		}
	}

	/**
	 * Check if account is locked due to failed attempts
	 */
	async isAccountLocked(identifier, identifierType = 'email') {
		try {
			// Check for active lock
			const { data: lock, error: lockError } = await supabase
				.from('account_locks')
				.select('*')
				.eq('identifier', identifier)
				.eq('identifier_type', identifierType)
				.eq('is_active', true)
				.gte('expires_at', new Date().toISOString())
				.single();

			if (lock && !lockError) {
				return {
					locked: true,
					reason: lock.reason,
					expiresAt: lock.expires_at,
					remainingTime: new Date(lock.expires_at) - new Date()
				};
			}

			// Check recent failed attempts
			const cutoffTime = new Date(
				Date.now() - this.lockoutDuration
			).toISOString();
			const { count, error: countError } = await supabase
				.from('login_attempts')
				.select('*', { count: 'exact' })
				.eq('identifier', identifier)
				.eq('identifier_type', identifierType)
				.eq('success', false)
				.gte('attempted_at', cutoffTime);

			if (!countError && count >= this.maxLoginAttempts) {
				// Create lock
				await this.lockAccount(
					identifier,
					identifierType,
					'Exceeded maximum login attempts'
				);

				return {
					locked: true,
					reason: 'Too many failed login attempts',
					expiresAt: new Date(Date.now() + this.lockoutDuration).toISOString(),
					remainingTime: this.lockoutDuration
				};
			}

			return { locked: false };
		} catch (err) {
			console.error('Error checking account lock status:', err);
			return { locked: false }; // Fail open to avoid locking out users due to errors
		}
	}

	/**
	 * Lock an account
	 */
	async lockAccount(
		identifier,
		identifierType = 'email',
		reason = 'Security violation'
	) {
		try {
			const expiresAt = new Date(Date.now() + this.lockoutDuration);

			const { error } = await supabase.from('account_locks').insert({
				identifier,
				identifier_type: identifierType,
				reason,
				locked_at: new Date().toISOString(),
				expires_at: expiresAt.toISOString(),
				is_active: true
			});

			if (error) {
				console.error('Failed to lock account:', error);
			}

			return { success: !error, expiresAt };
		} catch (err) {
			console.error('Error locking account:', err);
			return { success: false };
		}
	}

	/**
	 * Unlock an account
	 */
	async unlockAccount(identifier, identifierType = 'email') {
		try {
			const { error } = await supabase
				.from('account_locks')
				.update({
					is_active: false,
					unlocked_at: new Date().toISOString()
				})
				.eq('identifier', identifier)
				.eq('identifier_type', identifierType)
				.eq('is_active', true);

			if (!error) {
				await this.clearFailedAttempts(identifier, identifierType);
			}

			return { success: !error };
		} catch (err) {
			console.error('Error unlocking account:', err);
			return { success: false };
		}
	}

	/**
	 * Clear failed login attempts
	 */
	async clearFailedAttempts(identifier, identifierType = 'email') {
		try {
			// Don't delete, just mark as cleared for audit trail
			const { error } = await supabase
				.from('login_attempts')
				.update({ cleared: true })
				.eq('identifier', identifier)
				.eq('identifier_type', identifierType)
				.eq('success', false)
				.eq('cleared', false);

			return { success: !error };
		} catch (err) {
			console.error('Error clearing failed attempts:', err);
			return { success: false };
		}
	}

	/**
	 * Block an IP address
	 */
	async blockIP(
		ipAddress,
		reason = 'Suspicious activity',
		duration = 24 * 60 * 60 * 1000
	) {
		try {
			const expiresAt = new Date(Date.now() + duration);

			const { error } = await supabase.from('security_blocks').insert({
				identifier: ipAddress,
				identifier_type: 'ip',
				reason,
				blocked_at: new Date().toISOString(),
				expires_at: expiresAt.toISOString(),
				is_active: true
			});

			return { success: !error, expiresAt };
		} catch (err) {
			console.error('Error blocking IP:', err);
			return { success: false };
		}
	}

	/**
	 * Check if IP is blocked
	 */
	async isIPBlocked(ipAddress) {
		try {
			const { data: block, error } = await supabase
				.from('security_blocks')
				.select('*')
				.eq('identifier', ipAddress)
				.eq('identifier_type', 'ip')
				.eq('is_active', true)
				.gte('expires_at', new Date().toISOString())
				.single();

			if (block && !error) {
				return {
					blocked: true,
					reason: block.reason,
					expiresAt: block.expires_at,
					remainingTime: new Date(block.expires_at) - new Date()
				};
			}

			return { blocked: false };
		} catch (err) {
			console.error('Error checking IP block status:', err);
			return { blocked: false };
		}
	}

	/**
	 * Calculate progressive delay based on failed attempts
	 */
	async calculateDelay(identifier, identifierType = 'email') {
		try {
			const { count } = await supabase
				.from('login_attempts')
				.select('*', { count: 'exact' })
				.eq('identifier', identifier)
				.eq('identifier_type', identifierType)
				.eq('success', false)
				.gte(
					'attempted_at',
					new Date(Date.now() - 15 * 60 * 1000).toISOString()
				);

			// Progressive delay: 1s, 2s, 4s, 8s, etc.
			const baseDelay = 1000;
			const exponentialDelay = Math.min(
				baseDelay * Math.pow(this.progressiveDelayFactor, count || 0),
				30000 // Max 30 seconds
			);

			return exponentialDelay;
		} catch (err) {
			console.error('Error calculating delay:', err);
			return 0;
		}
	}

	/**
	 * Detect suspicious patterns
	 */
	async detectSuspiciousActivity(identifier, metadata = {}) {
		try {
			// Check for rapid-fire attempts from different IPs
			const { data: recentAttempts } = await supabase
				.from('login_attempts')
				.select('ip_address, attempted_at')
				.eq('identifier', identifier)
				.gte('attempted_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
				.order('attempted_at', { ascending: false });

			if (recentAttempts && recentAttempts.length > 0) {
				const uniqueIPs = new Set(recentAttempts.map((a) => a.ip_address)).size;

				// Suspicious: Many attempts from different IPs
				if (uniqueIPs > 3 && recentAttempts.length > 10) {
					await this.flagSuspiciousActivity(
						identifier,
						'Multiple IPs attempting access'
					);
					return { suspicious: true, reason: 'Multiple IPs detected' };
				}

				// Suspicious: Very rapid attempts (more than 1 per second)
				if (recentAttempts.length > 1) {
					const timeDiffs = [];
					for (let i = 1; i < recentAttempts.length; i++) {
						const diff =
							new Date(recentAttempts[i - 1].attempted_at) -
							new Date(recentAttempts[i].attempted_at);
						timeDiffs.push(diff);
					}

					const avgTimeDiff =
						timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
					if (avgTimeDiff < 1000) {
						// Less than 1 second average
						await this.flagSuspiciousActivity(
							identifier,
							'Automated attack detected'
						);
						return { suspicious: true, reason: 'Automated attempts detected' };
					}
				}
			}

			return { suspicious: false };
		} catch (err) {
			console.error('Error detecting suspicious activity:', err);
			return { suspicious: false };
		}
	}

	/**
	 * Flag suspicious activity for review
	 */
	async flagSuspiciousActivity(identifier, reason, metadata = {}) {
		try {
			const { error } = await supabase.from('security_alerts').insert({
				identifier,
				alert_type: 'suspicious_activity',
				reason,
				metadata,
				created_at: new Date().toISOString(),
				reviewed: false
			});

			if (!error) {
				// Could trigger additional actions like sending alerts to admins
				console.warn(`Suspicious activity detected: ${identifier} - ${reason}`);
			}
		} catch (err) {
			console.error('Error flagging suspicious activity:', err);
		}
	}

	/**
	 * Generate secure random token
	 */
	generateSecureToken(length = 32) {
		return crypto.randomBytes(length).toString('hex');
	}

	/**
	 * Hash password with bcrypt
	 */
	async hashPassword(password) {
		const saltRounds = 12;
		return bcrypt.hash(password, saltRounds);
	}

	/**
	 * Verify password against hash
	 */
	async verifyPassword(password, hash) {
		return bcrypt.compare(password, hash);
	}

	/**
	 * Validate password strength
	 */
	validatePasswordStrength(password) {
		const minLength = 8;
		const hasUpperCase = /[A-Z]/.test(password);
		const hasLowerCase = /[a-z]/.test(password);
		const hasNumbers = /\d/.test(password);
		const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

		const issues = [];

		if (password.length < minLength) {
			issues.push(`Password must be at least ${minLength} characters long`);
		}
		if (!hasUpperCase) {
			issues.push('Password must contain at least one uppercase letter');
		}
		if (!hasLowerCase) {
			issues.push('Password must contain at least one lowercase letter');
		}
		if (!hasNumbers) {
			issues.push('Password must contain at least one number');
		}
		if (!hasSpecialChar) {
			issues.push('Password must contain at least one special character');
		}

		return {
			valid: issues.length === 0,
			issues,
			strength: this.calculatePasswordStrength(password)
		};
	}

	/**
	 * Calculate password strength score
	 */
	calculatePasswordStrength(password) {
		let strength = 0;

		if (password.length >= 8) strength += 1;
		if (password.length >= 12) strength += 1;
		if (password.length >= 16) strength += 1;
		if (/[a-z]/.test(password)) strength += 1;
		if (/[A-Z]/.test(password)) strength += 1;
		if (/\d/.test(password)) strength += 1;
		if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;
		if (/[^A-Za-z0-9!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1; // Other special chars

		const strengthMap = {
			0: 'very weak',
			1: 'very weak',
			2: 'weak',
			3: 'weak',
			4: 'fair',
			5: 'good',
			6: 'strong',
			7: 'very strong',
			8: 'excellent'
		};

		return {
			score: strength,
			label: strengthMap[strength] || 'very weak'
		};
	}

	/**
	 * Sanitize user input to prevent injection attacks
	 */
	sanitizeInput(input) {
		if (typeof input !== 'string') return input;

		// Remove any potential SQL injection attempts
		return input
			.replace(/[';\\]/g, '') // Remove quotes and backslashes
			.replace(/--/g, '') // Remove SQL comments
			.replace(/\/\*/g, '') // Remove multi-line comments
			.replace(/\*\//g, '')
			.trim();
	}

	/**
	 * Generate CSRF token
	 */
	generateCSRFToken() {
		return this.generateSecureToken(32);
	}

	/**
	 * Verify CSRF token
	 */
	verifyCSRFToken(token, sessionToken) {
		return token === sessionToken;
	}
}

export default new SecurityService();
