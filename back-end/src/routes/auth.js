import { Router } from 'express';
import { body } from 'express-validator';
import {
  registerCustomer,
  registerProvider,
  login,
  getMe,
} from '../controllers/authController.js';
import { authenticate, authorise } from '../middleware/auth.js';

const router = Router();

// ─── Validation rule sets ────────────────────────────────────────────────────

const customerRegisterRules = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('Full name is required.')
    .isLength({ max: 150 }).withMessage('Full name must be 150 characters or fewer.'),

  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\+?[0-9\s\-]{7,20}$/).withMessage('Please provide a valid phone number.'),

  body()
    .custom((_, { req }) => {
      if (!req.body.email && !req.body.phone) {
        throw new Error('At least one of email or phone is required.');
      }
      return true;
    }),

  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.'),
];

const providerRegisterRules = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('Owner full name is required.')
    .isLength({ max: 150 }).withMessage('Full name must be 150 characters or fewer.'),

  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\+?[0-9\s\-]{7,20}$/).withMessage('Please provide a valid phone number.'),

  body()
    .custom((_, { req }) => {
      if (!req.body.email && !req.body.phone) {
        throw new Error('At least one of email or phone is required.');
      }
      return true;
    }),

  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.'),

  body('business_name')
    .trim()
    .notEmpty().withMessage('Business name is required.')
    .isLength({ max: 200 }).withMessage('Business name must be 200 characters or fewer.'),
];

const loginRules = [
  body('identifier')
    .trim()
    .notEmpty().withMessage('Email or phone number is required.'),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

// ─── Routes ──────────────────────────────────────────────────────────────────

// POST /api/auth/register — customer registration
router.post('/register', customerRegisterRules, registerCustomer);

// POST /api/auth/provider-register — provider registration
router.post('/provider-register', providerRegisterRules, registerProvider);

// POST /api/auth/login — login with email or phone
router.post('/login', loginRules, login);

// GET /api/auth/me — get current authenticated user (protected)
router.get('/me', authenticate, authorise('customer', 'provider', 'admin'), getMe);

export default router;
