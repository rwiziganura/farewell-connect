import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createFields,
  createService,
  deleteMyService,
  getActiveCategories,
  getPublicServiceDetails,
  getPublicServices,
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

const publicServiceQueryRules = [
  query('search')
    .optional()
    .isString().withMessage('Search must be text.')
    .bail()
    .trim()
    .notEmpty().withMessage('Search must not be empty.')
    .isLength({ max: 100 }).withMessage('Search must be 100 characters or fewer.'),
  query('category')
    .optional()
    .custom(isPositiveBigIntId)
    .withMessage('Category must be a positive integer.'),
  query('district')
    .optional()
    .isString().withMessage('District must be text.')
    .bail()
    .trim()
    .notEmpty().withMessage('District must not be empty.')
    .isLength({ max: 100 }).withMessage('District must be 100 characters or fewer.'),
  query('minPrice')
    .optional()
    .custom(isValidPrice)
    .withMessage('Minimum price must be non-negative with at most 2 decimal places.'),
  query('maxPrice')
    .optional()
    .custom(isValidPrice)
    .withMessage('Maximum price must be non-negative with at most 2 decimal places.'),
  query('page')
    .optional()
    .isString().withMessage('Page must be a positive integer.')
    .bail()
    .matches(/^[1-9]\d{0,5}$/).withMessage('Page must be between 1 and 999999.'),
  query('limit')
    .optional()
    .isString().withMessage('Limit must be an integer between 1 and 50.')
    .bail()
    .matches(/^(?:[1-9]|[1-4]\d|50)$/)
    .withMessage('Limit must be an integer between 1 and 50.'),
];

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

router.get('/', publicServiceQueryRules, getPublicServices);
router.get('/my', authenticate, authorise('provider'), getMyServices);
router.get('/my/:serviceId', authenticate, authorise('provider'), serviceIdRule, getMyService);
router.get('/categories', authenticate, authorise('provider'), getActiveCategories);
router.get('/:serviceId', serviceIdRule, getPublicServiceDetails);

router.use(authenticate, authorise('provider'));

router.post('/', creationRules, createService);
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
