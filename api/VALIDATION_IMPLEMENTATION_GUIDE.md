# Task Master API - Enhanced Validation Implementation Guide

This guide explains how to implement the enhanced input validation and sanitization system in the Task Master API.

## Overview

The enhanced validation system provides:
- Comprehensive input sanitization (XSS, SQL injection, path traversal protection)
- Advanced validation for all data types
- Automatic request sanitization middleware
- Schema-based validation for consistency
- Security event logging and monitoring

## Directory Structure

```
api/
├── middleware/
│   └── sanitizer.js          # Request sanitization middleware
├── utils/
│   └── validation.js         # Core validation and sanitization functions
└── schemas/
    ├── index.js              # Schema exports and middleware creator
    ├── auth.schemas.js       # Authentication validation schemas
    ├── organization.schemas.js # Organization validation schemas
    ├── user.schemas.js       # User profile validation schemas
    └── project-task.schemas.js # Project and task validation schemas
```

## Implementation Steps

### 1. Apply Global Sanitization Middleware

Add the sanitization middleware to your main server file or router:

```javascript
import sanitizerMiddleware from './middleware/sanitizer.js';

// Apply to all routes
app.use(sanitizerMiddleware({
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  strictMode: true,
  skipSanitizationPaths: ['/api/health']
}));
```

### 2. Use Schema-Based Validation

Replace manual validation with schema-based validation:

```javascript
import { createValidationMiddleware } from './schemas/index.js';

// Before
router.post('/signup', async (req, res) => {
  const errors = validateSignupInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  // ... handle request
});

// After
router.post('/signup', 
  createValidationMiddleware('auth', 'signup'),
  async (req, res) => {
    // Input is already validated and sanitized
    const { email, password, fullName } = req.body;
    // ... handle request
  }
);
```

### 3. Create Custom Field Sanitizers

For specific field requirements:

```javascript
import { createFieldSanitizer } from './middleware/sanitizer.js';

const projectFieldSanitizer = createFieldSanitizer({
  body: {
    name: {
      type: 'alphanumeric',
      required: true,
      sanitizer: 'html',
      options: { allowSpaces: true }
    },
    budget: {
      type: 'number',
      required: false,
      options: { min: 0 }
    }
  }
});

router.post('/projects', projectFieldSanitizer, async (req, res) => {
  // Fields are validated and sanitized
});
```

### 4. Use Direct Validation Functions

For custom validation logic:

```javascript
import { validators, sanitizers } from './utils/validation.js';

// Validate individual values
if (!validators.email(userEmail)) {
  throw new Error('Invalid email');
}

// Sanitize user input
const safeName = sanitizers.html(userInput);
const safePath = sanitizers.path(filePath);
const safeUrl = sanitizers.url(websiteUrl);
```

### 5. Handle File Uploads

The sanitizer middleware automatically validates file uploads:

```javascript
router.post('/upload',
  upload.single('file'), // multer middleware
  sanitizerMiddleware({
    maxFileSize: 50 * 1024 * 1024 // 50MB
  }),
  async (req, res) => {
    // req.file is validated and has sanitizedFilename
    const filename = req.file.sanitizedFilename;
    // ... handle file
  }
);
```

## Schema Definition Format

### Basic Schema Structure

```javascript
const schema = {
  body: {
    fieldName: {
      type: 'string|number|boolean|email|url|uuid|date|etc',
      required: true|false,
      sanitizer: 'html|sql|path|url|json',
      options: {
        // Type-specific options
      },
      validator: (value) => boolean, // Custom validation
      message: 'Custom error message'
    }
  },
  query: {
    // Query parameter validation
  },
  params: {
    // Route parameter validation
  }
};
```

### Available Types

- `email` - Email validation with configurable options
- `password` - Password strength validation
- `fullName` - Name validation with pattern matching
- `phone` - Phone number validation with locale support
- `url` - URL validation with protocol requirements
- `uuid` - UUID format validation
- `date` - Date validation with format options
- `number` - Numeric validation with min/max
- `boolean` - Boolean type validation
- `text` - Text with length constraints
- `alphanumeric` - Alphanumeric validation
- `enum` - Enumerated values validation
- `array` - Array validation with item constraints
- `object` - Object validation with nested properties
- `json` - JSON string validation
- `ip` - IP address validation (v4/v6)
- `creditCard` - Credit card number validation

