import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import errorHandler from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import bookingsRouter from './routes/bookings.js';
import adminRouter from './routes/admin.js';

dotenv.config();

const app = express();

// --- Middleware ---

// Allow requests from the frontend origin
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

// Handle requests to undefined routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Central error handler (must be last)
app.use(errorHandler);

export default app;
