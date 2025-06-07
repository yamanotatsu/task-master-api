import { supabase } from '../db/supabase.js';

/**
 * Comprehensive audit logging service for Task Master API
 * Provides structured logging for authentication, security, and data operations
 */

// Audit event types
export const AUDIT_EVENTS = {
  // Authentication events
  AUTH_LOGIN_SUCCESS: 'auth.login.success',
  AUTH_LOGIN_FAILED: 'auth.login.failed',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_SIGNUP: 'auth.signup',
  AUTH_PASSWORD_RESET_REQUEST: 'auth.password_reset.request',
  AUTH_PASSWORD_RESET_SUCCESS: 'auth.password_reset.success',
  AUTH_PASSWORD_CHANGE: 'auth.password.change',
  AUTH_TOKEN_REFRESH: 'auth.token.refresh',
  AUTH_SESSION_EXPIRED: 'auth.session.expired',

  // Organization events
  ORG_CREATE: 'organization.create',
  ORG_UPDATE: 'organization.update',
  ORG_DELETE: 'organization.delete',
  ORG_MEMBER_ADD: 'organization.member.add',
  ORG_MEMBER_REMOVE: 'organization.member.remove',
  ORG_MEMBER_ROLE_CHANGE: 'organization.member.role_change',
  ORG_INVITATION_SEND: 'organization.invitation.send',
  ORG_INVITATION_ACCEPT: 'organization.invitation.accept',
  ORG_INVITATION_DECLINE: 'organization.invitation.decline',

  // Project events
  PROJECT_CREATE: 'project.create',
  PROJECT_UPDATE: 'project.update',
  PROJECT_DELETE: 'project.delete',
  PROJECT_ACCESS: 'project.access',

  // Task events
  TASK_CREATE: 'task.create',
  TASK_UPDATE: 'task.update',
  TASK_DELETE: 'task.delete',
  TASK_STATUS_CHANGE: 'task.status.change',
  TASK_ASSIGN: 'task.assign',
  TASK_ACCESS: 'task.access',

  // Security events
  SECURITY_RATE_LIMIT_EXCEEDED: 'security.rate_limit.exceeded',
  SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',
  SECURITY_UNAUTHORIZED_ACCESS: 'security.unauthorized_access',
  SECURITY_PRIVILEGE_ESCALATION: 'security.privilege_escalation',
  SECURITY_DATA_EXPORT: 'security.data.export',
  SECURITY_BULK_OPERATION: 'security.bulk_operation',

  // Data access events
  DATA_EXPORT: 'data.export',
  DATA_IMPORT: 'data.import',
  DATA_BULK_DELETE: 'data.bulk_delete',
  DATA_SENSITIVE_ACCESS: 'data.sensitive_access',

  // Admin events
  ADMIN_CONFIG_CHANGE: 'admin.config.change',
  ADMIN_USER_IMPERSONATION: 'admin.user.impersonation',
  ADMIN_SYSTEM_MAINTENANCE: 'admin.system.maintenance'
};

// Risk levels for different operations
export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Data sensitivity classifications
export const DATA_SENSITIVITY = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  CONFIDENTIAL: 'confidential',
  RESTRICTED: 'restricted'
};

/**
 * Main audit logging service class
 */
export class AuditLogService {
  constructor() {
    this.batchSize = 100;
    this.batchTimeout = 5000; // 5 seconds
    this.pendingLogs = [];
    this.batchTimer = null;
  }

  /**
   * Log an audit event with comprehensive metadata
   * @param {Object} eventData - The audit event data
   */
  async logEvent(eventData) {
    try {
      const auditLog = this.buildAuditLog(eventData);
      
      // For high-risk events, log immediately
      if (eventData.riskLevel === RISK_LEVELS.HIGH || eventData.riskLevel === RISK_LEVELS.CRITICAL) {
        await this.writeLogToDB(auditLog);
      } else {
        // Batch low/medium risk events for performance
        this.addToBatch(auditLog);
      }

      // Also log to console for immediate visibility
      this.logToConsole(auditLog);

    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Fallback to console logging
      console.log('AUDIT_FALLBACK:', JSON.stringify(eventData));
    }
  }

