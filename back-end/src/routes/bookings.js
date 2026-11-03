import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  createCustomerBooking,
  getMyBookings,
  getProviderBookings,
  isPositiveBigIntId,
  patchProviderBookingStatus,
  parseFutureBookingDate,
} from '../controllers/bookingController.js';
import { authenticate, authorise } from '../middleware/auth.js';

const router = Router();

const bookingCreationRules = [
  body('service_id')
    .custom(isPositiveBigIntId)
    .withMessage('Service ID must be a positive integer.'),
  body('booking_date')
    .custom((value) => parseFutureBookingDate(value) !== null)
    .withMessage('Booking date must be a valid future ISO 8601 date-time with a timezone.'),
  body('customer_message')
    .optional({ nullable: true })
    .isString().withMessage('Customer message must be text.')
    .bail()
    .trim()
    .isLength({ max: 5000 }).withMessage('Customer message must be 5000 characters or fewer.'),
  body('service_address')
    .optional({ nullable: true })
    .isString().withMessage('Service address must be text.')
    .bail()
    .trim()
    .isLength({ max: 255 }).withMessage('Service address must be 255 characters or fewer.'),
  body('district')
    .optional({ nullable: true })
    .isString().withMessage('District must be text.')
    .bail()
    .trim()
    .isLength({ max: 100 }).withMessage('District must be 100 characters or fewer.'),
];

const bookingStatusRules = [
  param('bookingId')
    .custom(isPositiveBigIntId)
    .withMessage('Booking ID must be a positive integer.'),
  body('status')
    .isString().withMessage('Status must be a string.')
    .bail()
    .isIn(['Accepted', 'Rejected', 'Confirmed', 'Completed', 'Cancelled', 'accepted', 'rejected', 'confirmed', 'completed', 'cancelled'])
    .withMessage('Status must be Accepted, Rejected, Confirmed, Completed, or Cancelled.'),
  body('cancellation_reason')
    .optional({ nullable: true })
    .isString().withMessage('Cancellation reason must be text.')
    .bail()
    .trim()
    .isLength({ max: 5000 }).withMessage('Cancellation reason must be 5000 characters or fewer.'),
];

router.post(
  '/',
  authenticate,
  authorise('customer'),
  bookingCreationRules,
  createCustomerBooking,
);
router.get('/my', authenticate, authorise('customer'), getMyBookings);
router.get('/provider', authenticate, authorise('provider'), getProviderBookings);
router.patch(
  '/:bookingId/status',
  authenticate,
  authorise('provider'),
  bookingStatusRules,
  patchProviderBookingStatus,
);

export default router;
