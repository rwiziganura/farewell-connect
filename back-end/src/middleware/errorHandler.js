// Central error handler — catches any error passed via next(error) in routes/controllers
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Log the full error in development only
  if (process.env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${req.method} ${req.url} →`, err);
  }

  res.status(status).json({
    success: false,
    message,
  });
};

export default errorHandler;
