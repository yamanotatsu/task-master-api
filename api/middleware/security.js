import crypto from 'crypto';
import express from 'express';
import helmet from 'helmet';
import { getSecurityConfig, securityMonitoring } from '../config/security.js';
import { logger } from '../utils/logger.js';

/**
 * Enhanced security middleware for Task Master API
 * Implements comprehensive security headers, CSP nonce generation,
 * and request monitoring
 */

// Get security configuration
const securityConfig = getSecurityConfig();

/**
 * Generate CSP nonce for inline scripts/styles
 * @returns {string} Base64 encoded nonce
 */
export const generateCSPNonce = () => {
	return crypto.randomBytes(16).toString('base64');
};

/**
 * Generate unique request ID for tracking
 * @returns {string} UUID v4 request ID
 */
export const generateRequestId = () => {
	return crypto.randomUUID();
};

/**
 * Main security middleware that applies all security headers
 */
export const securityMiddleware = (req, res, next) => {
	// Generate and attach request ID
	const requestId = req.headers['x-request-id'] || generateRequestId();
	req.id = requestId;
	res.setHeader('X-Request-ID', requestId);

	// Generate CSP nonce for this request
	const nonce = generateCSPNonce();
	req.cspNonce = nonce;
	res.locals.cspNonce = nonce;

	// Apply security headers from config
	Object.entries(securityConfig.headers).forEach(([header, value]) => {
		res.setHeader(header, value);
	});

	// Remove fingerprinting headers
	res.removeHeader('X-Powered-By');
	res.removeHeader('Server');

	// Add timing header for performance monitoring
	res.setHeader('X-Response-Time', '0ms');
	const startTime = process.hrtime.bigint();

	// Override res.end to calculate response time
	const originalEnd = res.end;
	res.end = function (...args) {
		const endTime = process.hrtime.bigint();
		const responseTime = Number(endTime - startTime) / 1000000; // Convert to ms
		res.setHeader('X-Response-Time', `${responseTime.toFixed(2)}ms`);
		originalEnd.apply(res, args);
	};

	next();
};

/**
 * Dynamic CSP middleware with nonce support
 */
export const cspMiddleware = (req, res, next) => {
	const cspConfig = { ...securityConfig.csp };

	// Add nonce to script and style sources if they exist
	if (req.cspNonce) {
		if (cspConfig.scriptSrc) {
			cspConfig.scriptSrc = [...cspConfig.scriptSrc, `'nonce-${req.cspNonce}'`];
		}
		if (cspConfig.styleSrc) {
			cspConfig.styleSrc = [...cspConfig.styleSrc, `'nonce-${req.cspNonce}'`];
		}
	}

	// Build CSP header string
	const cspString = Object.entries(cspConfig)
		.map(([directive, values]) => {
			if (!Array.isArray(values) || values.length === 0) return null;
			const kebabDirective = directive.replace(/([A-Z])/g, '-$1').toLowerCase();
			return `${kebabDirective} ${values.join(' ')}`;
		})
		.filter(Boolean)
		.join('; ');

	res.setHeader('Content-Security-Policy', cspString);

	// Report CSP violations
	res.setHeader(
		'Content-Security-Policy-Report-Only',
		`${cspString}; report-uri /api/v1/security/csp-report`
	);

	next();
};

/**
 * Feature policy middleware
 */
export const featurePolicyMiddleware = (req, res, next) => {
	const policies = Object.entries(securityConfig.featurePolicy)
		.map(([feature, values]) => {
			const kebabFeature = feature.replace(/([A-Z])/g, '-$1').toLowerCase();
			return `${kebabFeature}=${values.join(' ')}`;
		})
		.join('; ');

	res.setHeader('Permissions-Policy', policies);
	next();
};

/**
 * Security monitoring middleware
 * Logs and monitors security-related events
 */
export const securityMonitoringMiddleware = (req, res, next) => {
	// Monitor for suspicious patterns
	const suspiciousPatterns = [
		/(\.\.|\/\/|\\\\)/, // Path traversal
		/<script[^>]*>|<\/script>|javascript:/i, // XSS attempts
		/union.*select|select.*from|insert.*into|delete.*from|drop.*table/i, // SQL injection
		/\${.*}|{{.*}}/, // Template injection
		/%00|%0d|%0a/ // Null byte injection
	];

	const url = req.originalUrl || req.url;
	const userAgent = req.headers['user-agent'] || '';
	const body = JSON.stringify(req.body || {});

	// Check for suspicious patterns
	const checkString = `${url} ${userAgent} ${body}`;
	const isSuspicious = suspiciousPatterns.some((pattern) =>
		pattern.test(checkString)
	);

	if (isSuspicious) {
		logger.warn('Suspicious request detected', {
			event: securityMonitoring.events.SUSPICIOUS_REQUEST,
			requestId: req.id,
			ip: req.ip,
			url: req.originalUrl,
			method: req.method,
			userAgent: req.headers['user-agent'],
			timestamp: new Date().toISOString()
		});

		// In production, you might want to block suspicious requests
		if (securityConfig.isProduction) {
			return res.status(400).json({
				success: false,
				error: {
					code: 'INVALID_REQUEST',
					message: 'Invalid request detected'
				}
			});
		}
	}

	// Log security events
	res.on('finish', () => {
		// Log failed authentication attempts
		if (res.statusCode === 401) {
			logger.warn('Authentication failed', {
				event: securityMonitoring.events.AUTHENTICATION_FAILED,
				requestId: req.id,
				ip: req.ip,
				url: req.originalUrl,
				timestamp: new Date().toISOString()
			});
		}

		// Log authorization failures
		if (res.statusCode === 403) {
			logger.warn('Authorization failed', {
				event: securityMonitoring.events.AUTHORIZATION_FAILED,
				requestId: req.id,
				ip: req.ip,
				url: req.originalUrl,
				userId: req.user?.id,
				timestamp: new Date().toISOString()
			});
		}

		// Log rate limit violations
		if (res.statusCode === 429) {
			logger.warn('Rate limit exceeded', {
				event: securityMonitoring.events.RATE_LIMIT_EXCEEDED,
				requestId: req.id,
				ip: req.ip,
				url: req.originalUrl,
				timestamp: new Date().toISOString()
			});
		}
	});

	next();
};