  /**
   * Build a comprehensive audit log entry
   * @param {Object} eventData - Raw event data
   * @returns {Object} Structured audit log entry
   */
  buildAuditLog(eventData) {
    return {
      id: crypto.randomUUID(),
      event_type: eventData.eventType,
      user_id: eventData.userId || null,
      session_id: eventData.sessionId || null,
      organization_id: eventData.organizationId || null,
      resource_type: eventData.resourceType || null,
      resource_id: eventData.resourceId || null,
      action: eventData.action,
      description: eventData.description || '',
      
      // Request context
      ip_address: eventData.ipAddress || null,
      user_agent: eventData.userAgent || null,
      request_id: eventData.requestId || null,
      request_method: eventData.requestMethod || null,
      request_path: eventData.requestPath || null,
      request_size: eventData.requestSize || null,
      response_status: eventData.responseStatus || null,
      response_size: eventData.responseSize || null,
      duration_ms: eventData.durationMs || null,

      // Data changes
      old_values: eventData.oldValues || null,
      new_values: eventData.newValues || null,
      affected_records: eventData.affectedRecords || 1,

      // Security and risk assessment
      risk_level: eventData.riskLevel || RISK_LEVELS.LOW,
      data_sensitivity: eventData.dataSensitivity || DATA_SENSITIVITY.INTERNAL,
      compliance_tags: eventData.complianceTags || [],

      // Geolocation and device info
      country: eventData.country || null,
      region: eventData.region || null,
      device_type: eventData.deviceType || null,
      browser: eventData.browser || null,

      // Additional metadata
      metadata: eventData.metadata || {},
      tags: eventData.tags || [],
      
      created_at: new Date().toISOString()
    };
  }

