import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import rateLimit from 'express-rate-limit';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure dotenv with path to .env file
dotenv.config({ path: join(__dirname, '.env') });

// Import security configuration and middleware
import { getSecurityConfig, trustedProxyConfig } from './config/security.js';
import { applySecurityMiddleware } from './middleware/security.js';

// Import new database-backed routes
import projectsRouter from './routes/projects-db.js';
import membersRouter from './routes/members.js';
import tasksRouter from './routes/tasks-db.js';
import generateTasksRouter from './routes/generate-tasks-db.js';
import statisticsRouter from './routes/statistics.js';
import authRouter from './routes/auth.js';
import organizationsRouter from './routes/organizations.js';
import auditRouter from './routes/audit.js';

// Import audit middleware
import {
	auditMiddleware,
	auditRateLimitMiddleware,
	auditErrorMiddleware
} from './middleware/auditLog.js';

const app = express();
const PORT = process.env.API_PORT || 8080;

// Get security configuration
const securityConfig = getSecurityConfig();

// Trust proxy configuration
if (trustedProxyConfig[securityConfig.env]) {
	app.set('trust proxy', trustedProxyConfig[securityConfig.env]);
}

// Apply comprehensive security middleware
applySecurityMiddleware(app);

// CORS configuration from security config
const corsOptions = securityConfig.cors;

// Rate limiting configuration
if (process.env.ENABLE_RATE_LIMIT === 'true') {
	// Global rate limiter
	const globalLimiter = rateLimit(securityConfig.rateLimit.global);
	app.use('/api/', globalLimiter);

	// Auth-specific rate limiter
	const authLimiter = rateLimit(securityConfig.rateLimit.auth);
	app.use('/api/v1/auth/login', authLimiter);
	app.use('/api/v1/auth/signup', authLimiter);
	app.use('/api/v1/auth/forgot-password', authLimiter);
	app.use('/api/v1/auth/reset-password', authLimiter);

	// Strict rate limiter for sensitive operations
	const strictLimiter = rateLimit(
		securityConfig.rateLimit.strict || securityConfig.rateLimit.auth
	);
	app.use('/api/v1/auth/change-password', strictLimiter);
	app.use('/api/v1/auth/delete-account', strictLimiter);
}

// CORS middleware
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (security headers are handled by security middleware)
app.use((req, res, next) => {
	// Log request with request ID
	console.log(
		`${new Date().toISOString()} - [${req.id || 'no-id'}] ${req.method} ${req.path} - ${req.ip}`
	);
	next();
});

// Apply audit logging middleware
app.use(
	auditMiddleware({
		logAllRequests: process.env.AUDIT_LOG_ALL_REQUESTS === 'true'
	})
);
app.use(auditRateLimitMiddleware);

// Mount routers
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/organizations', organizationsRouter);
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/members', membersRouter);
app.use('/api/v1/tasks', tasksRouter);
app.use('/api/v1/generate-tasks-from-prd', generateTasksRouter);
app.use('/api/v1/audit', auditRouter);
app.use('/api/v1', statisticsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
	res.json({
		status: 'healthy',
		timestamp: new Date().toISOString(),
		database: 'supabase',
		environment: securityConfig.env,
		security: {
			cors: 'enabled',
			csp: 'enabled',
			rateLimit:
				process.env.ENABLE_RATE_LIMIT === 'true' ? 'enabled' : 'disabled',
			headers: 'enhanced'
		}
	});
});

// Security status endpoint (only in non-production)
if (!securityConfig.isProduction) {
	app.get('/api/v1/security/status', (req, res) => {
		res.json({
			environment: securityConfig.env,
			security: {
				trustProxy: app.get('trust proxy'),
				corsOrigins: securityConfig.cors.origin ? 'configured' : 'open',
				rateLimiting: process.env.ENABLE_RATE_LIMIT === 'true',
				cspEnabled: true,
				hstsEnabled: securityConfig.hsts.maxAge > 0,
				headers: Object.keys(securityConfig.headers)
			}
		});
	});
}

// 404 handler
app.use((req, res) => {
	res.status(404).json({
		success: false,
		error: {
			code: 'ENDPOINT_NOT_FOUND',
			message: `The endpoint ${req.method} ${req.path} does not exist`
		}
	});
});

// Apply audit error middleware before main error handler
app.use(auditErrorMiddleware);

// Error handler
app.use((err, req, res, next) => {
	console.error('Unhandled error:', err);

	if (err.type === 'entity.too.large') {
		return res.status(413).json({
			success: false,
			error: {
				code: 'PAYLOAD_TOO_LARGE',
				message: 'Request payload is too large. Maximum size is 10MB.'
			}
		});
	}

	res.status(500).json({
		success: false,
		error: {
			code: 'INTERNAL_SERVER_ERROR',
			message: 'An unexpected error occurred',
			details: process.env.NODE_ENV === 'development' ? err.message : undefined
		}
	});
});

// Start server
app.listen(PORT, () => {
	console.log(
		'═══════════════════════════════════════════════════════════════'
	);
	console.log(`Task Master API (Database Version) running on port ${PORT}`);
	console.log(`Environment: ${securityConfig.env}`);
	console.log(`Supabase URL: ${process.env.SUPABASE_URL}`);
	console.log(
		'═══════════════════════════════════════════════════════════════'
	);
	console.log('Security Configuration:');
	console.log(
		`  • CORS: ${securityConfig.cors.origin ? 'Restricted' : 'Open'}`
	);
	console.log(`  • CSP: Enabled with nonce support`);
	console.log(
		`  • HSTS: ${securityConfig.hsts.maxAge > 0 ? 'Enabled' : 'Disabled'}`
	);
	console.log(
		`  • Rate Limiting: ${process.env.ENABLE_RATE_LIMIT === 'true' ? 'Enabled' : 'Disabled'}`
	);
	console.log(`  • Trust Proxy: ${app.get('trust proxy') || 'Disabled'}`);
	console.log(`  • Security Headers: Enhanced`);
	console.log(
		'═══════════════════════════════════════════════════════════════'
	);

	if (!securityConfig.isProduction) {
		console.log(
			`Security status available at: http://localhost:${PORT}/api/v1/security/status`
		);
	}
});