### Example Schemas

#### User Registration
```javascript
{
  body: {
    email: {
      type: 'email',
      required: true,
      sanitizer: 'html',
      message: 'Valid email required'
    },
    password: {
      type: 'password',
      required: true,
      options: {
        minLength: 8,
        minUppercase: 1,
        minNumbers: 1
      }
    },
    fullName: {
      type: 'fullName',
      required: true,
      sanitizer: 'html'
    }
  }
}
```

#### Task Creation
```javascript
{
  body: {
    title: {
      type: 'text',
      required: true,
      sanitizer: 'html',
      options: {
        minLength: 3,
        maxLength: 200
      }
    },
    priority: {
      type: 'enum',
      required: false,
      options: {
        values: ['low', 'medium', 'high', 'urgent']
      }
    },
    assigneeId: {
      type: 'uuid',
      required: false
    },
    tags: {
      type: 'array',
      required: false,
      maxItems: 20,
      itemType: 'text'
    }
  }
}
```

## Security Features

### 1. Automatic XSS Prevention
All string inputs are automatically sanitized to prevent XSS attacks:
```javascript
// Input: <script>alert('xss')</script>
// Sanitized: &lt;script&gt;alert('xss')&lt;/script&gt;
```

### 2. SQL Injection Protection
SQL special characters are escaped:
```javascript
// Input: "'; DROP TABLE users; --"
// Sanitized: "''; DROP TABLE users; --"
```

### 3. Path Traversal Protection
File paths are sanitized to prevent directory traversal:
```javascript
// Input: "../../../etc/passwd"
// Sanitized: "etcpasswd"
```

### 4. Request Size Limits
Prevents DoS attacks through large payloads:
```javascript
sanitizerMiddleware({
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  maxJsonDepth: 10,
  maxArrayLength: 1000
})
```

### 5. Malicious Pattern Detection
Logs and optionally blocks requests with suspicious patterns:
```javascript
if (containsSqlInjectionPatterns(input) || containsXssPatterns(input)) {
  // Log security event
  // Optionally reject request
}
```

## Best Practices

1. **Always use schema validation** for consistency and security
2. **Apply global sanitization** to catch any missed inputs
3. **Log sanitization events** for security monitoring
4. **Use strict mode** in production for maximum security
5. **Validate file uploads** carefully, checking both size and type
6. **Sanitize at the edge** - as early as possible in request handling
7. **Don't trust any input** - validate even internal API calls
8. **Use appropriate sanitizers** - HTML for display, SQL for queries, etc.
9. **Keep schemas updated** as your API evolves
10. **Test validation thoroughly** including edge cases

## Migration Guide

To migrate existing routes:

1. **Identify all input points** (body, query, params, files)
2. **Create schemas** for each endpoint
3. **Replace manual validation** with schema middleware
4. **Add sanitization middleware** globally
5. **Test thoroughly** with both valid and malicious inputs
6. **Monitor logs** for sanitization events
7. **Adjust schemas** based on real-world usage

## Testing Validation

Example test cases:

```javascript
// Test XSS prevention
const xssPayloads = [
  '<script>alert("xss")</script>',
  '<img src=x onerror=alert("xss")>',
  'javascript:alert("xss")'
];

// Test SQL injection prevention
const sqlPayloads = [
  "' OR '1'='1",
  "'; DROP TABLE users; --",
  "1' UNION SELECT * FROM users--"
];

// Test path traversal prevention
const pathPayloads = [
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32',
  '/etc/passwd'
];

// Each should be properly sanitized without breaking functionality
```

## Performance Considerations

- Sanitization adds minimal overhead (typically <1ms per request)
- Deep object sanitization is optimized with depth limits
- Consider caching validation schemas for frequently used endpoints
- Use `skipSanitizationPaths` for endpoints that don't need sanitization

## Support and Updates

- Validation functions are regularly updated for new security threats
- Schema definitions can be extended with custom validators
- Monitor security advisories and update validation patterns accordingly

Remember: **Security is a process, not a feature**. Regular reviews and updates of validation rules are essential for maintaining a secure API.