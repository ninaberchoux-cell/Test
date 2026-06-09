import { reminderQueue } from '../jobs/reminderJob';
import { prisma } from '@vacation-inbox/database';
import { logger } from '../lib/logger';

interface ReminderConfig {
  firstReminderHours: number;
  secondReminderHours: number;
  escalationHours: number;
}

class ReminderService {
  async scheduleReminders(emailId: string, userId: string, config: ReminderConfig): Promise<void> {
    const now = Date.now();

    const reminders = [
      { type: 'FIRST', delayMs: config.firstReminderHours * 3600 * 1000 },
      { type: 'SECOND', delayMs: config.secondReminderHours * 3600 * 1000 },
      { type: 'ESCALATION', delayMs: config.escalationHours * 3600 * 1000 },
    ];

    for (const r of reminders) {
      const scheduledAt = new Date(now + r.delayMs);

      const reminder = await prisma.reminder.create({
        data: {
          emailId,
          userId,
          type: r.type as any,
          channel: 'EMAIL',
          scheduledAt,
          status: 'PENDING',
        },
      });

      await reminderQueue.add(
        'send-reminder',
        { reminderId: reminder.id, emailId, userId, type: r.type },
        { delay: r.delayMs, jobId: `reminder-${reminder.id}` }
      );

      logger.info('Reminder scheduled', { reminderId: reminder.id, type: r.type, scheduledAt });
    }
  }

  async cancelReminders(emailId: string): Promise<void> {
    const pending = await prisma.reminder.findMany({
      where: { emailId, status: 'PENDING' },
    });

    for (const r of pending) {
      const job = await reminderQueue.getJob(`reminder-${r.id}`);
      if (job) await job.remove();
    }

    await prisma.reminder.updateMany({
      where: { emailId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
  }

  async sendReminder(reminderId: string): Promise<void> {
    const reminder = await prisma.reminder.findUnique({
      where: { id: reminderId },
      include: {
        email: { include: { recipient: true } },
        user: true,
      },
    });

    if (!reminder || reminder.status !== 'PENDING') return;

    // Check if email was already handled
    if (reminder.email.status === 'COMPLETED') {
      await prisma.reminder.update({ where: { id: reminderId }, data: { status: 'CANCELLED' } });
      return;
    }

    try {
      // Send via email channel
      if (reminder.channel === 'EMAIL') {
        // Would use graphService to send - simplified here
        logger.info('Sending email reminder', {
          to: reminder.user.email,
          emailSubject: reminder.email.subject,
          type: reminder.type,
        });
      }

      await prisma.reminder.update({
        where: { id: reminderId },
        data: { status: 'SENT', sentAt: new Date() },
      });

      // If escalation, update email status
      if (reminder.type === 'ESCALATION') {
        await prisma.email.update({
          where: { id: reminder.emailId },
          data: { status: 'ESCALATED' },
        });
      }
    } catch (err) {
      await prisma.reminder.update({
        where: { id: reminderId },
        data: { status: 'FAILED' },
      });
      logger.error('Failed to send reminder', { reminderId, err });
      throw err;
    }
  }
}

export const reminderService = new ReminderService();