/**
 * CSP violation report handler
 */
export const cspReportHandler = (req, res) => {
	const violation = req.body;

	logger.warn('CSP violation reported', {
		event: securityMonitoring.events.CSP_VIOLATION,
		requestId: req.id,
		violation: violation['csp-report'],
		userAgent: req.headers['user-agent'],
		timestamp: new Date().toISOString()
	});

	res.status(204).end();
};

/**
 * Security headers validation middleware
 * Ensures critical security headers are present
 */
export const validateSecurityHeaders = (req, res, next) => {
	const requiredHeaders = [
		'x-content-type-options',
		'x-frame-options',
		'x-request-id'
	];

	// This runs after our security middleware, so headers should be set
	setImmediate(() => {
		const missingHeaders = requiredHeaders.filter(
			(header) => !res.getHeader(header)
		);

		if (missingHeaders.length > 0 && securityConfig.isProduction) {
			logger.error('Missing critical security headers', {
				requestId: req.id,
				missingHeaders,
				url: req.originalUrl
			});
		}
	});

	next();
};

/**
 * Create configured Helmet middleware with environment-specific settings
 */
export const createHelmetMiddleware = () => {
	return helmet({
		contentSecurityPolicy: false, // We handle CSP separately for nonce support
		hsts: securityConfig.hsts,
		noSniff: true,
		xssFilter: false, // Disabled as per modern security recommendations
		ieNoOpen: true,
		dnsPrefetchControl: { allow: false },
		frameguard: { action: 'deny' },
		permittedCrossDomainPolicies: { permittedPolicies: 'none' },
		hidePoweredBy: true,
		originAgentCluster: true,
		crossOriginEmbedderPolicy: securityConfig.isProduction,
		crossOriginOpenerPolicy: { policy: 'same-origin' },
		crossOriginResourcePolicy: { policy: 'same-origin' }
	});
};

/**
 * Request sanitization middleware
 * Cleans potentially dangerous input
 */
export const sanitizationMiddleware = (req, res, next) => {
	// Sanitize common injection points
	if (req.query) {
		Object.keys(req.query).forEach((key) => {
			if (typeof req.query[key] === 'string') {
				// Remove null bytes
				req.query[key] = req.query[key].replace(/\0/g, '');
			}
		});
	}

	if (req.params) {
		Object.keys(req.params).forEach((key) => {
			if (typeof req.params[key] === 'string') {
				// Remove null bytes
				req.params[key] = req.params[key].replace(/\0/g, '');
			}
		});
	}

	next();
};

/**
 * Apply all security middleware in the correct order
 */
export const applySecurityMiddleware = (app) => {
	// Basic security headers
	app.use(securityMiddleware);

	// Helmet for additional security headers
	app.use(createHelmetMiddleware());

	// CSP with nonce support
	app.use(cspMiddleware);

	// Feature/Permissions policy
	app.use(featurePolicyMiddleware);

	// Request sanitization
	app.use(sanitizationMiddleware);

	// Security monitoring
	app.use(securityMonitoringMiddleware);

	// Validate headers (in development/testing)
	if (!securityConfig.isProduction) {
		app.use(validateSecurityHeaders);
	}

	// CSP violation reporting endpoint
	app.post(
		'/api/v1/security/csp-report',
		express.json({ type: 'application/csp-report' }),
		cspReportHandler
	);

	logger.info('Security middleware applied', {
		environment: securityConfig.env,
		corsEnabled: true,
		cspEnabled: true,
		rateLimitEnabled: process.env.ENABLE_RATE_LIMIT === 'true'
	});
};

export default {
	securityMiddleware,
	cspMiddleware,
	featurePolicyMiddleware,
	securityMonitoringMiddleware,
	validateSecurityHeaders,
	createHelmetMiddleware,
	sanitizationMiddleware,
	applySecurityMiddleware,
	generateCSPNonce,
	generateRequestId
};
