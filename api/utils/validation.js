/**
 * Comprehensive input validation and sanitization utilities
 * Provides protection against XSS, SQL injection, path traversal, and other security threats
 */

// ===== SANITIZATION FUNCTIONS =====

/**
 * Sanitizes input to prevent XSS attacks
 * @param {string} input - Raw input string
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized string
 */
export function sanitizeHtml(input, options = {}) {
  if (!input || typeof input !== 'string') return '';
  
  // Basic HTML entity encoding for security
  return input
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitizes input for SQL queries (escapes special characters)
 * @param {string} input - Raw input string
 * @returns {string} SQL-safe string
 */
export function sanitizeSql(input) {
  if (!input || typeof input !== 'string') return '';
  
  // Escape SQL special characters
  return input
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');
}

/**
 * Sanitizes file paths to prevent path traversal attacks
 * @param {string} path - Raw path string
 * @returns {string} Safe path string
 */
export function sanitizePath(path) {
  if (!path || typeof path !== 'string') return '';
  
  // Remove path traversal patterns
  return path
    .replace(/\.\.\/|\.\.\\/g, '')
    .replace(/^[/\\]+/, '')
    .replace(/[/\\]+$/, '')
    .replace(/[^a-zA-Z0-9-_./\\]/g, '')
    .trim();
}

/**
 * Sanitizes JSON input to prevent injection
 * @param {*} input - Raw input
 * @returns {*} Sanitized input
 */
export function sanitizeJson(input) {
  if (typeof input === 'string') {
    return sanitizeHtml(input);
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeJson(item));
  }
  
  if (input && typeof input === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeHtml(key)] = sanitizeJson(value);
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Sanitizes URL to prevent injection
 * @param {string} url - Raw URL string
 * @returns {string} Safe URL string
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch (e) {
    return '';
  }
}

// ===== VALIDATION FUNCTIONS =====

/**
 * Advanced email validation
 * @param {string} email - Email to validate
 * @param {Object} options - Validation options
 * @returns {boolean}
 */
export function isValidEmail(email, options = {}) {
  if (!email || typeof email !== 'string') return false;
  
  // Enhanced email regex that handles most common formats
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  // Basic validation
  if (!emailRegex.test(email)) return false;
  
  // Additional checks
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  
  const [localPart, domain] = parts;
  
  // Local part validation
  if (localPart.length > 64) return false;
  if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
  if (localPart.includes('..')) return false;
  
  // Domain validation
  if (domain.length > 253) return false;
  if (domain.startsWith('.') || domain.endsWith('.')) return false;
  if (domain.includes('..')) return false;
  
  // Check for valid TLD if required
  if (options.require_tld !== false) {
    const domainParts = domain.split('.');
    if (domainParts.length < 2) return false;
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) return false;
  }
  
  return true;
}

/**
 * Advanced password strength validation
 * @param {string} password - Password to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result with strength score
 */
