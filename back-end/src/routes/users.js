import { Router } from 'express';
import { body } from 'express-validator';
import {
  changeMyPassword,
  getMyAccount,
  updateMyAccount,
} from '../controllers/userController.js';
import { authenticate, authorise } from '../middleware/auth.js';

const router = Router();
const accountRoles = ['customer', 'provider', 'admin'];

function onlyAllowedFields(allowedFields) {
  return body().custom((_, { req }) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      throw new Error('Request body must be an object.');
    }
    const unexpected = Object.keys(req.body).find((key) => !allowedFields.includes(key));
    if (unexpected) throw new Error(`Unsupported field: ${unexpected}.`);
    return true;
  });
}

const profileRules = [
  onlyAllowedFields(['username', 'full_name']),
  body('username')
    .isString().withMessage('Username is required.')
    .bail()
    .trim()
    .matches(/^[A-Za-z0-9._-]{3,30}$/)
    .withMessage('Username must be 3 to 30 characters using letters, numbers, dots, underscores, or hyphens.'),
  body('full_name')
    .isString().withMessage('Personal name is required.')
    .bail()
    .trim()
    .notEmpty().withMessage('Personal name is required.')
    .isLength({ max: 150 }).withMessage('Personal name must be 150 characters or fewer.'),
];

const passwordRules = [
  onlyAllowedFields(['current_password', 'new_password', 'confirm_password']),
  body('current_password')
    .isString().withMessage('Current password is required.')
    .bail()
    .notEmpty().withMessage('Current password is required.'),
  body('new_password')
    .isString().withMessage('New password is required.')
    .bail()
    .isLength({ min: 12, max: 72 })
    .withMessage('New password must be between 12 and 72 characters.')
    .bail()
    .custom((value) => Buffer.byteLength(value, 'utf8') <= 72)
    .withMessage('New password must not exceed 72 UTF-8 bytes.')
    .matches(/[a-z]/).withMessage('New password must contain a lowercase letter.')
    .matches(/[A-Z]/).withMessage('New password must contain an uppercase letter.')
    .matches(/[0-9]/).withMessage('New password must contain a number.'),
  body('confirm_password')
    .custom((value, { req }) => value === req.body.new_password)
    .withMessage('Password confirmation does not match.'),
];

router.use(authenticate, authorise(...accountRoles));
router.get('/me', getMyAccount);
router.patch('/me', profileRules, updateMyAccount);
router.patch('/me/password', passwordRules, changeMyPassword);

export default router;
