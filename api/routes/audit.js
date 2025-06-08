import express from 'express';
import rateLimit from 'express-rate-limit';
import {
	auditLogger,
	logSecurityEvent,
	AUDIT_EVENTS,
	RISK_LEVELS
} from '../services/auditLog.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { supabase } from '../db/supabase.js';

const router = express.Router();

// Rate limiting for audit endpoints (stricter limits for security)
const auditRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per windowMs
	message: {
		success: false,
		error: {
			code: 'RATE_LIMIT_EXCEEDED',
			message: 'Too many audit requests. Please try again later.'
		}
	},
	standardHeaders: true,
	legacyHeaders: false
});

// Export rate limit for audit endpoints
const exportRateLimit = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 5, // Limit exports to 5 per hour
	message: {
		success: false,
		error: {
			code: 'EXPORT_RATE_LIMIT_EXCEEDED',
			message: 'Too many export requests. Please try again later.'
		}
	}
});

// Apply rate limiting to all audit routes
router.use(auditRateLimit);

// Middleware to log audit access
const logAuditAccess = (req, res, next) => {
	logSecurityEvent(AUDIT_EVENTS.SECURITY_DATA_EXPORT, {
		description: `Audit log access: ${req.method} ${req.path}`,
		userId: req.user?.id,
		organizationId: req.user?.organizationId,
		ipAddress: req.ip,
		userAgent: req.get('User-Agent'),
		requestMethod: req.method,
		requestPath: req.path,
		metadata: {
			queryParams: req.query,
			accessType: 'audit_log_access'
		}
	});
	next();
};

/**
 * GET /api/v1/audit/events
 * Retrieve audit events with filtering and pagination
 */
router.get(
	'/events/:organizationId',
	authMiddleware,
	requireRole('admin'),
	async (req, res) => {
		try {
			const { organizationId } = req.params;
			const {
				start_date,
				end_date,
				event_type,
				user_id,
				risk_level,
				limit = 50,
				offset = 0
			} = req.query;

			// Build query filters
			let query = supabase
				.from('audit_logs')
				.select(
					`
          id,
          event_type,
          description,
          user_id,
          organization_id,
          risk_level,
          ip_address,
          user_agent,
          metadata,
          created_at,
          user:profiles (
            id,
            full_name,
            email
          )
        `
				)
				.eq('organization_id', organizationId)
				.order('created_at', { ascending: false })
				.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

			// Apply date filters
			if (start_date) {
				query = query.gte('created_at', start_date);
			}
			if (end_date) {
				query = query.lte('created_at', end_date);
			}

			// Apply other filters
			if (event_type) {
				query = query.eq('event_type', event_type);
			}
			if (user_id) {
				query = query.eq('user_id', user_id);
			}
			if (risk_level) {
				query = query.eq('risk_level', risk_level);
			}

			const { data: events, error, count } = await query;

			if (error) {
				console.error('Failed to fetch audit events:', error);
				return res.status(500).json({
					success: false,
					error: {
						code: 'DATABASE_ERROR',
						message: 'Failed to retrieve audit events'
					}
				});
			}

			// Get total count for pagination
			const { count: totalCount } = await supabase
				.from('audit_logs')
				.select('*', { count: 'exact', head: true })
				.eq('organization_id', organizationId);

			res.json({
				success: true,
				data: {
					events,
					pagination: {
						total: totalCount || 0,
						limit: parseInt(limit),
						offset: parseInt(offset),
						hasMore: parseInt(offset) + parseInt(limit) < (totalCount || 0)
					}
				}
			});
		} catch (error) {
			console.error('Audit events retrieval error:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'An error occurred while retrieving audit events'
				}
			});
		}
	}
);

/**
 * GET /api/v1/audit/summary/:organizationId
 * Get audit summary statistics
 */