export function validatePassword(password, options = {}) {
  const defaultOptions = {
    minLength: 8,
    maxLength: 128,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 0,
    requireSpaces: false,
    blacklist: [],
    ...options
  };
  
  if (!password || typeof password !== 'string') {
    return { valid: false, score: 0, issues: ['Password is required'] };
  }
  
  const issues = [];
  let score = 0;
  
  // Length checks
  if (password.length < defaultOptions.minLength) {
    issues.push(`Password must be at least ${defaultOptions.minLength} characters`);
  } else if (password.length > defaultOptions.maxLength) {
    issues.push(`Password must not exceed ${defaultOptions.maxLength} characters`);
  } else {
    score += Math.min(password.length / 4, 3);
  }
  
  // Character type checks
  const lowercase = (password.match(/[a-z]/g) || []).length;
  const uppercase = (password.match(/[A-Z]/g) || []).length;
  const numbers = (password.match(/[0-9]/g) || []).length;
  const symbols = (password.match(/[^a-zA-Z0-9]/g) || []).length;
  const spaces = (password.match(/\s/g) || []).length;
  
  if (lowercase < defaultOptions.minLowercase) {
    issues.push(`Password must contain at least ${defaultOptions.minLowercase} lowercase letter(s)`);
  } else {
    score += 1;
  }
  
  if (uppercase < defaultOptions.minUppercase) {
    issues.push(`Password must contain at least ${defaultOptions.minUppercase} uppercase letter(s)`);
  } else {
    score += 1;
  }
  
  if (numbers < defaultOptions.minNumbers) {
    issues.push(`Password must contain at least ${defaultOptions.minNumbers} number(s)`);
  } else {
    score += 1;
  }
  
  if (symbols < defaultOptions.minSymbols) {
    issues.push(`Password must contain at least ${defaultOptions.minSymbols} symbol(s)`);
  } else if (symbols > 0) {
    score += 2;
  }
  
  if (!defaultOptions.requireSpaces && spaces > 0) {
    issues.push('Password cannot contain spaces');
  }
  
  // Common password check
  if (defaultOptions.blacklist.includes(password.toLowerCase())) {
    issues.push('Password is too common');
    score = 0;
  }
  
  // Entropy calculation
  const entropy = calculatePasswordEntropy(password);
  score += Math.min(entropy / 20, 2);
  
  return {
    valid: issues.length === 0,
    score: Math.min(Math.round(score), 10),
    strength: getPasswordStrength(score),
    issues,
    entropy
  };
}

/**
 * Backwards compatibility wrapper
 * @param {string} password
 * @returns {boolean}
 */
export function isValidPassword(password) {
  return validatePassword(password).valid;
}

/**
 * Calculate password entropy
 * @param {string} password
 * @returns {number}
 */
function calculatePasswordEntropy(password) {
  const charsets = [
    { regex: /[a-z]/, size: 26 },
    { regex: /[A-Z]/, size: 26 },
    { regex: /[0-9]/, size: 10 },
    { regex: /[^a-zA-Z0-9]/, size: 32 }
  ];
  
  let poolSize = 0;
  for (const charset of charsets) {
    if (charset.regex.test(password)) {
      poolSize += charset.size;
    }
  }
  
  return password.length * Math.log2(poolSize);
}

/**
 * Get password strength label
 * @param {number} score
 * @returns {string}
 */
function getPasswordStrength(score) {
  if (score < 3) return 'weak';
  if (score < 6) return 'fair';
  if (score < 8) return 'good';
  return 'strong';
}

/**
 * Validates full name with enhanced checks
 * @param {string} fullName - Name to validate
 * @param {Object} options - Validation options
 * @returns {boolean}
 */
export function isValidFullName(fullName, options = {}) {
  const defaultOptions = {
    minLength: 1,
    maxLength: 100,
    allowNumbers: false,
    allowSpecialChars: false,
    pattern: /^[a-zA-Z\s'-]+$/,
    ...options
  };
  
  if (!fullName || typeof fullName !== 'string') return false;
  
  const trimmed = fullName.trim();
  
  if (trimmed.length < defaultOptions.minLength || trimmed.length > defaultOptions.maxLength) {
    return false;
  }
  
  // Check for script tags or HTML
  if (/<[^>]*>/g.test(trimmed)) {
    return false;
  }
  
  // Check pattern if provided
  if (defaultOptions.pattern && !defaultOptions.pattern.test(trimmed)) {
    return false;
  }
  
  return true;
}

/**
 * Validates alphanumeric input
 * @param {string} input - Input to validate
 * @param {Object} options - Validation options
 * @returns {boolean}
 */
export function isAlphanumeric(input, options = {}) {
  if (!input || typeof input !== 'string') return false;
  
  const defaultOptions = {
    allowSpaces: false,
    allowDashes: false,
    allowUnderscores: false,
    ...options
  };
  
  let pattern = '^[a-zA-Z0-9';
  if (defaultOptions.allowSpaces) pattern += '\\s';
  if (defaultOptions.allowDashes) pattern += '-';
  if (defaultOptions.allowUnderscores) pattern += '_';
  pattern += ']+$';
  
  return new RegExp(pattern).test(input);
}

/**
 * Validates phone number
 * @param {string} phone - Phone number to validate
 * @param {string} locale - Locale for validation
 * @returns {boolean}
 */
export function isValidPhone(phone, locale = 'en-US') {
  if (!phone || typeof phone !== 'string') return false;
  
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-().+]/g, '');
  
  // Basic international phone validation
  const phonePatterns = {
    'en-US': /^1?\d{10}$/,
    'international': /^\+?[1-9]\d{1,14}$/,
    'jp': /^(0[789]0\d{8}|\+81[789]0\d{8})$/,
    'uk': /^(\+44|0)7\d{9}$/
  };
  
  const pattern = phonePatterns[locale] || phonePatterns['international'];
  return pattern.test(cleaned);
}

