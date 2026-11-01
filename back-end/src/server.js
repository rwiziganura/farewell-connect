import app from './app.js';
import dotenv from 'dotenv';
import { testConnection } from './config/database.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Verify the database connection before the server starts accepting traffic.
// If the connection fails the process exits immediately with a clear message
// so the problem is visible right away rather than surfacing as request errors.
testConnection()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`API health:  http://localhost:${PORT}/api/health`);
      console.log(`DB health:   http://localhost:${PORT}/api/health/db`);
    });
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