router.get(
	'/summary/:organizationId',
	authMiddleware,
	requireRole('admin'),
	async (req, res) => {
		try {
			const { organizationId } = req.params;
			const { days = 30 } = req.query;

			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

			// Get event type distribution
			const { data: eventTypes } = await supabase
				.from('audit_logs')
				.select('event_type')
				.eq('organization_id', organizationId)
				.gte('created_at', cutoffDate.toISOString());

			// Get risk level distribution
			const { data: riskLevels } = await supabase
				.from('audit_logs')
				.select('risk_level')
				.eq('organization_id', organizationId)
				.gte('created_at', cutoffDate.toISOString());

			// Get daily activity counts
			const { data: dailyActivity } = await supabase.rpc(
				'get_daily_audit_counts',
				{
					org_id: organizationId,
					start_date: cutoffDate.toISOString(),
					end_date: new Date().toISOString()
				}
			);

			// Process statistics
			const eventTypeStats = {};
			eventTypes?.forEach((event) => {
				eventTypeStats[event.event_type] =
					(eventTypeStats[event.event_type] || 0) + 1;
			});

			const riskLevelStats = {};
			riskLevels?.forEach((event) => {
				riskLevelStats[event.risk_level] =
					(riskLevelStats[event.risk_level] || 0) + 1;
			});

			res.json({
				success: true,
				data: {
					period: `${days} days`,
					totalEvents: eventTypes?.length || 0,
					eventTypeDistribution: eventTypeStats,
					riskLevelDistribution: riskLevelStats,
					dailyActivity: dailyActivity || []
				}
			});
		} catch (error) {
			console.error('Audit summary error:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'An error occurred while generating audit summary'
				}
			});
		}
	}
);

/**
 * GET /api/v1/audit/export/:organizationId
 * Export audit events as CSV
 */
router.get(
	'/export/:organizationId',
	authMiddleware,
	requireRole('admin'),
	async (req, res) => {
		try {
			const { organizationId } = req.params;
			const { start_date, end_date, format = 'csv' } = req.query;

			// Build export query
			let query = supabase
				.from('audit_logs')
				.select(
					`
          id,
          event_type,
          description,
          user_id,
          risk_level,
          ip_address,
          user_agent,
          created_at,
          user:profiles (
            full_name,
            email
          )
        `
				)
				.eq('organization_id', organizationId)
				.order('created_at', { ascending: false });

			if (start_date) {
				query = query.gte('created_at', start_date);
			}
			if (end_date) {
				query = query.lte('created_at', end_date);
			}

			const { data: events, error } = await query;

			if (error) {
				return res.status(500).json({
					success: false,
					error: {
						code: 'EXPORT_ERROR',
						message: 'Failed to export audit events'
					}
				});
			}

			if (format === 'csv') {
				// Generate CSV
				const csvHeader =
					'ID,Event Type,Description,User,Email,Risk Level,IP Address,Created At\n';
				const csvRows = events
					.map((event) =>
						[
							event.id,
							event.event_type,
							`"${event.description.replace(/"/g, '""')}"`,
							event.user?.full_name || 'Unknown',
							event.user?.email || 'Unknown',
							event.risk_level,
							event.ip_address,
							event.created_at
						].join(',')
					)
					.join('\n');

				const csv = csvHeader + csvRows;

				res.setHeader('Content-Type', 'text/csv');
				res.setHeader(
					'Content-Disposition',
					`attachment; filename="audit-log-${organizationId}-${new Date().toISOString().split('T')[0]}.csv"`
				);
				res.send(csv);
			} else {
				// Return JSON
				res.json({
					success: true,
					data: { events }
				});
			}
		} catch (error) {
			console.error('Audit export error:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'An error occurred while exporting audit events'
				}
			});
		}
	}
);

/**
 * GET /api/v1/audit/user-activity/:organizationId/:userId
 * Get specific user's activity history
 */
