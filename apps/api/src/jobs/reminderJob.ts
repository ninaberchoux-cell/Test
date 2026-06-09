import Queue from 'bull';
import { redis } from '../lib/redis';
import { reminderService } from '../services/reminderService';
import { logger } from '../lib/logger';

export const reminderQueue = new Queue('reminders', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
});

reminderQueue.process('send-reminder', async (job) => {
  const { reminderId } = job.data;
  logger.info('Processing reminder job', { reminderId, jobId: job.id });
  await reminderService.sendReminder(reminderId);
});

reminderQueue.on('completed', (job) => {
  logger.info('Reminder job completed', { jobId: job.id });
});

reminderQueue.on('failed', (job, err) => {
  logger.error('Reminder job failed', { jobId: job.id, err: err.message });
});

reminderQueue.on('stalled', (job) => {
  logger.warn('Reminder job stalled', { jobId: job.id });
});
