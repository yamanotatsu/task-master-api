import crypto from 'crypto';

/**
 * Comprehensive security configuration for Task Master API
 * Provides environment-specific security settings and policies
 */

// Environment detection
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDevelopment = NODE_ENV === 'development';
const isProduction = NODE_ENV === 'production';
const isTesting = NODE_ENV === 'test';

/**
 * Content Security Policy (CSP) directives
 * Configures which resources can be loaded and from where
 */
const cspDirectives = {
  development: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow eval in dev for hot reload
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    connectSrc: ["'self'", "ws:", "wss:", "http://localhost:*", "https://localhost:*"],
    mediaSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"],
    workerSrc: ["'self'", "blob:"],
    childSrc: ["'self'", "blob:"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    manifestSrc: ["'self'"],
    upgradeInsecureRequests: []
  },
  production: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https:"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    connectSrc: ["'self'"],
    mediaSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"],
    workerSrc: ["'self'"],
    childSrc: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    manifestSrc: ["'self'"],
    upgradeInsecureRequests: [],
    blockAllMixedContent: [],
    requireSriFor: ['script', 'style']
  },
  test: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    imgSrc: ["'self'", "data:"],
    fontSrc: ["'self'"],
    connectSrc: ["'self'"],
    mediaSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"],
    workerSrc: ["'self'"],
    childSrc: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"]
  }
};

/**
 * CORS (Cross-Origin Resource Sharing) configuration
 * Controls which origins can access the API
 */
const corsConfig = {
  development: {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:4000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:4000',
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/
      ];
      
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return allowed === origin;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'X-Trace-ID'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page', 'X-Request-ID', 'X-Response-Time'],
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 204
  },
  production: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, false); // Disallow requests with no origin in production
      
      const allowedOrigins = process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
        : [process.env.FRONTEND_URL];
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page', 'X-Request-ID'],
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 204
  },
  test: {
    origin: true, // Allow all origins in test
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
    maxAge: 3600,
    optionsSuccessStatus: 204
  }
};

/**
 * HSTS (HTTP Strict Transport Security) configuration
 * Forces HTTPS connections
 */
const hstsConfig = {
  development: {
    maxAge: 0, // Disabled in development
    includeSubDomains: false,
    preload: false
  },
  production: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  test: {
    maxAge: 0,
    includeSubDomains: false,
    preload: false
  }
};

/**
 * Feature Policy / Permissions Policy configuration
 * Controls browser features and APIs
 */
const featurePolicy = {
  development: {
    accelerometer: ["'none'"],
    ambientLightSensor: ["'none'"],
    autoplay: ["'none'"],
    battery: ["'none'"],
    camera: ["'none'"],
    displayCapture: ["'none'"],
    documentDomain: ["'none'"],
    encryptedMedia: ["'none'"],
    executionWhileNotRendered: ["'self'"],
    executionWhileOutOfViewport: ["'self'"],
    fullscreen: ["'none'"],
    geolocation: ["'none'"],
    gyroscope: ["'none'"],
    layoutAnimations: ["'self'"],
    legacyImageFormats: ["'self'"],
    magnetometer: ["'none'"],
    microphone: ["'none'"],
    midi: ["'none'"],
    navigationOverride: ["'none'"],
    oversizedImages: ["'self'"],
    payment: ["'none'"],
    pictureInPicture: ["'none'"],
    publicKeyCredentialsGet: ["'none'"],
    speakerSelection: ["'none'"],
    syncXhr: ["'none'"],
    unoptimizedImages: ["'self'"],
    unsizedMedia: ["'self'"],
    usb: ["'none'"],
    screenWakeLock: ["'none'"],
    webShare: ["'none'"],
    xrSpatialTracking: ["'none'"]
  },
  production: {
    accelerometer: ["'none'"],
    ambientLightSensor: ["'none'"],
    autoplay: ["'none'"],
    battery: ["'none'"],
    camera: ["'none'"],
    displayCapture: ["'none'"],
    documentDomain: ["'none'"],
    encryptedMedia: ["'none'"],
    executionWhileNotRendered: ["'none'"],
    executionWhileOutOfViewport: ["'none'"],
    fullscreen: ["'none'"],
    geolocation: ["'none'"],
    gyroscope: ["'none'"],
    layoutAnimations: ["'none'"],
    legacyImageFormats: ["'none'"],
    magnetometer: ["'none'"],
    microphone: ["'none'"],
    midi: ["'none'"],
    navigationOverride: ["'none'"],
    oversizedImages: ["'none'"],
    payment: ["'none'"],
    pictureInPicture: ["'none'"],
    publicKeyCredentialsGet: ["'none'"],
    speakerSelection: ["'none'"],
    syncXhr: ["'none'"],
    unoptimizedImages: ["'none'"],
    unsizedMedia: ["'none'"],
    usb: ["'none'"],
    screenWakeLock: ["'none'"],
    webShare: ["'none'"],
    xrSpatialTracking: ["'none'"]
  },
  test: {
    geolocation: ["'none'"],
    microphone: ["'none'"],
    camera: ["'none'"]
  }
};

