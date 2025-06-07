import express from 'express';
import rateLimit from 'express-rate-limit';
import { auditLogger, logSecurityEvent, AUDIT_EVENTS, RISK_LEVELS } from '../services/auditLog.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
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
 * GET /api/v1/audit/logs
 * Get audit logs with filtering and pagination
 * Requires admin role
 */
router.get('/logs', 
  authenticateToken, 
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
router.get('/statistics',
  authenticateToken,
  requireRole(['admin']),
  logAuditAccess,
  async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        organizationId
      } = req.query;

      // Default to last 30 days if no dates provided
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
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
router.get('/security-events',
  authenticateToken,
  requireRole(['admin']),
  logAuditAccess,
  async (req, res) => {
    try {
      const {
        limit = 100,
        organizationId
      } = req.query;

      const limitNum = Math.min(1000, Math.max(1, parseInt(limit)));

      let query = supabase
        .from('recent_security_events')
        .select('*')
        .limit(limitNum);

      // Organization filtering
      if (req.user.role === 'admin' && req.user.organizationId) {
        query = query.eq('organization_id', organizationId || req.user.organizationId);
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
router.get('/user-activity',
  authenticateToken,
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
        query = query.eq('organization_id', organizationId || req.user.organizationId);
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
router.get('/export',
  exportRateLimit,
  authenticateToken,
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
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
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
router.get('/real-time/events',
  authenticateToken,
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
router.post('/cleanup',
  authenticateToken,
  requireRole(['system_admin']),
  async (req, res) => {
    try {
      const { retentionDays = 365 } = req.body;

      // Validate retention days
      if (retentionDays < 30 || retentionDays > 2555) { // Max ~7 years
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
router.get('/dashboard',
  authenticateToken,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { organizationId } = req.query;
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Build organization filter
      const orgFilter = req.user.role === 'admin' && req.user.organizationId 
        ? organizationId || req.user.organizationId 
        : organizationId;

      // Get statistics for different time periods
      const [
        last24HourStats,
        last7DayStats,
        securityEvents,
        userActivity
      ] = await Promise.all([
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