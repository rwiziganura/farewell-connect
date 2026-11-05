import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import errorHandler from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import bookingsRouter from './routes/bookings.js';
import adminRouter from './routes/admin.js';
import servicesRouter from './routes/services.js';
import usersRouter from './routes/users.js';
import favoritesRouter from './routes/favorites.js';
import providersRouter from './routes/providers.js';

dotenv.config();

const app = express();

// --- Middleware ---

const allowedOrigins = new Set([
  process.env.FRONTEND_URL || 'https://farewell-connect.vercel.app',
  'http://localhost:3000',
]);

app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  },
  credentials: true,
}));

// Parse incoming JSON request bodies
app.use(express.json());

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/services', servicesRouter);
app.use('/api/users', usersRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/providers', providersRouter);

// Handle requests to undefined routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Central error handler (must be last)
app.use(errorHandler);

export default app;