/**
 * Security headers configuration
 * Additional security headers beyond CSP
 */
const securityHeaders = {
  development: {
    'X-DNS-Prefetch-Control': 'off',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '0', // Disabled as it can introduce vulnerabilities in modern browsers
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'X-Download-Options': 'noopen',
    'Cross-Origin-Embedder-Policy': 'unsafe-none',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Origin-Agent-Cluster': '?1'
  },
  production: {
    'X-DNS-Prefetch-Control': 'off',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '0',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'X-Download-Options': 'noopen',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Origin-Agent-Cluster': '?1',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  },
  test: {
    'X-DNS-Prefetch-Control': 'off',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '0',
    'Referrer-Policy': 'no-referrer',
    'X-Permitted-Cross-Domain-Policies': 'none'
  }
};

/**
 * Rate limiting configuration
 * Controls request rates per IP/user
 */
const rateLimitConfig = {
  development: {
    global: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Very permissive in development
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    },
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 20, // More attempts allowed in dev
      skipSuccessfulRequests: false
    },
    api: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100
    }
  },
  production: {
    global: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req) => {
        // Use X-Forwarded-For in production (behind proxy)
        return req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
      }
    },
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 5,
      skipSuccessfulRequests: true,
      message: 'Too many authentication attempts, please try again later.'
    },
    api: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 30
    },
    strict: {
      windowMs: 1 * 60 * 1000,
      max: 10,
      message: 'Rate limit exceeded for this operation.'
    }
  },
  test: {
    global: {
      windowMs: 15 * 60 * 1000,
      max: 10000, // Essentially unlimited for tests
      standardHeaders: true,
      legacyHeaders: false
    },
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 1000
    },
    api: {
      windowMs: 1 * 60 * 1000,
      max: 1000
    }
  }
};

/**
 * Session configuration
 * Controls session handling and cookies
 */
const sessionConfig = {
  development: {
    name: 'taskmaster.sid.dev',
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Allow HTTP in development
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
      domain: undefined
    },
    rolling: true
  },
  production: {
    name: 'taskmaster.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // HTTPS only
      httpOnly: true,
      maxAge: 4 * 60 * 60 * 1000, // 4 hours
      sameSite: 'strict',
      domain: process.env.COOKIE_DOMAIN
    },
    rolling: true,
    genid: () => crypto.randomUUID()
  },
  test: {
    name: 'taskmaster.sid.test',
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 60 * 60 * 1000, // 1 hour
      sameSite: 'lax'
    }
  }
};

/**
 * Get configuration for current environment
 */
export const getSecurityConfig = () => {
  const env = NODE_ENV === 'production' ? 'production' : 
              NODE_ENV === 'test' ? 'test' : 'development';
  
  return {
    env,
    isDevelopment,
    isProduction,
    isTesting,
    csp: cspDirectives[env],
    cors: corsConfig[env],
    hsts: hstsConfig[env],
    featurePolicy: featurePolicy[env],
    headers: securityHeaders[env],
    rateLimit: rateLimitConfig[env],
    session: sessionConfig[env]
  };
};

/**
 * Security monitoring configuration
 * For logging and alerting on security events
 */
export const securityMonitoring = {
  events: {
    AUTHENTICATION_FAILED: 'auth.failed',
    AUTHENTICATION_SUCCESS: 'auth.success',
    AUTHORIZATION_FAILED: 'authz.failed',
    RATE_LIMIT_EXCEEDED: 'ratelimit.exceeded',
    INVALID_TOKEN: 'token.invalid',
    SUSPICIOUS_REQUEST: 'request.suspicious',
    CSP_VIOLATION: 'csp.violation',
    CORS_VIOLATION: 'cors.violation',
    SQL_INJECTION_ATTEMPT: 'security.sql_injection',
    XSS_ATTEMPT: 'security.xss',
    PATH_TRAVERSAL_ATTEMPT: 'security.path_traversal',
    BRUTE_FORCE_ATTEMPT: 'security.brute_force'
  },
  shouldAlert: (event) => {
    const criticalEvents = [
      'security.sql_injection',
      'security.xss',
      'security.path_traversal',
      'security.brute_force'
    ];
    return criticalEvents.includes(event);
  }
};

/**
 * Trusted proxy configuration
 * For when API is behind a reverse proxy
 */
export const trustedProxyConfig = {
  development: false, // No proxy in development
  production: process.env.TRUST_PROXY || true, // Trust first proxy by default
  test: false
};

export default getSecurityConfig;