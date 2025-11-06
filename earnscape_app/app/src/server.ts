// Express
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ENV } from './config/env.js';
import { requirePrivyAuth } from './middleware/auth.js';

console.log('Using PRIVY_APP_ID:', ENV.PRIVY_APP_ID);

const app = express();

// --- Middleware ---
app.use(helmet());
app.use(cors({ origin: ENV.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// --- Health check route ---
app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', env: ENV.NODE_ENV });
});

// --- Protected route to test Privy Auth ---
app.get('/auth/me', requirePrivyAuth, (req, res) => {
  res.json({
    success: true,
    userId: req.auth?.userId,
    authenticated: true,
    message: 'User authenticated successfully',
  });
});

// --- Start server ---
app.listen(ENV.PORT, () => {
  console.log(`🚀 Earnscape backend running on port ${ENV.PORT}`);
});