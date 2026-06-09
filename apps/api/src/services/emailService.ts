import { prisma } from '@vacation-inbox/database';
import { graphService } from './graphService';
import { aiService } from './aiService';
import { reminderService } from './reminderService';
import { logger } from '../lib/logger';

class EmailService {
  async processIncomingEmail(messageId: string, subscriptionId: string): Promise<void> {
    try {
      // Find which user this subscription belongs to
      const vacation = await prisma.vacationPeriod.findFirst({
        where: { status: 'ACTIVE', endDate: { gte: new Date() } },
        include: { user: true, colleague: true },
      });

      if (!vacation) {
        logger.info('No active vacation for subscription', { subscriptionId });
        return;
      }

      if (!vacation.user.accessToken) return;
      const accessToken = vacation.user.accessToken; // TODO: decrypt

      // Fetch full message from Graph
      const message = await graphService.getMessage(accessToken, messageId);

      // Check if already processed
      const existing = await prisma.email.findUnique({ where: { messageId } });
      if (existing) return;

      // Store email record
      const email = await prisma.email.create({
        data: {
          messageId,
          organizationId: vacation.user.organizationId,
          recipientId: vacation.userId,
          vacationId: vacation.id,
          subject: message.subject || '(no subject)',
          fromAddress: message.from.emailAddress.address,
          fromName: message.from.emailAddress.name,
          bodyPreview: message.bodyPreview,
          receivedAt: new Date(message.receivedDateTime),
          isDelegated: false,
        },
      });

      // AI triage
      const analysis = await aiService.analyseEmail(email);

      // Tag email in Outlook
      await graphService.tagMessage(accessToken, messageId, 'Vacation Coverage');

      // Delegate to colleague
      await this.delegateEmail(email.id, vacation.colleagueId, vacation.user.organizationId);

      // Forward email
      await graphService.forwardMessage(
        accessToken,
        messageId,
        vacation.colleague.email,
        `[Vacation Coverage] ${vacation.user.name} is on vacation until ${vacation.endDate.toDateString()}. Please handle this email.`
      );

      // Schedule reminders
      await reminderService.scheduleReminders(email.id, vacation.colleagueId, {
        firstReminderHours: vacation.reminderHours,
        secondReminderHours: vacation.secondReminderHours,
        escalationHours: vacation.escalationHours,
      });

      logger.info('Email processed and delegated', { emailId: email.id, messageId });
    } catch (err) {
      logger.error('Failed to process incoming email', { messageId, err });
    }
  }

  async delegateEmail(emailId: string, colleagueId: string, organizationId: string) {
    const updated = await prisma.email.update({
      where: { id: emailId },
      data: {
        isDelegated: true,
        delegatedTo: colleagueId,
        status: 'DELEGATED',
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        action: 'EMAIL_DELEGATED',
        resource: 'email',
        resourceId: emailId,
        metadata: { colleagueId },
      },
    });

    return updated;
  }

  async checkReplyAndComplete(messageId: string, userId: string): Promise<void> {
    const email = await prisma.email.findFirst({
      where: { messageId, delegatedTo: userId },
    });
    if (!email) return;

    await prisma.email.update({
      where: { id: email.id },
      data: { status: 'COMPLETED', handledAt: new Date() },
    });

    await prisma.reminder.updateMany({
      where: { emailId: email.id, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    // Move to "Handled During Leave" folder
    const vacation = email.vacationId
      ? await prisma.vacationPeriod.findUnique({
          where: { id: email.vacationId },
          include: { user: true },
        })
      : null;

    if (vacation?.user.accessToken) {
      try {
        const folderId = await graphService.createMailFolder(
          vacation.user.accessToken,
          'Handled During Leave'
        );
        await graphService.moveMessageToFolder(vacation.user.accessToken, messageId, folderId);
      } catch (err) {
        logger.warn('Failed to move message to folder', { err });
      }
    }
  }
}

export const emailService = new EmailService();
