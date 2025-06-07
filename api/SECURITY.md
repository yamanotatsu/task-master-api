# Task Master API Security Configuration

This document outlines the comprehensive security configuration implemented for the Task Master API.

## Overview

The Task Master API implements a multi-layered security approach with environment-specific configurations to ensure robust protection while maintaining development flexibility.

## Security Features

### 1. Content Security Policy (CSP)

**Purpose**: Prevents XSS attacks by controlling which resources can be loaded.

**Implementation**:
- Dynamic nonce generation for inline scripts/styles
- Environment-specific directives
- CSP violation reporting
- Report-only mode for monitoring

**Configuration**: `/api/config/security.js` - `cspDirectives`

### 2. Cross-Origin Resource Sharing (CORS)

**Purpose**: Controls which origins can access the API.

**Features**:
- Environment-specific origin allowlists
- Credential support configuration
- Exposed headers for client access
- Preflight request handling

**Configuration**: `/api/config/security.js` - `corsConfig`

### 3. HTTP Strict Transport Security (HSTS)

**Purpose**: Forces HTTPS connections and prevents protocol downgrade attacks.

**Features**:
- Environment-specific configuration
- Subdomain inclusion
- Preload list support
- Disabled in development for flexibility

**Configuration**: `/api/config/security.js` - `hstsConfig`

### 4. Security Headers

**Implemented Headers**:
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-XSS-Protection: 0` - Disabled (modern browsers have better protection)
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information
- `X-Permitted-Cross-Domain-Policies: none` - Blocks Flash/PDF policies
- `Cross-Origin-Embedder-Policy` - Controls cross-origin embedding
- `Cross-Origin-Opener-Policy` - Controls cross-origin window access
- `Origin-Agent-Cluster` - Isolates origins in browser processes

### 5. Permissions Policy (Feature Policy)

**Purpose**: Controls browser features and APIs available to the page.

**Restricted Features**:
- Geolocation, camera, microphone access
- Accelerometer, gyroscope, magnetometer
- Payment, USB, Bluetooth APIs
- Autoplay, fullscreen, picture-in-picture

### 6. Rate Limiting

**Implementation**:
- Global API rate limiting
- Stricter limits for authentication endpoints
- Environment-specific configurations
- Support for proxy-aware IP detection

**Configuration**:
```env
ENABLE_RATE_LIMIT=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 7. Request Monitoring and Logging

**Features**:
- Unique request ID generation
- Response time tracking
- Security event logging
- Suspicious pattern detection
- Failed authentication tracking

### 8. Input Sanitization

**Protection Against**:
- Null byte injection
- Path traversal attempts
- Basic XSS patterns
- SQL injection patterns

## Environment Configurations

### Development

**Security Level**: Permissive
- Relaxed CORS (allows localhost origins)
- Disabled HSTS
- Higher rate limits
- Detailed error messages
- CSP allows `unsafe-eval` for hot reload

### Production

**Security Level**: Strict
- Restrictive CORS (specific origins only)
- Full HSTS with preload
- Strict rate limits
- Generic error messages
- Comprehensive CSP without unsafe directives
- Enhanced monitoring and alerting

### Testing

**Security Level**: Minimal
- Open CORS for test flexibility
- Disabled security features that interfere with testing
- High rate limits
- Simplified configuration

## File Structure

```
api/
├── config/
│   └── security.js          # Main security configuration
├── middleware/
│   └── security.js          # Security middleware implementation
├── tests/
│   └── security.test.js     # Security feature tests
├── .env.security.example    # Environment configuration example
└── SECURITY.md             # This documentation
```

## Configuration Guide

### 1. Environment Setup

Copy the example environment file:
```bash
cp .env.security.example .env
```

### 2. Required Environment Variables

```env
# Basic Configuration
NODE_ENV=production
SESSION_SECRET=your-very-long-random-session-secret
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# Security Configuration
ALLOWED_ORIGINS=https://app.taskmaster.com,https://taskmaster.com
ENABLE_RATE_LIMIT=true
TRUST_PROXY=true
```

### 3. Optional Configuration

```env
# Custom Rate Limits
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Custom Security Headers
X_FRAME_OPTIONS=SAMEORIGIN
REFERRER_POLICY=strict-origin-when-cross-origin

# Monitoring
SECURITY_LOG_WEBHOOK=https://your-logging-service.com/webhook
```

## Security Monitoring

### Logged Events

The system logs the following security events:

- `AUTHENTICATION_FAILED` - Failed login attempts
- `AUTHORIZATION_FAILED` - Access denied events
- `RATE_LIMIT_EXCEEDED` - Rate limit violations
- `SUSPICIOUS_REQUEST` - Requests with suspicious patterns
- `CSP_VIOLATION` - Content Security Policy violations

### Monitoring Endpoints

#### Health Check
```
GET /health
```

Returns basic health and security status information.

#### Security Status (Development/Test only)
```
GET /api/v1/security/status
```

Returns detailed security configuration status.

#### CSP Violation Reports
```
POST /api/v1/security/csp-report
```

Receives and logs CSP violation reports.

## Best Practices

### 1. Session Management

- Use secure, HTTP-only cookies
- Implement proper session expiration
- Generate cryptographically secure session IDs
- Use appropriate SameSite cookie attributes

### 2. API Key Management

- Store API keys in environment variables
- Use different keys for different environments
- Implement key rotation procedures
- Monitor key usage and access patterns

### 3. Error Handling

- Don't expose sensitive information in error messages
- Log security-relevant errors for monitoring
- Use generic error messages in production
- Implement proper error boundaries

### 4. Regular Security Updates

- Keep dependencies updated
- Monitor security advisories
- Perform regular security audits
- Test security configurations regularly

## Testing Security Configuration

Run the security test suite:
```bash
npm test -- --testNamePattern="Security"
```

Test specific security features:
```bash
# Test CSP headers
curl -I http://localhost:8080/health

# Test rate limiting
for i in {1..10}; do curl http://localhost:8080/api/v1/tasks; done

# Test CORS
curl -H "Origin: https://malicious-site.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:8080/api/v1/tasks
```

## Security Checklist

- [ ] Environment variables configured
- [ ] HTTPS enabled in production
- [ ] CORS origins properly restricted
- [ ] Rate limiting enabled
- [ ] Security headers validated
- [ ] CSP policy tested
- [ ] Error handling verified
- [ ] Logging and monitoring configured
- [ ] Dependencies updated
- [ ] Security tests passing

## Troubleshooting

### Common Issues

#### CSP Violations
- Check browser console for violations
- Review CSP directives in security config
- Ensure nonces are properly applied

#### CORS Errors
- Verify origin is in ALLOWED_ORIGINS
- Check preflight request handling
- Validate credentials settings

#### Rate Limit Issues
- Check ENABLE_RATE_LIMIT setting
- Verify IP detection works correctly
- Review rate limit windows and thresholds

### Debug Mode

Enable detailed security logging:
```env
NODE_ENV=development
DEBUG=security:*
```

## Contact

For security issues or questions, contact:
- Security Team: security@taskmaster.com
- Documentation: docs@taskmaster.com

## License

This security configuration is part of the Task Master project and follows the same licensing terms.