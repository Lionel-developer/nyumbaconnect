const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config({ path: path.join(__dirname, '.env') });

require('./src/models/Property');
require('./src/models/Transaction');

const authRoutes = require('./src/routes/authRouters');
const propertyRoutes = require('./src/routes/propertyRoutes');

const app = express();

app.disable('x-powered-by');
app.use(helmet());

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);

const connectDatabase = async () => {
  const { MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    console.warn('MONGODB_URI is not set. Starting API without database connection.');
    return;
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
};

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);

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

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

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

  app.listen(PORT, () => {
    console.log(`NyumbaConnect server running on port ${PORT}`);
  });
})();
