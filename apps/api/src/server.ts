import express, { ErrorRequestHandler, Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './env';
import { realtime } from './realtime/gateway';
import { HttpError } from './utils/errors';

import authRoutes from './routes/auth';
import restaurantRoutes, { searchRouter } from './routes/restaurants';
import cartRoutes from './routes/cart';
import orderRoutes from './routes/orders';
import addressRoutes from './routes/addresses';
import merchantRoutes from './routes/merchant';
import courierRoutes from './routes/courier';
import adminRoutes from './routes/admin';
import aiRoutes from './routes/ai';
import supportRoutes from './routes/support';
import notificationRoutes from './routes/notifications';
import paymentRoutes from './routes/payments';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()), credentials: true }));
app.use(compression());
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Stripe webhooks need the raw body — must come BEFORE the json parser.
app.use('/payments/webhooks', paymentRoutes);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limit
app.use(
  rateLimit({
    windowMs: 60_000,
    max: env.NODE_ENV === 'development' ? 1000 : 200,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.get('/', (_req, res) => res.json({ name: 'Food Delivery API', version: '1.0.0' }));

app.use('/auth', authRoutes);
app.use('/restaurants', restaurantRoutes);
app.use('/search', searchRouter);
app.use('/cart', cartRoutes);
app.use('/orders', orderRoutes);
app.use('/addresses', addressRoutes);
app.use('/merchant', merchantRoutes);
app.use('/courier', courierRoutes);
app.use('/admin', adminRoutes);
app.use('/ai', aiRoutes);
app.use('/support', supportRoutes);
app.use('/notifications', notificationRoutes);
app.use('/payments', paymentRoutes);

// 404
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

// Error handler
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if ((err as { status?: number })?.status) {
    return res.status((err as { status: number }).status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
};
app.use(errorHandler);

const server = http.createServer(app);
realtime.attach(server);

server.listen(env.PORT, env.HOST, () => {
  console.log(`🚀 Food API listening on http://${env.HOST}:${env.PORT}`);
  console.log(`🔌 WebSocket on ws://${env.HOST}:${env.PORT}/ws`);
});

process.on('unhandledRejection', (e) => console.error('unhandledRejection', e));
process.on('uncaughtException', (e) => console.error('uncaughtException', e));

export default app;
