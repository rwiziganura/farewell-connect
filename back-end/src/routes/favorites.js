import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  deleteFavorite,
  getMyFavorites,
  isPositiveBigIntId,
  saveFavorite,
} from '../controllers/favoriteController.js';
import { authenticate, authorise } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, authorise('customer'));
router.get('/me', getMyFavorites);
router.post(
  '/',
  body().custom((_, { req }) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      throw new Error('Request body must be an object.');
    }
    const unexpected = Object.keys(req.body).find((key) => key !== 'provider_id');
    if (unexpected) throw new Error(`Unsupported field: ${unexpected}.`);
    return true;
  }),
  body('provider_id').custom(isPositiveBigIntId).withMessage('Provider ID must be a positive integer.'),
  saveFavorite,
);
router.delete(
  '/:providerId',
  param('providerId').custom(isPositiveBigIntId).withMessage('Provider ID must be a positive integer.'),
  deleteFavorite,
);

export default router;
