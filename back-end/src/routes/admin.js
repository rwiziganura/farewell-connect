import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  approveProviderApplication,
  getPendingProviderApplications,
  getProviderApplications,
  rejectProviderApplication,
  supportedStatuses,
} from '../controllers/adminProviderController.js';
import { authenticate, authorise } from '../middleware/auth.js';

const router = Router();

function isPositiveBigIntId(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return false;

  const text = String(value);
  if (!/^[1-9]\d{0,18}$/.test(text)) return false;
  return BigInt(text) <= 9223372036854775807n;
}

const providerIdRule = param('providerId')
  .custom(isPositiveBigIntId)
  .withMessage('Provider ID must be a positive integer.');

router.use(authenticate, authorise('admin'));

router.get('/providers/pending', getPendingProviderApplications);
router.get(
  '/providers',
  query('status')
    .optional()
    .isIn([...supportedStatuses])
    .withMessage('Status must be pending, verified, or rejected.'),
  getProviderApplications,
);
router.patch(
  '/providers/:providerId/approve',
  providerIdRule,
  approveProviderApplication,
);
router.patch(
  '/providers/:providerId/reject',
  providerIdRule,
  body('reason')
    .isString().withMessage('Rejection reason is required.')
    .bail()
    .trim()
    .notEmpty().withMessage('Rejection reason is required.')
    .isLength({ max: 5000 }).withMessage('Rejection reason must be 5000 characters or fewer.'),
  rejectProviderApplication,
);

export default router;