  /**
   * Add log to batch for bulk processing
   * @param {Object} auditLog - Structured audit log
   */
  addToBatch(auditLog) {
    this.pendingLogs.push(auditLog);

    if (this.pendingLogs.length >= this.batchSize) {
      this.flushBatch();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch();
      }, this.batchTimeout);
    }
  }

  /**
   * Flush pending logs to database
   */
  async flushBatch() {
    if (this.pendingLogs.length === 0) return;

    const logsToWrite = [...this.pendingLogs];
    this.pendingLogs = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      await this.writeBatchToDB(logsToWrite);
    } catch (error) {
      console.error('Failed to flush audit log batch:', error);
      // Log to console as fallback
      logsToWrite.forEach(log => this.logToConsole(log));
    }
  }

  /**
   * Write a single audit log to database
   * @param {Object} auditLog - Audit log entry
   */
  async writeLogToDB(auditLog) {
    const { error } = await supabase
      .from('audit_logs_enhanced')
      .insert([auditLog]);

    if (error) {
      throw new Error(`Database insert failed: ${error.message}`);
    }
  }

  /**
   * Write multiple audit logs to database
   * @param {Array} auditLogs - Array of audit log entries
   */
  async writeBatchToDB(auditLogs) {
    const { error } = await supabase
      .from('audit_logs_enhanced')
      .insert(auditLogs);

    if (error) {
      throw new Error(`Batch database insert failed: ${error.message}`);
    }
  }

  /**
   * Log to console with structured format
   * @param {Object} auditLog - Audit log entry
   */
  logToConsole(auditLog) {
    const logLevel = this.getLogLevel(auditLog.risk_level);
    const timestamp = new Date().toISOString();
    
    const logMessage = `[${timestamp}] [${logLevel}] [AUDIT] ${auditLog.event_type} - ${auditLog.description}`;
    
    if (auditLog.risk_level === RISK_LEVELS.CRITICAL || auditLog.risk_level === RISK_LEVELS.HIGH) {
      console.error(logMessage, {
        userId: auditLog.user_id,
        resourceId: auditLog.resource_id,
        ipAddress: auditLog.ip_address,
        metadata: auditLog.metadata
      });
    } else {
      console.log(logMessage);
    }
  }

  /**
   * Get appropriate log level for console output
   * @param {string} riskLevel - Risk level of the event
   * @returns {string} Log level
   */
  getLogLevel(riskLevel) {
    switch (riskLevel) {
      case RISK_LEVELS.CRITICAL: return 'CRITICAL';
      case RISK_LEVELS.HIGH: return 'ERROR';
      case RISK_LEVELS.MEDIUM: return 'WARN';
      case RISK_LEVELS.LOW: return 'INFO';
      default: return 'INFO';
    }
  }

  /**
   * Query audit logs with filters
   * @param {Object} filters - Query filters
   * @returns {Object} Query results
   */
  async queryLogs(filters = {}) {
    let query = supabase
      .from('audit_logs_enhanced')
      .select('*');

    // Apply filters
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    if (filters.organizationId) {
      query = query.eq('organization_id', filters.organizationId);
    }
    
    if (filters.eventType) {
      query = query.eq('event_type', filters.eventType);
    }
    
    if (filters.riskLevel) {
      query = query.eq('risk_level', filters.riskLevel);
    }
    
    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType);
    }
    
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
    
    if (filters.ipAddress) {
      query = query.eq('ip_address', filters.ipAddress);
    }

    // Search in description
    if (filters.search) {
      query = query.ilike('description', `%${filters.search}%`);
    }

    // Pagination
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 1000); // Max 1000 records
    const offset = (page - 1) * limit;

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Query failed: ${error.message}`);
    }

    return {
      data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil((count || 0) / limit)
      }
    };
  }

  /**
   * Get audit statistics
   * @param {Object} filters - Time range and other filters
   * @returns {Object} Statistics summary
   */
  async getStatistics(filters = {}) {
    const startDate = filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = filters.endDate || new Date().toISOString();

    const { data, error } = await supabase
      .rpc('get_audit_statistics', {
        start_date: startDate,
        end_date: endDate,
        organization_filter: filters.organizationId || null
      });

    if (error) {
      throw new Error(`Statistics query failed: ${error.message}`);
    }

    return data[0] || {};
  }

  /**
   * Export audit logs to CSV format
   * @param {Object} filters - Export filters
   * @returns {string} CSV content
   */
  async exportLogs(filters = {}) {
    const result = await this.queryLogs({
      ...filters,
      limit: 10000 // Large export limit
    });

    const csvHeaders = [
      'Timestamp', 'Event Type', 'User ID', 'Organization ID', 'Action',
      'Description', 'IP Address', 'Risk Level', 'Resource Type', 'Resource ID'
    ];

    const csvRows = result.data.map(log => [
      log.created_at,
      log.event_type,
      log.user_id || '',
      log.organization_id || '',
      log.action,
      log.description,
      log.ip_address || '',
      log.risk_level,
      log.resource_type || '',
      log.resource_id || ''
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Clean up old audit logs based on retention policy
   * @param {number} retentionDays - Number of days to retain logs
   */
  async cleanupOldLogs(retentionDays = 365) {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('audit_logs_enhanced')
      .delete()
      .lt('created_at', cutoffDate);

    if (error) {
      throw new Error(`Cleanup failed: ${error.message}`);
    }
  }

  /**
   * Graceful shutdown - flush any pending logs
   */
  async shutdown() {
    await this.flushBatch();
  }
}

// Create singleton instance
export const auditLogger = new AuditLogService();

// Convenience methods for common audit events
export const logAuthEvent = (eventType, data) => {
  return auditLogger.logEvent({
    eventType,
    action: eventType.split('.').pop(),
    resourceType: 'authentication',
    riskLevel: eventType.includes('failed') ? RISK_LEVELS.MEDIUM : RISK_LEVELS.LOW,
    ...data
  });
};

export const logSecurityEvent = (eventType, data) => {
  return auditLogger.logEvent({
    eventType,
    action: eventType.split('.').slice(-1)[0],
    resourceType: 'security',
    riskLevel: RISK_LEVELS.HIGH,
    dataSensitivity: DATA_SENSITIVITY.CONFIDENTIAL,
    ...data
  });
};

export const logDataEvent = (eventType, data) => {
  return auditLogger.logEvent({
    eventType,
    action: eventType.split('.').pop(),
    riskLevel: RISK_LEVELS.MEDIUM,
    dataSensitivity: DATA_SENSITIVITY.INTERNAL,
    ...data
  });
};

export const logOrganizationEvent = (eventType, data) => {
  return auditLogger.logEvent({
    eventType,
    action: eventType.split('.').slice(-1)[0],
    resourceType: 'organization',
    riskLevel: RISK_LEVELS.MEDIUM,
    ...data
  });
};

// Process cleanup on exit
process.on('SIGINT', async () => {
  console.log('Shutting down audit logger...');
  await auditLogger.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down audit logger...');
  await auditLogger.shutdown();
  process.exit(0);
});