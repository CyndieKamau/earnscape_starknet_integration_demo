import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ENV } from './config/env';
import { requirePrivyAuth, verifyPrivyAuth } from './middleware/auth';

// Import routes
import walletRoutes from './routes/wallet';
import authRoutes from './routes/auth';
import debugPrivy from './routes/privy-diagnostic';

console.log('🔧 Server Configuration:');
console.log('  PRIVY_APP_ID:', ENV.PRIVY_APP_ID);
console.log('  PORT:', ENV.PORT);
console.log('  CLIENT_URL:', ENV.CLIENT_URL);
console.log('  NODE_ENV:', ENV.NODE_ENV);

const app = express();

// ====================================
// Request Logger 
// ====================================
// This MUST come before other middleware to see ALL requests
app.use((req, res, next) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📨 INCOMING REQUEST');
  console.log('  Time:', new Date().toISOString());
  console.log('  Method:', req.method);
  console.log('  URL:', req.url);
  console.log('  Path:', req.path);
  console.log('  IP:', req.ip);
  console.log('  Origin:', req.get('origin') || 'none');
  console.log('  Authorization:', req.get('authorization') ? '✅ Present' : '❌ Missing');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  next();
});

// ====================================
// Standard Middleware
// ====================================
app.use(helmet());

// CORS - Allow all origins in development
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(morgan('dev'));

// ====================================
// Health Check (NO AUTH)
// ====================================
app.get('/healthz', (_req, res) => {
  console.log('✅ Health check hit');
  res.json({ 
    status: 'ok', 
    env: ENV.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ====================================
// Auth Test Endpoint (OPTIONAL AUTH)
// ====================================
// Use verifyPrivyAuth (non-fatal) instead of requirePrivyAuth
// This allows the endpoint to work even without a token for debugging
app.get('/auth/me', verifyPrivyAuth, (req, res) => {
  console.log('🔍 /api/auth/me endpoint hit');
  console.log('  Auth:', req.auth ? '✅ Present' : '❌ Missing');
  
  if (req.auth?.userId) {
    // User is authenticated
    res.json({
      success: true,
      userId: req.auth.userId,
      authenticated: true,
      message: 'User authenticated successfully',
    });
  } else {
    // No auth token provided or invalid token
    res.json({
      success: false,
      authenticated: false,
      message: 'No valid auth token provided',
    });
  }
});

// ====================================
// API Routes
// ====================================
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/debug', debugPrivy);

// ====================================
// 404 Handler
// ====================================
app.use((req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.path);
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method,
  });
});

// ====================================
// Error Handler
// ====================================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ SERVER ERROR');
  console.error('  Path:', req.path);
  console.error('  Method:', req.method);
  console.error('  Error:', err);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// ====================================
// Start Server
// ====================================
const PORT = ENV.PORT || 4000;
const HOST = '0.0.0.0'; 

app.listen(PORT, HOST, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Earnscape Backend Server Started');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Environment: ${ENV.NODE_ENV}`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Host: ${HOST} (listening on all interfaces)`);
  console.log(`  Local: http://localhost:${PORT}`);
  console.log(`  Network: http://192.168.110.89:${PORT} (update with your IP)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📱 React Native should connect to:');
  console.log(`   http://YOUR_LAPTOP_IP:${PORT}/api`);
  console.log('');
  console.log('🧪 Test with:');
  console.log(`   curl http://localhost:${PORT}/healthz`);
  console.log(`   curl http://192.168.110.89:${PORT}/healthz`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});