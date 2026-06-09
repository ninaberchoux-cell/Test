import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { authRouter } from './routes/auth';
import { vacationRouter } from './routes/vacation';
import { emailsRouter } from './routes/emails';
import { delegationRouter } from './routes/delegation';
import { analyticsRouter } from './routes/analytics';
import { webhooksRouter } from './routes/webhooks';
import { aiRouter } from './routes/ai';
import { adminRouter } from './routes/admin';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './lib/logger';
import { initQueues } from './jobs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// Body parsing - webhooks need raw body
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/vacations', vacationRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/delegation', delegationRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/ai', aiRouter);
app.use('/api/admin', adminRouter);

// Error handling
app.use(errorHandler);

// Initialize Bull queues
initQueues();

app.listen(PORT, () => {
  logger.info(`API server running on port ${PORT}`);
});

export default app;
