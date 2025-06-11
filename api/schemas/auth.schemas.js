/**
 * Authentication validation schemas
 * Defines validation rules for all authentication-related endpoints
 */

export const authSchemas = {
	// User registration schema
	signup: {
		body: {
			email: {
				type: 'email',
				required: true,
				sanitizer: 'html',
				options: {
					require_tld: true,
					allow_ip_domain: false
				},
				message: 'Please provide a valid email address'
			},
			password: {
				type: 'password',
				required: true,
				options: {
					minLength: 8,
					minLowercase: 1,
					minUppercase: 1,
					minNumbers: 1,
					minSymbols: 0
				},
				message:
					'Password must be at least 8 characters with uppercase, lowercase, and numbers'
			},
			fullName: {
				type: 'fullName',
				required: true,
				sanitizer: 'html',
				options: {
					minLength: 2,
					maxLength: 100,
					pattern: /^[a-zA-Z\s'-]+$/
				},
				message:
					'Full name must contain only letters, spaces, hyphens, and apostrophes'
			},
			organizationName: {
				type: 'alphanumeric',
				required: false,
				sanitizer: 'html',
				options: {
					allowSpaces: true,
					allowDashes: true,
					maxLength: 100
				},
				message: 'Organization name must be alphanumeric'
			}
		}
	},

	// User login schema
	login: {
		body: {
			email: {
				type: 'email',
				required: true,
				sanitizer: 'html',
				message: 'Please provide a valid email address'
			},
			password: {
				type: 'password',
				required: true,
				message: 'Password is required'
			}
		}
	},

	// Password reset request schema
	forgotPassword: {
		body: {
			email: {
				type: 'email',
				required: true,
				sanitizer: 'html',
				message: 'Please provide a valid email address'
			}
		}
	},

	// Password reset confirmation schema
	resetPassword: {
		body: {
			token: {
				type: 'alphanumeric',
				required: true,
				sanitizer: 'html',
				options: {
					minLength: 32
				},
				message: 'Invalid reset token'
			},
			newPassword: {
				type: 'password',
				required: true,
				options: {
					minLength: 8,
					minLowercase: 1,
					minUppercase: 1,
					minNumbers: 1
				},
				message:
					'Password must be at least 8 characters with uppercase, lowercase, and numbers'
			}
		}
	},

	// Token refresh schema
	refreshToken: {
		body: {
			refreshToken: {
				type: 'jwt',
				required: true,
				message: 'Valid refresh token is required'
			}
		}
	},

	// Password change schema
	changePassword: {
		body: {
			currentPassword: {
				type: 'password',
				required: true,
				message: 'Current password is required'
			},
			newPassword: {
				type: 'password',
				required: true,
				options: {
					minLength: 8,
					minLowercase: 1,
					minUppercase: 1,
					minNumbers: 1
				},
				message:
					'Password must be at least 8 characters with uppercase, lowercase, and numbers'
			}
		}
	},

	// Account deletion schema
	deleteAccount: {
		body: {
			password: {
				type: 'password',
				required: true,
				message: 'Password is required for account deletion'
			},
			confirmDeletion: {
				type: 'text',
				required: true,
				validator: (value) => value === 'DELETE MY ACCOUNT',
				message: 'Please type "DELETE MY ACCOUNT" to confirm'
			}
		}
	},

	// OAuth callback schema
	oauthCallback: {
		query: {
			code: {
				type: 'alphanumeric',
				required: true,
				sanitizer: 'html',
				message: 'OAuth authorization code is required'
			},
			state: {
				type: 'alphanumeric',
				required: false,
				sanitizer: 'html',
				message: 'Invalid state parameter'
			}
		}
	},

	// API key generation schema
	generateApiKey: {
		body: {
			name: {
				type: 'alphanumeric',
				required: true,
				sanitizer: 'html',
				options: {
					allowSpaces: true,
					maxLength: 100
				},
				message: 'API key name is required'
			},
			permissions: {
				type: 'array',
				required: false,
				itemType: 'enum',
				options: {
					values: ['read', 'write', 'delete', 'admin']
				},
				message: 'Invalid permissions'
			},
			expiresIn: {
				type: 'number',
				required: false,
				options: {
					min: 3600, // 1 hour
					max: 31536000 // 1 year
				},
				message: 'Expiration must be between 1 hour and 1 year'
			}
		}
	}
};

/**
 * Get schema for a specific auth endpoint
 * @param {string} endpoint - Endpoint name
 * @returns {Object} Schema object
 */
export function getAuthSchema(endpoint) {
	return authSchemas[endpoint] || null;
}

/**
 * Validate auth request against schema
 * @param {string} endpoint - Endpoint name
 * @param {Object} req - Express request object
 * @returns {Object} Validation result
 */
export function validateAuthRequest(endpoint, req) {
	const schema = getAuthSchema(endpoint);
	if (!schema) {
		return { valid: true, errors: [] };
	}

	const errors = [];

	// Validate body
	if (schema.body && req.body) {
		for (const [field, rules] of Object.entries(schema.body)) {
			const value = req.body[field];

			// Check required
			if (
				rules.required &&
				(value === undefined || value === null || value === '')
			) {
				errors.push({
					field,
					code: 'REQUIRED',
					message: rules.message || `${field} is required`
				});
				continue;
			}

			// Skip validation if not required and not provided
			if (!rules.required && (value === undefined || value === null)) {
				continue;
			}

			// Custom validator
			if (rules.validator && !rules.validator(value)) {
				errors.push({
					field,
					code: 'INVALID',
					message: rules.message || `${field} is invalid`
				});
			}
		}
	}

	// Validate query
	if (schema.query && req.query) {
		for (const [field, rules] of Object.entries(schema.query)) {
			const value = req.query[field];

			// Check required
			if (rules.required && !value) {
				errors.push({
					field: `query.${field}`,
					code: 'REQUIRED',
					message: rules.message || `${field} is required`
				});
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}
