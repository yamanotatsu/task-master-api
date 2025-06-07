const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const { createClient } = require('@supabase/supabase-js');

// Initialize Redis client (fallback to memory store if Redis not available)
let redis;
try {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 50, 2000);
    }
  });
} catch (error) {
  console.warn('Redis connection failed, using memory store for rate limiting');
}

// Initialize Supabase client for tracking attempts
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Custom key generator that handles both IP and user-based limiting
const keyGenerator = (req) => {
  // For authenticated requests, use user ID
  if (req.user && req.user.id) {
    return `user_${req.user.id}`;
  }
  // For unauthenticated requests, use IP
  return req.ip || req.connection.remoteAddress;
};

// Track failed login attempts in database
const trackFailedAttempt = async (identifier, identifierType = 'ip') => {
  try {
    const { error } = await supabase
      .from('login_attempts')
      .insert({
        identifier,
        identifier_type: identifierType,
        attempted_at: new Date().toISOString(),
        success: false
      });
    
    if (error) console.error('Failed to track login attempt:', error);
  } catch (err) {
    console.error('Error tracking failed attempt:', err);
  }
};

// Check if IP or user is blocked
const checkIfBlocked = async (identifier, identifierType = 'ip') => {
  try {
    const { data, error } = await supabase
      .from('security_blocks')
      .select('*')
      .eq('identifier', identifier)
      .eq('identifier_type', identifierType)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();
    
    return !error && data;
  } catch (err) {
    console.error('Error checking block status:', err);
    return false;
  }
};

// Progressive delay calculation based on failed attempts
const calculateDelay = (attempts) => {
  if (attempts < 3) return 0;
  if (attempts < 5) return 2000; // 2 seconds
  if (attempts < 10) return 5000; // 5 seconds
  if (attempts < 15) return 10000; // 10 seconds
  return 30000; // 30 seconds
};

// Base rate limiter configuration
const createRateLimiter = (options = {}) => {
  const config = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // default limit
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    handler: async (req, res) => {
      const identifier = keyGenerator(req);
      
      // Check if blocked
      const blocked = await checkIfBlocked(identifier);
      if (blocked) {
        return res.status(403).json({
          error: 'Access blocked due to security violations',
          retryAfter: blocked.expires_at
        });
      }
      
      res.status(429).json({
        error: 'Too many requests, please try again later',
        retryAfter: res.getHeader('Retry-After')
      });
    },
    ...options
  };

  // Use Redis store if available
  if (redis) {
    config.store = new RedisStore({
      client: redis,
      prefix: 'rl:'
    });
  }

  return rateLimit(config);
};

// Specific rate limiters for different endpoints
const rateLimiters = {
  // Very strict for authentication endpoints
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    skipSuccessfulRequests: false,
    handler: async (req, res) => {
      const identifier = keyGenerator(req);
      await trackFailedAttempt(identifier);
      
      // Check total failed attempts
      const { count } = await supabase
        .from('login_attempts')
        .select('*', { count: 'exact' })
        .eq('identifier', identifier)
        .eq('success', false)
        .gte('attempted_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
      
      // Block if too many attempts
      if (count > 20) {
        await supabase
          .from('security_blocks')
          .insert({
            identifier,
            identifier_type: 'ip',
            reason: 'Excessive failed login attempts',
            blocked_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            is_active: true
          });
      }
      
      res.status(429).json({
        error: 'Too many login attempts, please try again later',
        retryAfter: res.getHeader('Retry-After')
      });
    }
  }),

  // Strict for password reset
  passwordReset: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 requests per hour
    skipSuccessfulRequests: false
  }),

  // Moderate for API endpoints
  api: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60 // 60 requests per minute
  }),

  // Lenient for read operations
  read: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100 // 100 requests per minute
  }),

  // Very lenient for static assets
  static: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200 // 200 requests per minute
  })
};

// Middleware to add progressive delay for failed login attempts
const bruteForceProtection = async (req, res, next) => {
  const identifier = keyGenerator(req);
  
  try {
    // Check if blocked
    const blocked = await checkIfBlocked(identifier);
    if (blocked) {
      return res.status(403).json({
        error: 'Access blocked due to security violations',
        retryAfter: blocked.expires_at
      });
    }
    
    // Get recent failed attempts count
    const { count } = await supabase
      .from('login_attempts')
      .select('*', { count: 'exact' })
      .eq('identifier', identifier)
      .eq('success', false)
      .gte('attempted_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()); // Last 15 minutes
    
    const delay = calculateDelay(count || 0);
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    next();
  } catch (error) {
    console.error('Brute force protection error:', error);
    next(); // Continue on error to avoid blocking legitimate users
  }
};

// CAPTCHA verification preparation
const captchaProtection = async (req, res, next) => {
  // Skip if no CAPTCHA required
  if (!req.body.captchaToken) {
    const identifier = keyGenerator(req);
    
    // Check if CAPTCHA should be required based on failed attempts
    const { count } = await supabase
      .from('login_attempts')
      .select('*', { count: 'exact' })
      .eq('identifier', identifier)
      .eq('success', false)
      .gte('attempted_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());
    
    if (count > 3) {
      return res.status(400).json({
        error: 'CAPTCHA verification required',
        requiresCaptcha: true
      });
    }
    
    return next();
  }
  
  // TODO: Implement actual CAPTCHA verification when provider is chosen
  // For now, just pass through
  next();
};

module.exports = {
  rateLimiters,
  bruteForceProtection,
  captchaProtection,
  trackFailedAttempt,
  checkIfBlocked,
  createRateLimiter
};