router.get(
	'/user-activity/:organizationId/:userId',
	authMiddleware,
	requireRole('admin'),
	async (req, res) => {
		try {
			const { organizationId, userId } = req.params;
			const { limit = 50, offset = 0 } = req.query;

			const { data: activities, error } = await supabase
				.from('audit_logs')
				.select(
					`
          id,
          event_type,
          description,
          risk_level,
          ip_address,
          user_agent,
          metadata,
          created_at
        `
				)
				.eq('organization_id', organizationId)
				.eq('user_id', userId)
				.order('created_at', { ascending: false })
				.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

			if (error) {
				return res.status(500).json({
					success: false,
					error: {
						code: 'DATABASE_ERROR',
						message: 'Failed to retrieve user activity'
					}
				});
			}

			// Get user info
			const { data: user } = await supabase
				.from('profiles')
				.select('id, full_name, email')
				.eq('id', userId)
				.single();

			res.json({
				success: true,
				data: {
					user,
					activities,
					pagination: {
						limit: parseInt(limit),
						offset: parseInt(offset)
					}
				}
			});
		} catch (error) {
			console.error('User activity error:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'An error occurred while retrieving user activity'
				}
			});
		}
	}
);

/**
 * GET /api/v1/audit/security-alerts/:organizationId
 * Get security-related alerts and incidents
 */
router.get(
	'/security-alerts/:organizationId',
	authMiddleware,
	requireRole('admin'),
	async (req, res) => {
		try {
			const { organizationId } = req.params;
			const {
				status = 'all',
				severity = 'all',
				limit = 25,
				offset = 0
			} = req.query;

			let query = supabase
				.from('audit_logs')
				.select(
					`
          id,
          event_type,
          description,
          user_id,
          risk_level,
          ip_address,
          metadata,
          created_at,
          user:profiles (
            full_name,
            email
          )
        `
				)
				.eq('organization_id', organizationId)
				.in('risk_level', ['high', 'critical'])
				.order('created_at', { ascending: false })
				.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

			if (severity !== 'all') {
				query = query.eq('risk_level', severity);
			}

			const { data: alerts, error } = await query;

			if (error) {
				return res.status(500).json({
					success: false,
					error: {
						code: 'DATABASE_ERROR',
						message: 'Failed to retrieve security alerts'
					}
				});
			}

			res.json({
				success: true,
				data: { alerts }
			});
		} catch (error) {
			console.error('Security alerts error:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'An error occurred while retrieving security alerts'
				}
			});
		}
	}
);

/**
 * POST /api/v1/audit/mark-reviewed/:organizationId/:eventId
 * Mark an audit event as reviewed
 */
router.post(
	'/mark-reviewed/:organizationId/:eventId',
	authMiddleware,
	requireRole('admin'),
	async (req, res) => {
		try {
			const { organizationId, eventId } = req.params;
			const { notes } = req.body;

			const { error } = await supabase
				.from('audit_logs')
				.update({
					reviewed: true,
					reviewed_by: req.user.id,
					reviewed_at: new Date().toISOString(),
					review_notes: notes
				})
				.eq('id', eventId)
				.eq('organization_id', organizationId);

			if (error) {
				return res.status(500).json({
					success: false,
					error: {
						code: 'UPDATE_ERROR',
						message: 'Failed to mark event as reviewed'
					}
				});
			}

			res.json({
				success: true,
				data: {
					message: 'Event marked as reviewed successfully'
				}
			});
		} catch (error) {
			console.error('Mark reviewed error:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'INTERNAL_ERROR',
					message: 'An error occurred while updating event status'
				}
			});
		}
	}
);

/**
 * GET /api/v1/audit/logs
 * Get audit logs with filtering and pagination
 * Requires admin role
 */
