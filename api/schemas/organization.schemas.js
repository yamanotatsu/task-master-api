/**
 * Organization validation schemas
 * Defines validation rules for organization-related endpoints
 */

export const organizationSchemas = {
	// Create organization schema
	createOrganization: {
		body: {
			name: {
				type: 'alphanumeric',
				required: true,
				sanitizer: 'html',
				options: {
					allowSpaces: true,
					allowDashes: true,
					minLength: 2,
					maxLength: 100
				},
				message: 'Organization name must be 2-100 characters'
			},
			description: {
				type: 'text',
				required: false,
				sanitizer: 'html',
				options: {
					maxLength: 500
				},
				message: 'Description must not exceed 500 characters'
			},
			website: {
				type: 'url',
				required: false,
				sanitizer: 'url',
				options: {
					require_protocol: true,
					protocols: ['http', 'https']
				},
				message: 'Please provide a valid website URL'
			},
			size: {
				type: 'enum',
				required: false,
				options: {
					values: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
				},
				message: 'Invalid organization size'
			},
			industry: {
				type: 'alphanumeric',
				required: false,
				sanitizer: 'html',
				options: {
					allowSpaces: true,
					maxLength: 100
				},
				message: 'Invalid industry'
			}
		}
	},

	// Update organization schema
	updateOrganization: {
		params: {
			organizationId: {
				type: 'uuid',
				required: true,
				message: 'Valid organization ID is required'
			}
		},
		body: {
			name: {
				type: 'alphanumeric',
				required: false,
				sanitizer: 'html',
				options: {
					allowSpaces: true,
					allowDashes: true,
					minLength: 2,
					maxLength: 100
				},
				message: 'Organization name must be 2-100 characters'
			},
			description: {
				type: 'text',
				required: false,
				sanitizer: 'html',
				options: {
					maxLength: 500
				},
				message: 'Description must not exceed 500 characters'
			},
			website: {
				type: 'url',
				required: false,
				sanitizer: 'url',
				options: {
					require_protocol: true,
					protocols: ['http', 'https']
				},
				message: 'Please provide a valid website URL'
			},
			size: {
				type: 'enum',
				required: false,
				options: {
					values: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
				},
				message: 'Invalid organization size'
			},
			industry: {
				type: 'alphanumeric',
				required: false,
				sanitizer: 'html',
				options: {
					allowSpaces: true,
					maxLength: 100
				},
				message: 'Invalid industry'
			}
		}
	},

	// Invite member schema
	inviteMember: {
		params: {
			organizationId: {
				type: 'uuid',
				required: true,
				message: 'Valid organization ID is required'
			}
		},
		body: {
			email: {
				type: 'email',
				required: true,
				sanitizer: 'html',
				message: 'Valid email address is required'
			},
			role: {
				type: 'enum',
				required: true,
				options: {
					values: ['admin', 'member', 'viewer']
				},
				message: 'Role must be admin, member, or viewer'
			},
			message: {
				type: 'text',
				required: false,
				sanitizer: 'html',
				options: {
					maxLength: 500
				},
				message: 'Invitation message must not exceed 500 characters'
			}
		}
	},

	// Update member role schema
	updateMemberRole: {
		params: {
			organizationId: {
				type: 'uuid',
				required: true,
				message: 'Valid organization ID is required'
			},
			memberId: {
				type: 'uuid',
				required: true,
				message: 'Valid member ID is required'
			}
		},
		body: {
			role: {
				type: 'enum',
				required: true,
				options: {
					values: ['admin', 'member', 'viewer']
				},
				message: 'Role must be admin, member, or viewer'
			}
		}
	},

	// Remove member schema
	removeMember: {
		params: {
			organizationId: {
				type: 'uuid',
				required: true,
				message: 'Valid organization ID is required'
			},
			memberId: {
				type: 'uuid',
				required: true,
				message: 'Valid member ID is required'
			}
		}
	},

	// List organizations schema
	listOrganizations: {
		query: {
			page: {
				type: 'number',
				required: false,
				options: {
					min: 1,
					max: 1000
				},
				message: 'Page must be between 1 and 1000'
			},
			limit: {
				type: 'number',
				required: false,
				options: {
					min: 1,
					max: 100
				},
				message: 'Limit must be between 1 and 100'
			},
			search: {
				type: 'text',
				required: false,
				sanitizer: 'html',
				options: {
					maxLength: 100
				},
				message: 'Search query must not exceed 100 characters'
			},
			sortBy: {
				type: 'enum',
				required: false,
				options: {
					values: ['name', 'created_at', 'updated_at', 'member_count']
				},
				message: 'Invalid sort field'
			},
			sortOrder: {
				type: 'enum',
				required: false,
				options: {
					values: ['asc', 'desc']
				},
				message: 'Sort order must be asc or desc'
			}
		}
	},

	// Organization settings schema
	updateSettings: {
		params: {
			organizationId: {
				type: 'uuid',
				required: true,
				message: 'Valid organization ID is required'
			}
		},
		body: {
			allowSignups: {
				type: 'boolean',
				required: false,
				message: 'allowSignups must be a boolean'
			},
			requireApproval: {
				type: 'boolean',
				required: false,
				message: 'requireApproval must be a boolean'
			},
			defaultRole: {
				type: 'enum',
				required: false,
				options: {
					values: ['member', 'viewer']
				},
				message: 'Default role must be member or viewer'
			},
			emailDomain: {
				type: 'text',
				required: false,
				sanitizer: 'html',
				validator: (value) => {
					if (!value) return true;
					// Basic domain validation
					return /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/.test(
						value
					);
				},
				message: 'Invalid email domain'
			},
			features: {
				type: 'object',
				required: false,
				properties: {
					projects: { type: 'boolean' },
					tasks: { type: 'boolean' },
					analytics: { type: 'boolean' },
					integrations: { type: 'boolean' }
				},
				message: 'Invalid features configuration'
			}
		}
	},

	// Billing information schema
	updateBilling: {
		params: {
			organizationId: {
				type: 'uuid',
				required: true,
				message: 'Valid organization ID is required'
			}
		},
		body: {
			plan: {
				type: 'enum',
				required: false,
				options: {
					values: ['free', 'starter', 'professional', 'enterprise']
				},
				message: 'Invalid billing plan'
			},
			billingEmail: {
				type: 'email',
				required: false,
				sanitizer: 'html',
				message: 'Valid billing email is required'
			},
			address: {
				type: 'object',
				required: false,
				properties: {
					line1: {
						type: 'text',
						sanitizer: 'html',
						options: { maxLength: 200 }
					},
					line2: {
						type: 'text',
						sanitizer: 'html',
						options: { maxLength: 200 }
					},
					city: {
						type: 'text',
						sanitizer: 'html',
						options: { maxLength: 100 }
					},
					state: {
						type: 'text',
						sanitizer: 'html',
						options: { maxLength: 100 }
					},
					postalCode: {
						type: 'alphanumeric',
						sanitizer: 'html',
						options: {
							allowSpaces: true,
							allowDashes: true,
							maxLength: 20
						}
					},
					country: {
						type: 'text',
						sanitizer: 'html',
						options: { maxLength: 2 }, // ISO country code
						validator: (value) => /^[A-Z]{2}$/.test(value),
						message: 'Country must be a valid ISO 3166-1 alpha-2 code'
					}
				}
			}
		}
	}
};

