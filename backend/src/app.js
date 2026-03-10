require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes       = require('./routes/auth');
const clockRoutes      = require('./routes/clock');
const employeeRoutes   = require('./routes/employee');
const supervisorRoutes = require('./routes/supervisor');
const hrRoutes         = require('./routes/hr');
const { startCronJobs } = require('./services/cronService');

const app = express();

// Accept requests from both localhost (PC browser) and the LAN IP (phone)
const allowedOrigins = [
  'http://localhost:5173',
  'https://localhost:5173',
];
if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)
      || /^https?:\/\/192\.168\./.test(origin)
      || /^https?:\/\/10\./.test(origin)
      || /^https?:\/\/172\./.test(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth',       authRoutes);
app.use('/api/clock',      clockRoutes);
app.use('/api/employee',   employeeRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api/hr',         hrRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// 404 for unknown /api routes only
app.all('/api/{*path}', (_req, res) => res.status(404).json({ error: 'Route not found' }));

// In production, serve the built React frontend
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('{*path}', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start cron jobs
startCronJobs();

module.exports = app;