router.get(
	'/logs',
	authMiddleware,
	requireRole(['admin']),
	logAuditAccess,
	async (req, res) => {
		try {
			const {
				page = 1,
				limit = 50,
				startDate,
				endDate,
				eventType,
				userId,
				riskLevel,
				resourceType,
				search,
				ipAddress,
				organizationId
			} = req.query;

			// Validate parameters
			const pageNum = Math.max(1, parseInt(page));
			const limitNum = Math.min(1000, Math.max(1, parseInt(limit)));

			// Build filters
			const filters = {
				page: pageNum,
				limit: limitNum
			};

			// Only organization admins can see their org's logs
			// System admins can see all logs
			if (req.user.role === 'admin' && req.user.organizationId) {
				filters.organizationId = organizationId || req.user.organizationId;
			} else if (organizationId) {
				filters.organizationId = organizationId;
			}

			if (startDate) {
				try {
					filters.startDate = new Date(startDate).toISOString();
				} catch (e) {
					return res.status(400).json({
						success: false,
						error: {
							code: 'INVALID_START_DATE',
							message: 'Invalid start date format'
						}
					});
				}
			}

			if (endDate) {
				try {
					filters.endDate = new Date(endDate).toISOString();
				} catch (e) {
					return res.status(400).json({
						success: false,
						error: {
							code: 'INVALID_END_DATE',
							message: 'Invalid end date format'
						}
					});
				}
			}

			if (eventType) filters.eventType = eventType;
			if (userId) filters.userId = userId;
			if (riskLevel) filters.riskLevel = riskLevel;
			if (resourceType) filters.resourceType = resourceType;
			if (search) filters.search = search;
			if (ipAddress) filters.ipAddress = ipAddress;

			const result = await auditLogger.queryLogs(filters);

			res.json({
				success: true,
				data: result.data,
				pagination: result.pagination,
				filters: filters
			});
		} catch (error) {
			console.error('Failed to fetch audit logs:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'AUDIT_QUERY_FAILED',
					message: 'Failed to retrieve audit logs'
				}
			});
		}
	}
);

/**
 * GET /api/v1/audit/statistics
 * Get audit log statistics
 * Requires admin role
 */
router.get(
	'/statistics',
	authMiddleware,
	requireRole(['admin']),
	logAuditAccess,
	async (req, res) => {
		try {
			const { startDate, endDate, organizationId } = req.query;

			// Default to last 30 days if no dates provided
			const start = startDate
				? new Date(startDate)
				: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
			const end = endDate ? new Date(endDate) : new Date();

			const filters = {
				startDate: start.toISOString(),
				endDate: end.toISOString()
			};

			// Organization filtering based on user role
			if (req.user.role === 'admin' && req.user.organizationId) {
				filters.organizationId = organizationId || req.user.organizationId;
			} else if (organizationId) {
				filters.organizationId = organizationId;
			}

			const statistics = await auditLogger.getStatistics(filters);

			res.json({
				success: true,
				data: statistics,
				period: {
					startDate: filters.startDate,
					endDate: filters.endDate,
					organizationId: filters.organizationId
				}
			});
		} catch (error) {
			console.error('Failed to fetch audit statistics:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'AUDIT_STATISTICS_FAILED',
					message: 'Failed to retrieve audit statistics'
				}
			});
		}
	}
);

/**
 * GET /api/v1/audit/security-events
 * Get recent security events
 * Requires admin role
 */
router.get(
	'/security-events',
	authMiddleware,
	requireRole(['admin']),
	logAuditAccess,
	async (req, res) => {
		try {
			const { limit = 100, organizationId } = req.query;

			const limitNum = Math.min(1000, Math.max(1, parseInt(limit)));

			let query = supabase
				.from('recent_security_events')
				.select('*')
				.limit(limitNum);

			// Organization filtering
			if (req.user.role === 'admin' && req.user.organizationId) {
				query = query.eq(
					'organization_id',
					organizationId || req.user.organizationId
				);
			} else if (organizationId) {
				query = query.eq('organization_id', organizationId);
			}

			const { data, error } = await query;

			if (error) {
				throw new Error(`Database query failed: ${error.message}`);
			}

			res.json({
				success: true,
				data: data || [],
				count: data?.length || 0
			});
		} catch (error) {
			console.error('Failed to fetch security events:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'SECURITY_EVENTS_FAILED',
					message: 'Failed to retrieve security events'
				}
			});
		}
	}
);

