import Queue from 'bull';
import { emailService } from '../services/emailService';
import { logger } from '../lib/logger';

export const emailProcessorQueue = new Queue('email-processor', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

emailProcessorQueue.process('process-email', async (job) => {
  const { messageId, subscriptionId } = job.data;
  logger.info('Processing email job', { messageId, jobId: job.id });
  await emailService.processIncomingEmail(messageId, subscriptionId);
});

emailProcessorQueue.on('completed', (job) => {
  logger.info('Email processor job completed', { jobId: job.id });
});

emailProcessorQueue.on('failed', (job, err) => {
  logger.error('Email processor job failed', { jobId: job.id, err: err.message });
});
