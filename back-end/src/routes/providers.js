import { Router } from 'express';
import { param } from 'express-validator';
import { getPublicProvider } from '../controllers/providerController.js';
import { isPositiveBigIntId } from '../controllers/serviceController.js';

const router = Router();

router.get(
  '/:providerId',
  param('providerId').custom(isPositiveBigIntId).withMessage('Provider ID must be a positive integer.'),
  getPublicProvider,
);

export default router;