/**
 * Get schema for a specific organization endpoint
 * @param {string} endpoint - Endpoint name
 * @returns {Object} Schema object
 */
export function getOrganizationSchema(endpoint) {
	return organizationSchemas[endpoint] || null;
}

/**
 * Validate organization request against schema
 * @param {string} endpoint - Endpoint name
 * @param {Object} req - Express request object
 * @returns {Object} Validation result
 */
export function validateOrganizationRequest(endpoint, req) {
	const schema = getOrganizationSchema(endpoint);
	if (!schema) {
		return { valid: true, errors: [] };
	}

	const errors = [];

	// Validate params
	if (schema.params && req.params) {
		for (const [field, rules] of Object.entries(schema.params)) {
			const value = req.params[field];

			if (rules.required && !value) {
				errors.push({
					field: `params.${field}`,
					code: 'REQUIRED',
					message: rules.message || `${field} is required`
				});
			}
		}
	}

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

			// Type-specific validation
			if (rules.type === 'boolean' && typeof value !== 'boolean') {
				errors.push({
					field,
					code: 'INVALID_TYPE',
					message: rules.message || `${field} must be a boolean`
				});
			}

			// Custom validator
			if (rules.validator && !rules.validator(value)) {
				errors.push({
					field,
					code: 'INVALID',
					message: rules.message || `${field} is invalid`
				});
			}

			// Nested object validation
			if (rules.type === 'object' && rules.properties && value) {
				for (const [prop, propRules] of Object.entries(rules.properties)) {
					if (
						propRules.type === 'boolean' &&
						value[prop] !== undefined &&
						typeof value[prop] !== 'boolean'
					) {
						errors.push({
							field: `${field}.${prop}`,
							code: 'INVALID_TYPE',
							message: `${field}.${prop} must be a boolean`
						});
					}
				}
			}
		}
	}

	// Validate query
	if (schema.query && req.query) {
		for (const [field, rules] of Object.entries(schema.query)) {
			const value = req.query[field];

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
