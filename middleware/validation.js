const { body, param, validationResult } = require('express-validator');

// Custom NoSQL Injection Prevention
const sanitizeNoSQL = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        // Remove $ and . from keys to prevent NoSQL injection
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
          console.warn(`Removed suspicious key: ${key}`);
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      });
    }
    return obj;
  };

  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);
  
  next();
};

// Custom XSS Prevention
const preventXSS = (req, res, next) => {
  const cleanString = (str) => {
    if (typeof str !== 'string') return str;
    
    // Remove dangerous HTML/script tags and entities
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<embed/gi, '')
      .replace(/<object/gi, '');
  };

  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'string') {
          obj[key] = cleanString(obj[key]);
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      });
    }
    return obj;
  };

  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);
  
  next();
};

// Validation error handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Resume validation rules
const validateResume = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 100 }).withMessage('Title must be less than 100 characters')
    .escape(),
  
  body('summary')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Summary must be less than 1000 characters')
    .escape(),
  
  body('skills')
    .optional()
    .isArray().withMessage('Skills must be an array')
    .custom((skills) => {
      if (skills.length > 50) throw new Error('Maximum 50 skills allowed');
      return true;
    }),
  
  body('skills.*')
    .trim()
    .isLength({ max: 50 }).withMessage('Each skill must be less than 50 characters')
    .escape(),

  validate
];

// User registration validation
const validateRegistration = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2-50 characters')
    .escape(),

  validate
];

// MongoDB ObjectId validation
const validateObjectId = [
  param('resumeId').isMongoId().withMessage('Invalid resume ID'),
  param('userId').optional().isMongoId().withMessage('Invalid user ID'),
  validate
];

module.exports = {
  sanitizeNoSQL,
  preventXSS,
  validate,
  validateResume,
  validateRegistration,
  validateObjectId
};