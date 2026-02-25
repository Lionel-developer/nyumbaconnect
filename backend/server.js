const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config({ path: path.join(__dirname, '.env') });

// Models
require('./src/models/Property');
require('./src/models/Transaction');

// Routes
const authRoutes = require('./src/routes/authRouters');
const propertyRoutes = require('./src/routes/propertyRoutes');

const app = express();

app.disable('x-powered-by');
app.use(helmet());

// ✅ CORS (LAN + localhost) + ✅ preflight fix (no "*" crash)
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.100.37:3000',
];

app.use(
  cors({
    origin: (origin, cb) => {
      // allow requests with no origin (Postman/curl/server-to-server)
      if (!origin) return cb(null, true);

      if (allowedOrigins.includes(origin)) return cb(null, true);

      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ✅ Preflight (Express/router-safe)
app.options(/.*/, cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Rate limiting (skip OPTIONS so preflight never breaks)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});
app.use('/api/auth', authLimiter);

// ✅ Static uploads (must be before 404)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const connectDatabase = async () => {
  const { MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    console.warn('MONGODB_URI is not set. Starting API without database connection.');
    return;
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);

// Root
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to NyumbaConnect API',
    status: 'active',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile (protected)',
      },
      properties: {
        list: 'GET /api/properties',
        details: 'GET /api/properties/:id',
        mine: 'GET /api/properties/my-properties (protected: landlord/agent)',
        create: 'POST /api/properties (protected: landlord/agent)',
      },
    },
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});


// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDatabase();
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
  }

  // ✅ bind to all interfaces so LAN devices can reach it
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NyumbaConnect server running on port ${PORT}`);
  });
})();