/**
 * GET /api/v1/audit/user-activity
 * Get user activity summary
 * Requires admin role
 */
router.get(
	'/user-activity',
	authMiddleware,
	requireRole(['admin']),
	logAuditAccess,
	async (req, res) => {
		try {
			const { organizationId, userId } = req.query;

			let query = supabase
				.from('user_activity_summary')
				.select('*')
				.order('last_activity', { ascending: false });

			// Organization filtering
			if (req.user.role === 'admin' && req.user.organizationId) {
				query = query.eq(
					'organization_id',
					organizationId || req.user.organizationId
				);
			} else if (organizationId) {
				query = query.eq('organization_id', organizationId);
			}

			// User filtering
			if (userId) {
				query = query.eq('user_id', userId);
			}

			const { data, error } = await query;

			if (error) {
				throw new Error(`Database query failed: ${error.message}`);
			}

			res.json({
				success: true,
				data: data || [],
				count: data?.length || 0
			});
		} catch (error) {
			console.error('Failed to fetch user activity:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'USER_ACTIVITY_FAILED',
					message: 'Failed to retrieve user activity'
				}
			});
		}
	}
);

/**
 * GET /api/v1/audit/export
 * Export audit logs to CSV
 * Requires admin role and additional rate limiting
 */
router.get(
	'/export',
	exportRateLimit,
	authMiddleware,
	requireRole(['admin']),
	logAuditAccess,
	async (req, res) => {
		try {
			const {
				startDate,
				endDate,
				eventType,
				riskLevel,
				organizationId,
				format = 'csv'
			} = req.query;

			// Validate format
			if (format !== 'csv') {
				return res.status(400).json({
					success: false,
					error: {
						code: 'INVALID_FORMAT',
						message: 'Only CSV format is currently supported'
					}
				});
			}

			// Build filters for export
			const filters = {
				limit: 10000 // Large export limit
			};

			// Organization filtering
			if (req.user.role === 'admin' && req.user.organizationId) {
				filters.organizationId = organizationId || req.user.organizationId;
			} else if (organizationId) {
				filters.organizationId = organizationId;
			}

			if (startDate) filters.startDate = new Date(startDate).toISOString();
			if (endDate) filters.endDate = new Date(endDate).toISOString();
			if (eventType) filters.eventType = eventType;
			if (riskLevel) filters.riskLevel = riskLevel;

			// Log the export attempt
			await logSecurityEvent(AUDIT_EVENTS.SECURITY_DATA_EXPORT, {
				description: 'Audit log export requested',
				userId: req.user.id,
				organizationId: req.user.organizationId,
				ipAddress: req.ip,
				userAgent: req.get('User-Agent'),
				riskLevel: RISK_LEVELS.HIGH,
				metadata: {
					exportFilters: filters,
					format: format
				}
			});

			const csvContent = await auditLogger.exportLogs(filters);

			// Set response headers for file download
			const timestamp = new Date().toISOString().split('T')[0];
			const filename = `audit_logs_${timestamp}.csv`;

			res.setHeader('Content-Type', 'text/csv');
			res.setHeader(
				'Content-Disposition',
				`attachment; filename="${filename}"`
			);
			res.setHeader('Cache-Control', 'no-cache');

			res.send(csvContent);
		} catch (error) {
			console.error('Failed to export audit logs:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'EXPORT_FAILED',
					message: 'Failed to export audit logs'
				}
			});
		}
	}
);

/**
 * GET /api/v1/audit/real-time/events
 * Get real-time audit events (last 5 minutes)
 * Requires admin role
 */