/**
 * Validates URL
 * @param {string} url - URL to validate
 * @param {Object} options - Validation options
 * @returns {boolean}
 */
export function isValidUrl(url, options = {}) {
  if (!url || typeof url !== 'string') return false;
  
  const defaultOptions = {
    protocols: ['http', 'https'],
    require_protocol: true,
    require_host: true,
    ...options
  };
  
  try {
    const parsed = new URL(url);
    
    // Protocol validation
    if (defaultOptions.require_protocol && !parsed.protocol) return false;
    if (defaultOptions.protocols && !defaultOptions.protocols.includes(parsed.protocol.slice(0, -1))) return false;
    
    // Host validation
    if (defaultOptions.require_host && !parsed.host) return false;
    
    // Additional checks
    if (parsed.hostname.length > 253) return false;
    if (parsed.pathname.includes('..')) return false;
    
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Validates date
 * @param {string} date - Date to validate
 * @param {Object} options - Validation options
 * @returns {boolean}
 */
export function isValidDate(date, options = {}) {
  if (!date) return false;
  
  const defaultOptions = {
    format: 'YYYY-MM-DD',
    ...options
  };
  
  // Try to parse the date
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return false;
  
  // Format validation if specified
  if (defaultOptions.format === 'YYYY-MM-DD') {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;
  }
  
  // Check if date is reasonable (not too far in past or future)
  const minDate = new Date('1900-01-01');
  const maxDate = new Date('2100-01-01');
  if (parsed < minDate || parsed > maxDate) return false;
  
  return true;
}

/**
 * Validates numeric input
 * @param {*} input - Input to validate
 * @param {Object} options - Validation options
 * @returns {boolean}
 */
export function isValidNumber(input, options = {}) {
  const defaultOptions = {
    min: -Infinity,
    max: Infinity,
    allowFloat: true,
    allowNegative: true,
    ...options
  };
  
  const num = Number(input);
  
  if (isNaN(num)) return false;
  if (num < defaultOptions.min || num > defaultOptions.max) return false;
  if (!defaultOptions.allowFloat && !Number.isInteger(num)) return false;
  if (!defaultOptions.allowNegative && num < 0) return false;
  
  return true;
}

/**
 * Validates file upload
 * @param {Object} file - File object
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateFileUpload(file, options = {}) {
  const defaultOptions = {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [],
    allowedExtensions: [],
    ...options
  };
  
  const errors = [];
  
  if (!file) {
    return { valid: false, errors: ['No file provided'] };
  }
  
  // Size check
  if (file.size > defaultOptions.maxSize) {
    errors.push(`File size exceeds maximum allowed size of ${defaultOptions.maxSize / 1024 / 1024}MB`);
  }
  
  // Type check
  if (defaultOptions.allowedTypes.length > 0 && !defaultOptions.allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }
  
  // Extension check
  if (defaultOptions.allowedExtensions.length > 0) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!defaultOptions.allowedExtensions.includes(extension)) {
      errors.push(`File extension .${extension} is not allowed`);
    }
  }
  
  // Check for potentially malicious filenames
  if (!/^[a-zA-Z0-9-_.\s]+$/.test(file.name)) {
    errors.push('Filename contains invalid characters');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates signup input data
 * @param {Object} data - Signup data
 * @param {string} data.fullName - User's full name
 * @param {string} data.email - User's email
 * @param {string} data.password - User's password
 * @returns {Array} Array of validation errors
 */
export function validateSignupInput({ fullName, email, password }) {
  const errors = [];

  if (!fullName || !fullName.trim()) {
    errors.push({
      field: 'fullName',
      code: 'REQUIRED',
      message: 'Full name is required'
    });
  } else if (!isValidFullName(fullName)) {
    errors.push({
      field: 'fullName',
      code: 'INVALID_LENGTH',
      message: 'Full name must be between 1 and 100 characters'
    });
  }

  if (!email || !email.trim()) {
    errors.push({
      field: 'email',
      code: 'REQUIRED',
      message: 'Email is required'
    });
  } else if (!isValidEmail(email)) {
    errors.push({
      field: 'email',
      code: 'INVALID_FORMAT',
      message: 'Please enter a valid email address'
    });
  }

  if (!password) {
    errors.push({
      field: 'password',
      code: 'REQUIRED',
      message: 'Password is required'
    });
  } else if (!isValidPassword(password)) {
    errors.push({
      field: 'password',
      code: 'WEAK_PASSWORD',
      message: 'Password must be at least 8 characters long and contain uppercase, lowercase, and numeric characters'
    });
  }

  return errors;
}

/**
 * Validates login input data
 * @param {Object} data - Login data
 * @param {string} data.email - User's email
 * @param {string} data.password - User's password
 * @returns {Array} Array of validation errors
 */
export function validateLoginInput({ email, password }) {
  const errors = [];

  if (!email || !email.trim()) {
    errors.push({
      field: 'email',
      code: 'REQUIRED',
      message: 'Email is required'
    });
  } else if (!isValidEmail(email)) {
    errors.push({
      field: 'email',
      code: 'INVALID_FORMAT',
      message: 'Please enter a valid email address'
    });
  }

  if (!password) {
    errors.push({
      field: 'password',
      code: 'REQUIRED',
      message: 'Password is required'
    });
  }

  return errors;
}

/**
 * Validates forgot password input data
 * @param {Object} data - Forgot password data
 * @param {string} data.email - User's email
 * @returns {Array} Array of validation errors
 */
export function validateForgotPasswordInput({ email }) {
  const errors = [];

  if (!email || !email.trim()) {
    errors.push({
      field: 'email',
      code: 'REQUIRED',
      message: 'Email is required'
    });
  } else if (!isValidEmail(email)) {
    errors.push({
      field: 'email',
      code: 'INVALID_FORMAT',
      message: 'Please enter a valid email address'
    });
  }

  return errors;
}

/**
 * Validates reset password input data
 * @param {Object} data - Reset password data
 * @param {string} data.token - Reset token
 * @param {string} data.newPassword - New password
 * @returns {Array} Array of validation errors
 */
export function validateResetPasswordInput({ token, newPassword }) {
  const errors = [];

  if (!token || !token.trim()) {
    errors.push({
      field: 'token',
      code: 'REQUIRED',
      message: 'Reset token is required'
    });
  }

  if (!newPassword) {
    errors.push({
      field: 'newPassword',
      code: 'REQUIRED',
      message: 'New password is required'
    });
  } else if (!isValidPassword(newPassword)) {
    errors.push({
      field: 'newPassword',
      code: 'WEAK_PASSWORD',
      message: 'Password must be at least 8 characters long and contain uppercase, lowercase, and numeric characters'
    });
  }

  return errors;
}

/**
 * Validates refresh token input data
 * @param {Object} data - Refresh token data
 * @param {string} data.refreshToken - Refresh token
 * @returns {Array} Array of validation errors
 */
export function validateRefreshTokenInput({ refreshToken }) {
  const errors = [];

  if (!refreshToken || !refreshToken.trim()) {
    errors.push({
      field: 'refreshToken',
      code: 'REQUIRED',
      message: 'Refresh token is required'
    });
  }

  return errors;
}

/**
 * Validates account deletion input data
 * @param {Object} data - Account deletion data
 * @param {string} data.password - Current password
 * @param {string} data.confirmDeletion - Confirmation string
 * @returns {Array} Array of validation errors
 */
export function validateAccountDeletionInput({ password, confirmDeletion }) {
  const errors = [];

  if (!password) {
    errors.push({
      field: 'password',
      code: 'REQUIRED',
      message: 'Current password is required'
    });
  }

  if (!confirmDeletion || confirmDeletion !== 'DELETE MY ACCOUNT') {
    errors.push({
      field: 'confirmDeletion',
      code: 'INVALID_CONFIRMATION',
      message: 'Please type "DELETE MY ACCOUNT" to confirm deletion'
    });
  }

  return errors;
}

/**
 * Validates organization invitation input data
 * @param {Object} data - Invitation data
 * @param {string} data.email - Invitee's email
 * @param {string} data.role - Role to assign
 * @returns {Array} Array of validation errors
 */
export function validateInvitationInput({ email, role }) {
  const errors = [];

  if (!email || !email.trim()) {
    errors.push({
      field: 'email',
      code: 'REQUIRED',
      message: 'Email is required'
    });
  } else if (!isValidEmail(email)) {
    errors.push({
      field: 'email',
      code: 'INVALID_FORMAT',
      message: 'Please enter a valid email address'
    });
  }

  if (role !== undefined) {
    const validRoles = ['admin', 'member'];
    if (!validRoles.includes(role)) {
      errors.push({
        field: 'role',
        code: 'INVALID_ROLE',
        message: 'Role must be either "admin" or "member"'
      });
    }
  }

  return errors;
}

/**
 * Validates member role update input data
 * @param {Object} data - Role update data
 * @param {string} data.role - New role
 * @returns {Array} Array of validation errors
 */
export function validateRoleUpdateInput({ role }) {
  const errors = [];

  if (!role) {
    errors.push({
      field: 'role',
      code: 'REQUIRED',
      message: 'Role is required'
    });
  } else {
    const validRoles = ['admin', 'member'];
    if (!validRoles.includes(role)) {
      errors.push({
        field: 'role',
        code: 'INVALID_ROLE',
        message: 'Role must be either "admin" or "member"'
      });
    }
  }

  return errors;
}

/**
 * Validates organization input data
 * @param {Object} data - Organization data
 * @param {string} data.name - Organization name
 * @param {string} data.description - Organization description
 * @returns {Array} Array of validation errors
 */
export function validateOrganizationInput({ name, description }) {
  const errors = [];

  if (!name || !name.trim()) {
    errors.push({
      field: 'name',
      code: 'REQUIRED',
      message: 'Organization name is required'
    });
  } else if (name.trim().length > 100) {
    errors.push({
      field: 'name',
      code: 'INVALID_LENGTH',
      message: 'Organization name must be 100 characters or less'
    });
  }

  if (description !== undefined && description !== null) {
    if (description.length > 500) {
      errors.push({
        field: 'description',
        code: 'INVALID_LENGTH',
        message: 'Organization description must be 500 characters or less'
      });
    }
  }

  return errors;
}

/**
 * Validates invitation token format
 * @param {string} token - Invitation token
 * @returns {boolean}
 */
export function isValidInvitationToken(token) {
  // Base64URL format validation
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
  return token && token.length >= 32 && base64UrlRegex.test(token);
}

/**
 * Validates UUID format
 * @param {string} uuid - UUID to validate
 * @param {number} version - UUID version (1-5)
 * @returns {boolean}
 */
export function isValidUUID(uuid, version = null) {
  if (!uuid || typeof uuid !== 'string') return false;
  
  const uuidRegex = {
    1: /^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    2: /^[0-9a-f]{8}-[0-9a-f]{4}-2[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    3: /^[0-9a-f]{8}-[0-9a-f]{4}-3[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    4: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    5: /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    all: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  };
  
  const pattern = version ? uuidRegex[version] : uuidRegex.all;
  return pattern ? pattern.test(uuid) : false;
}

/**
 * Validates JSON string
 * @param {string} json - JSON string to validate
 * @returns {boolean}
 */
export function isValidJSON(json) {
  if (!json || typeof json !== 'string') return false;
  try {
    JSON.parse(json);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Validates IP address
 * @param {string} ip - IP address to validate
 * @param {number} version - IP version (4 or 6)
 * @returns {boolean}
 */
export function isValidIP(ip, version = 4) {
  if (!ip || typeof ip !== 'string') return false;
  
  if (version === 4) {
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  } else if (version === 6) {
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    return ipv6Regex.test(ip);
  }
  
  return false;
}

/**
 * Validates credit card number using Luhn algorithm
 * @param {string} card - Credit card number
 * @returns {boolean}
 */
export function isValidCreditCard(card) {
  if (!card || typeof card !== 'string') return false;
  
  // Remove spaces and dashes
  const cleaned = card.replace(/[\s-]/g, '');
  
  // Check if all characters are digits
  if (!/^\d+$/.test(cleaned)) return false;
  
  // Check length (most cards are 13-19 digits)
  if (cleaned.length < 13 || cleaned.length > 19) return false;
  
  // Luhn algorithm
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i), 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

// ===== ENHANCED VALIDATION FUNCTIONS =====

/**
 * Validates and sanitizes input based on type
 * @param {*} input - Input to validate
 * @param {string} type - Type of validation
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateAndSanitize(input, type, options = {}) {
  let sanitized = input;
  let valid = false;
  const errors = [];
  
  switch (type) {
    case 'email':
      sanitized = sanitizeHtml(input).toLowerCase();
      valid = isValidEmail(sanitized, options);
      if (!valid) errors.push('Invalid email format');
      break;
      
    case 'password':
      const passwordResult = validatePassword(input, options);
      valid = passwordResult.valid;
      errors.push(...passwordResult.issues);
      break;
      
    case 'fullName':
      sanitized = sanitizeHtml(input);
      valid = isValidFullName(sanitized, options);
      if (!valid) errors.push('Invalid name format');
      break;
      
    case 'phone':
      sanitized = input.replace(/[^0-9+()-]/g, '');
      valid = isValidPhone(sanitized, options.locale);
      if (!valid) errors.push('Invalid phone number');
      break;
      
    case 'url':
      sanitized = sanitizeUrl(input);
      valid = isValidUrl(sanitized, options);
      if (!valid) errors.push('Invalid URL format');
      break;
      
    case 'uuid':
      sanitized = input.trim();
      valid = isValidUUID(sanitized, options.version);
      if (!valid) errors.push('Invalid UUID format');
      break;
      
    case 'date':
      sanitized = input.trim();
      valid = isValidDate(sanitized, options);
      if (!valid) errors.push('Invalid date format');
      break;
      
    case 'number':
      valid = isValidNumber(input, options);
      if (valid) sanitized = Number(input);
      else errors.push('Invalid number format');
      break;
      
    case 'json':
      valid = isValidJSON(input);
      if (valid) {
        sanitized = sanitizeJson(JSON.parse(input));
      } else {
        errors.push('Invalid JSON format');
      }
      break;
      
    case 'alphanumeric':
      sanitized = sanitizeHtml(input);
      valid = isAlphanumeric(sanitized, options);
      if (!valid) errors.push('Input must be alphanumeric');
      break;
      
    case 'text':
      sanitized = sanitizeHtml(input);
      valid = typeof sanitized === 'string';
      if (options.maxLength && sanitized.length > options.maxLength) {
        valid = false;
        errors.push(`Text must not exceed ${options.maxLength} characters`);
      }
      if (options.minLength && sanitized.length < options.minLength) {
        valid = false;
        errors.push(`Text must be at least ${options.minLength} characters`);
      }
      break;
      
    case 'enum':
      sanitized = input;
      if (options.values && Array.isArray(options.values)) {
        valid = options.values.includes(input);
        if (!valid) errors.push(`Value must be one of: ${options.values.join(', ')}`);
      } else {
        valid = false;
        errors.push('Enum values not specified');
      }
      break;
      
    default:
      sanitized = sanitizeHtml(input);
      valid = true;
  }
  
  return {
    valid,
    sanitized,
    errors,
    original: input
  };
}

/**
 * Batch validate multiple fields
 * @param {Object} data - Data object to validate
 * @param {Object} schema - Validation schema
 * @returns {Object} Validation results
 */
export function validateBatch(data, schema) {
  const results = {};
  const errors = [];
  const sanitized = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    const result = validateAndSanitize(value, rules.type, rules.options);
    
    results[field] = result;
    sanitized[field] = result.sanitized;
    
    if (!result.valid) {
      errors.push({
        field,
        errors: result.errors,
        code: rules.errorCode || 'VALIDATION_ERROR'
      });
    }
    
    // Check required fields
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors.push({
        field,
        errors: [`${field} is required`],
        code: 'REQUIRED_FIELD'
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized,
    results
  };
}

/**
 * Validates profile update input data
 * @param {Object} data - Profile update data
 * @param {string} data.fullName - User's full name
 * @param {string} data.avatarUrl - Avatar URL
 * @returns {Array} Array of validation errors
 */
export function validateProfileUpdateInput({ fullName, avatarUrl }) {
  const errors = [];

  if (fullName !== undefined) {
    if (!fullName || !fullName.trim()) {
      errors.push({
        field: 'fullName',
        code: 'INVALID_VALUE',
        message: 'Full name cannot be empty'
      });
    } else if (!isValidFullName(fullName)) {
      errors.push({
        field: 'fullName',
        code: 'INVALID_LENGTH',
        message: 'Full name must be between 1 and 100 characters'
      });
    }
  }

  if (avatarUrl !== undefined) {
    if (avatarUrl && avatarUrl.length > 500) {
      errors.push({
        field: 'avatarUrl',
        code: 'INVALID_LENGTH',
        message: 'Avatar URL must be 500 characters or less'
      });
    }
    // Basic URL validation if provided
    if (avatarUrl && avatarUrl.trim()) {
      try {
        new URL(avatarUrl);
      } catch (e) {
        errors.push({
          field: 'avatarUrl',
          code: 'INVALID_FORMAT',
          message: 'Avatar URL must be a valid URL'
        });
      }
    }
  }

  return errors;
}

/**
 * Validates password change input data
 * @param {Object} data - Password change data
 * @param {string} data.currentPassword - Current password
 * @param {string} data.newPassword - New password
 * @returns {Array} Array of validation errors
 */
export function validatePasswordChangeInput({ currentPassword, newPassword }) {
  const errors = [];

  if (!currentPassword) {
    errors.push({
      field: 'currentPassword',
      code: 'REQUIRED',
      message: 'Current password is required'
    });
  }

  if (!newPassword) {
    errors.push({
      field: 'newPassword',
      code: 'REQUIRED',
      message: 'New password is required'
    });
  } else if (!isValidPassword(newPassword)) {
    errors.push({
      field: 'newPassword',
      code: 'WEAK_PASSWORD',
      message: 'Password must be at least 8 characters long and contain uppercase, lowercase, and numeric characters'
    });
  } else if (currentPassword === newPassword) {
    errors.push({
      field: 'newPassword',
      code: 'SAME_PASSWORD',
      message: 'New password must be different from current password'
    });
  }

  return errors;
}

/**
 * Validates pagination query parameters
 * @param {Object} params - Query parameters
 * @param {string|number} params.page - Page number
 * @param {string|number} params.limit - Items per page
 * @returns {Object} Validated pagination parameters
 */
export function validatePaginationParams({ page = 1, limit = 20 }) {
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  return {
    page: isNaN(pageNum) || pageNum < 1 ? 1 : pageNum,
    limit: isNaN(limitNum) || limitNum < 1 ? 20 : Math.min(limitNum, 100),
    offset: (Math.max(1, pageNum) - 1) * Math.min(Math.max(1, limitNum), 100)
  };
}

// ===== TASK AND PROJECT VALIDATION =====

/**
 * Validates task input data
 * @param {Object} data - Task data
 * @returns {Array} Array of validation errors
 */
export function validateTaskInput(data) {
  const errors = [];
  const schema = {
    title: {
      type: 'alphanumeric',
      required: true,
      options: { allowSpaces: true }
    },
    description: {
      type: 'text',
      required: false
    },
    status: {
      type: 'enum',
      required: false,
      options: { values: ['pending', 'in_progress', 'completed', 'cancelled'] }
    },
    priority: {
      type: 'enum',
      required: false,
      options: { values: ['low', 'medium', 'high', 'urgent'] }
    },
    assignee_id: {
      type: 'uuid',
      required: false
    },
    due_date: {
      type: 'date',
      required: false
    }
  };
  
  const result = validateBatch(data, schema);
  return result.errors;
}

/**
 * Validates project input data
 * @param {Object} data - Project data
 * @returns {Array} Array of validation errors
 */
export function validateProjectInput(data) {
  const schema = {
    name: {
      type: 'alphanumeric',
      required: true,
      options: { allowSpaces: true, allowDashes: true }
    },
    description: {
      type: 'text',
      required: false
    },
    start_date: {
      type: 'date',
      required: false
    },
    end_date: {
      type: 'date',
      required: false
    },
    status: {
      type: 'enum',
      required: false,
      options: { values: ['planning', 'active', 'on_hold', 'completed', 'cancelled'] }
    }
  };
  
  const result = validateBatch(data, schema);
  
  // Additional validation for date ranges
  if (data.start_date && data.end_date) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    if (start > end) {
      result.errors.push({
        field: 'end_date',
        errors: ['End date must be after start date'],
        code: 'INVALID_DATE_RANGE'
      });
    }
  }
  
  return result.errors;
}

// ===== SECURITY VALIDATION =====

/**
 * Validates API key format
 * @param {string} apiKey - API key to validate
 * @returns {boolean}
 */
export function isValidApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return false;
  // API key should be 32+ characters, alphanumeric with dashes/underscores
  const apiKeyRegex = /^[a-zA-Z0-9_-]{32,}$/;
  return apiKeyRegex.test(apiKey);
}

/**
 * Validates JWT token format
 * @param {string} token - JWT token to validate
 * @returns {boolean}
 */
export function isValidJWT(token) {
  if (!token || typeof token !== 'string') return false;
  // Basic JWT format validation (three parts separated by dots)
  const jwtRegex = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  return jwtRegex.test(token);
}

/**
 * Checks for common SQL injection patterns
 * @param {string} input - Input to check
 * @returns {boolean} True if potentially malicious
 */
export function containsSqlInjectionPatterns(input) {
  if (!input || typeof input !== 'string') return false;
  
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
    /(--|\/\*|\*\/|xp_|sp_)/i,
    /(\bor\b\s*\d+\s*=\s*\d+|\band\b\s*\d+\s*=\s*\d+)/i,
    /(\'|\"|;|\\x00|\\n|\\r|\\x1a)/i
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Checks for common XSS patterns
 * @param {string} input - Input to check
 * @returns {boolean} True if potentially malicious
 */
export function containsXssPatterns(input) {
  if (!input || typeof input !== 'string') return false;
  
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]+src[\\s]*=[\\s]*["\']javascript:/gi
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Validates request headers
 * @param {Object} headers - Request headers
 * @returns {Object} Validation result
 */
export function validateRequestHeaders(headers) {
  const errors = [];
  const warnings = [];
  
  // Check for required security headers
  if (!headers['content-type']) {
    warnings.push('Missing Content-Type header');
  }
  
  // Validate User-Agent
  if (headers['user-agent'] && headers['user-agent'].length > 500) {
    errors.push('User-Agent header too long');
  }
  
  // Check for potential header injection
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string' && value.includes('\\r') || value.includes('\\n')) {
      errors.push(`Potential header injection in ${key}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Export all validation functions for easy access
export const validators = {
  email: isValidEmail,
  password: validatePassword,
  fullName: isValidFullName,
  phone: isValidPhone,
  url: isValidUrl,
  uuid: isValidUUID,
  date: isValidDate,
  number: isValidNumber,
  json: isValidJSON,
  ip: isValidIP,
  creditCard: isValidCreditCard,
  apiKey: isValidApiKey,
  jwt: isValidJWT,
  alphanumeric: isAlphanumeric
};

// Export all sanitizers for easy access
export const sanitizers = {
  html: sanitizeHtml,
  sql: sanitizeSql,
  path: sanitizePath,
  json: sanitizeJson,
  url: sanitizeUrl
};