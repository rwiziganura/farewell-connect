import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  createFields,
  createService,
  deleteMyService,
  getActiveCategories,
  getMyService,
  getMyServices,
  isPositiveBigIntId,
  isValidPrice,
  updateFields,
  updateMyService,
  updateMyServiceStatus,
  validateAllowedFields,
} from '../controllers/serviceController.js';
import { authenticate, authorise } from '../middleware/auth.js';

const router = Router();

const serviceIdRule = param('serviceId')
  .custom(isPositiveBigIntId)
  .withMessage('Service ID must be a positive integer.');

const creationRules = [
  body().custom((_, { req }) => validateAllowedFields(req, createFields)),
  body('service_name')
    .isString().withMessage('Service name is required.')
    .bail()
    .trim()
    .notEmpty().withMessage('Service name is required.')
    .isLength({ max: 200 }).withMessage('Service name must be 200 characters or fewer.'),
  body('category_id')
    .custom(isPositiveBigIntId)
    .withMessage('Category ID must be a positive integer.'),
  body('description')
    .optional({ nullable: true })
    .isString().withMessage('Description must be text.')
    .bail()
    .trim()
    .isLength({ max: 5000 }).withMessage('Description must be 5000 characters or fewer.'),
  body('price')
    .optional()
    .custom(isValidPrice)
    .withMessage('Price must be a non-negative amount with at most 2 decimal places.'),
  body('currency')
    .optional()
    .isString().withMessage('Currency must be a three-letter code.')
    .bail()
    .trim()
    .matches(/^[A-Za-z]{3}$/).withMessage('Currency must be a three-letter code.'),
  body('pricing_type')
    .optional()
    .isString().withMessage('Pricing type must be text.')
    .bail()
    .trim()
    .notEmpty().withMessage('Pricing type is required.')
    .isLength({ max: 30 }).withMessage('Pricing type must be 30 characters or fewer.'),
  body('location')
    .optional({ nullable: true })
    .isString().withMessage('Location must be text.')
    .bail()
    .trim()
    .isLength({ max: 255 }).withMessage('Location must be 255 characters or fewer.'),
  body('district')
    .optional({ nullable: true })
    .isString().withMessage('District must be text.')
    .bail()
    .trim()
    .isLength({ max: 100 }).withMessage('District must be 100 characters or fewer.'),
  body('availability_status')
    .optional()
    .isString().withMessage('Availability status must be text.')
    .bail()
    .trim()
    .isIn(['available', 'by_request', 'unavailable'])
    .withMessage('Availability status must be available, by_request, or unavailable.'),
  body('is_active')
    .optional()
    .custom((value) => typeof value === 'boolean')
    .withMessage('is_active must be a boolean.'),
];

const updateRules = [
  body().custom((_, { req }) => validateAllowedFields(req, updateFields, true)),
  body('service_name')
    .optional()
    .isString().withMessage('Service name must be text.')
    .bail()
    .trim()
    .notEmpty().withMessage('Service name must not be empty.')
    .isLength({ max: 200 }).withMessage('Service name must be 200 characters or fewer.'),
  body('category_id')
    .optional()
    .custom(isPositiveBigIntId)
    .withMessage('Category ID must be a positive integer.'),
  body('description')
    .optional({ nullable: true })
    .isString().withMessage('Description must be text.')
    .bail()
    .trim()
    .isLength({ max: 5000 }).withMessage('Description must be 5000 characters or fewer.'),
  body('price')
    .optional()
    .custom(isValidPrice)
    .withMessage('Price must be a non-negative amount with at most 2 decimal places.'),
  body('currency')
    .optional()
    .isString().withMessage('Currency must be a three-letter code.')
    .bail()
    .trim()
    .matches(/^[A-Za-z]{3}$/).withMessage('Currency must be a three-letter code.'),
  body('pricing_type')
    .optional()
    .isString().withMessage('Pricing type must be text.')
    .bail()
    .trim()
    .notEmpty().withMessage('Pricing type must not be empty.')
    .isLength({ max: 30 }).withMessage('Pricing type must be 30 characters or fewer.'),
  body('location')
    .optional({ nullable: true })
    .isString().withMessage('Location must be text.')
    .bail()
    .trim()
    .isLength({ max: 255 }).withMessage('Location must be 255 characters or fewer.'),
  body('district')
    .optional({ nullable: true })
    .isString().withMessage('District must be text.')
    .bail()
    .trim()
    .isLength({ max: 100 }).withMessage('District must be 100 characters or fewer.'),
  body('availability_status')
    .optional()
    .isString().withMessage('Availability status must be text.')
    .bail()
    .trim()
    .isIn(['available', 'by_request', 'unavailable'])
    .withMessage('Availability status must be available, by_request, or unavailable.'),
];

router.use(authenticate, authorise('provider'));

router.post('/', creationRules, createService);
router.get('/', getMyServices);
router.get('/my', getMyServices);
router.get('/categories', getActiveCategories);
router.get('/:serviceId', serviceIdRule, getMyService);
router.put('/:serviceId', serviceIdRule, updateRules, updateMyService);
router.patch(
  '/:serviceId/status',
  serviceIdRule,
  body('status')
    .isString().withMessage('Status must be text.')
    .bail()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be active or inactive.'),
  body().custom((_, { req }) => validateAllowedFields(req, new Set(['status']))),
  updateMyServiceStatus,
);
router.delete('/:serviceId', serviceIdRule, deleteMyService);

export default router;