router.get(
	'/real-time/events',
	authMiddleware,
	requireRole(['admin']),
	async (req, res) => {
		try {
			const { organizationId, riskLevel } = req.query;
			const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

			const filters = {
				startDate: fiveMinutesAgo,
				limit: 100
			};

			// Organization filtering
			if (req.user.role === 'admin' && req.user.organizationId) {
				filters.organizationId = organizationId || req.user.organizationId;
			} else if (organizationId) {
				filters.organizationId = organizationId;
			}

			if (riskLevel) {
				filters.riskLevel = riskLevel;
			}

			const result = await auditLogger.queryLogs(filters);

			res.json({
				success: true,
				data: result.data,
				count: result.data.length,
				timestamp: new Date().toISOString()
			});
		} catch (error) {
			console.error('Failed to fetch real-time events:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'REALTIME_EVENTS_FAILED',
					message: 'Failed to retrieve real-time events'
				}
			});
		}
	}
);

/**
 * POST /api/v1/audit/cleanup
 * Clean up old audit logs
 * Requires system admin role
 */
router.post(
	'/cleanup',
	authMiddleware,
	requireRole(['system_admin']),
	async (req, res) => {
		try {
			const { retentionDays = 365 } = req.body;

			// Validate retention days
			if (retentionDays < 30 || retentionDays > 2555) {
				// Max ~7 years
				return res.status(400).json({
					success: false,
					error: {
						code: 'INVALID_RETENTION_PERIOD',
						message: 'Retention period must be between 30 and 2555 days'
					}
				});
			}

			// Log the cleanup attempt
			await logSecurityEvent(AUDIT_EVENTS.ADMIN_SYSTEM_MAINTENANCE, {
				description: `Audit log cleanup initiated (${retentionDays} days retention)`,
				userId: req.user.id,
				organizationId: req.user.organizationId,
				ipAddress: req.ip,
				userAgent: req.get('User-Agent'),
				riskLevel: RISK_LEVELS.HIGH,
				metadata: {
					retentionDays: retentionDays,
					operationType: 'audit_cleanup'
				}
			});

			const deletedCount = await auditLogger.cleanupOldLogs(retentionDays);

			res.json({
				success: true,
				data: {
					deletedRecords: deletedCount,
					retentionDays: retentionDays,
					cleanupDate: new Date().toISOString()
				}
			});
		} catch (error) {
			console.error('Failed to cleanup audit logs:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'CLEANUP_FAILED',
					message: 'Failed to cleanup audit logs'
				}
			});
		}
	}
);

/**
 * GET /api/v1/audit/dashboard
 * Get audit dashboard data
 * Requires admin role
 */
router.get(
	'/dashboard',
	authMiddleware,
	requireRole(['admin']),
	async (req, res) => {
		try {
			const { organizationId } = req.query;
			const now = new Date();
			const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
			const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

			// Build organization filter
			const orgFilter =
				req.user.role === 'admin' && req.user.organizationId
					? organizationId || req.user.organizationId
					: organizationId;

			// Get statistics for different time periods
			const [last24HourStats, last7DayStats, securityEvents, userActivity] =
				await Promise.all([
					auditLogger.getStatistics({
						startDate: last24Hours.toISOString(),
						endDate: now.toISOString(),
						organizationId: orgFilter
					}),
					auditLogger.getStatistics({
						startDate: last7Days.toISOString(),
						endDate: now.toISOString(),
						organizationId: orgFilter
					}),
					supabase
						.from('recent_security_events')
						.select('*')
						.eq('organization_id', orgFilter)
						.limit(10),
					supabase
						.from('user_activity_summary')
						.select('*')
						.eq('organization_id', orgFilter)
						.order('total_actions', { ascending: false })
						.limit(10)
				]);

			res.json({
				success: true,
				data: {
					summary: {
						last24Hours: last24HourStats,
						last7Days: last7DayStats
					},
					recentSecurityEvents: securityEvents.data || [],
					topUsers: userActivity.data || [],
					lastUpdated: now.toISOString()
				}
			});
		} catch (error) {
			console.error('Failed to fetch audit dashboard:', error);
			res.status(500).json({
				success: false,
				error: {
					code: 'DASHBOARD_FAILED',
					message: 'Failed to retrieve audit dashboard data'
				}
			});
		}
	}
);

export default router;
