# Security Implementation Guide

## Overview

This document outlines the comprehensive security measures implemented in the Task Master API, including rate limiting, brute force protection, and various security features to protect against common attacks.

## Rate Limiting

### Configuration

The API implements multiple layers of rate limiting based on endpoint sensitivity:

1. **Authentication Endpoints** (`/api/v1/auth/*`)

   - Limit: 5 requests per 15 minutes
   - Applies to: login, signup, password reset
   - Purpose: Prevent brute force attacks

2. **Password Reset Endpoints**

   - Limit: 3 requests per hour
   - Purpose: Prevent abuse of password reset functionality

3. **General API Endpoints**

   - Limit: 60 requests per minute
   - Purpose: Prevent API abuse while allowing normal usage

4. **Read Operations**

   - Limit: 100 requests per minute
   - Purpose: Allow higher throughput for read-heavy operations

5. **Static Assets**
   - Limit: 200 requests per minute
   - Purpose: Allow fast loading of static resources

### Implementation Details

- Uses Redis for distributed rate limiting (falls back to memory store)
- IP-based limiting for unauthenticated requests
- User ID-based limiting for authenticated requests
- Custom key generation for flexible limiting strategies

## Brute Force Protection

### Features

1. **Failed Login Tracking**

   - Tracks all login attempts (success/failure)
   - Stores IP address, user agent, and timestamp
   - Automatic cleanup of old records (30 days for cleared, 90 days for all)

2. **Progressive Delays**

   - < 3 attempts: No delay
   - 3-4 attempts: 2 second delay
   - 5-6 attempts: 5 second delay
   - 7-9 attempts: 10 second delay
   - 10+ attempts: Exponential backoff up to 60 seconds

3. **Account Lockout**

   - Locks account after 5 failed attempts within 30 minutes
   - Lock duration: 30 minutes (configurable)
   - Tracks lock reason and expiration time
   - Automatic unlock after expiration

4. **IP Blocking**
   - Blocks IP after excessive failed attempts (20+ in 1 hour)
   - Block duration: 24 hours (configurable)
   - Severity levels: low, medium, high, critical
   - Manual override capability for admins

## Security Features

### Password Security

1. **Password Strength Requirements**

   - Minimum 8 characters
   - Must contain uppercase letter
   - Must contain lowercase letter
   - Must contain number
   - Must contain special character

2. **Password Strength Scoring**

   - Scores from 0-8 based on complexity
   - Labels: very weak, weak, fair, good, strong, very strong, excellent
   - Real-time feedback during registration

3. **Secure Password Storage**
   - Uses bcrypt with 12 salt rounds
   - Never stores plain text passwords
   - Secure password comparison

### Suspicious Activity Detection

1. **Pattern Recognition**

   - Multiple login attempts from different IPs
   - Rapid-fire attempts (< 1 second between attempts)
   - Unusual geographic patterns (when implemented)

2. **Automated Responses**
   - CAPTCHA requirement after suspicious patterns
   - Security alerts for admin review
   - Automatic IP blocking for severe violations

### CAPTCHA Integration

1. **Trigger Conditions**

   - After 3+ failed login attempts
   - When suspicious activity is detected
   - For password reset requests from flagged IPs

2. **Implementation**
   - Prepared for reCAPTCHA, hCaptcha, or similar services
   - Token validation on server-side
   - Expiring challenge tokens

## Database Schema

### Security Tables

1. **login_attempts**

   - Tracks all authentication attempts
   - Indexes for performance on common queries
   - Automatic archival of old data

2. **account_locks**

   - Manages temporary account lockouts
   - Tracks lock reason and duration
   - Support for manual admin locks

3. **security_blocks**

   - IP and identifier blocking
   - Flexible blocking types (IP, email, user_id, fingerprint)
   - Metadata storage for additional context

4. **security_alerts**

   - Suspicious activity tracking
   - Admin review workflow
   - Action taken documentation

5. **rate_limit_overrides**

   - Custom rate limits per user/IP
   - Endpoint-specific overrides
   - Temporary or permanent adjustments

6. **captcha_challenges**
   - CAPTCHA token management
   - Challenge expiration tracking
   - Verification status

## Security Best Practices

### Input Validation

1. **SQL Injection Prevention**

   - Parameterized queries via Supabase
   - Input sanitization for extra safety
   - Removal of SQL comment patterns

2. **XSS Prevention**

   - Helmet.js for security headers
   - Input validation and sanitization
   - Content-Type enforcement

3. **CSRF Protection**
   - Token generation and validation
   - SameSite cookie attributes
   - Origin validation

### API Security

1. **CORS Configuration**

   - Restricted origins in production
   - Credential support configuration
   - Method whitelisting

2. **Request Size Limits**

   - 10MB maximum payload size
   - Prevents memory exhaustion attacks
   - Clear error messages for oversized requests

3. **Security Headers**
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - X-XSS-Protection: 1; mode=block
   - Strict-Transport-Security (HTTPS only)

## Monitoring and Alerts

### Real-time Monitoring

1. **Active Threats View**

   ```sql
   SELECT * FROM active_security_threats;
   ```

2. **Login Statistics**
   ```sql
   SELECT * FROM login_attempt_stats;
   ```

### Cleanup Jobs

1. **Login Attempts Cleanup**

   - Runs daily
   - Archives suspicious patterns
   - Removes old data

2. **Expired Blocks Cleanup**
   - Runs hourly
   - Deactivates expired blocks
   - Updates lock statuses

## Configuration

### Environment Variables

```env
# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Rate Limiting
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_AUTH_WINDOW=900000
RATE_LIMIT_API_MAX=60
RATE_LIMIT_API_WINDOW=60000

# Security
BCRYPT_ROUNDS=12
LOCKOUT_DURATION=1800000
MAX_LOGIN_ATTEMPTS=5
```

### Testing

Run security tests:

```bash
npm test tests/integration/security-rate-limiting.test.js
```

## Future Enhancements

1. **Geographic Anomaly Detection**

   - Track login locations
   - Alert on impossible travel scenarios
   - Country-based restrictions

2. **Device Fingerprinting**

   - Track device characteristics
   - Alert on new device usage
   - Trust known devices

3. **Two-Factor Authentication**

   - TOTP support
   - SMS verification
   - Backup codes

4. **Advanced CAPTCHA**
   - Invisible reCAPTCHA
   - Risk-based challenges
   - Alternative accessibility options

## Security Incident Response

1. **Detection**

   - Monitor security_alerts table
   - Set up automated notifications
   - Regular security audits

2. **Response**

   - Immediate IP/account blocking
   - User notification system
   - Incident documentation

3. **Recovery**
   - Account unlock procedures
   - Password reset workflows
   - User communication templates
