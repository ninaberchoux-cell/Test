import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma, VacationStatus } from '@vacation-inbox/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { Role } from '@vacation-inbox/database';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import { scheduleVacationReminders } from '../jobs/reminderJob';

export const vacationRouter = Router();
vacationRouter.use(authenticate);

// List vacations
vacationRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { organizationId: req.user!.organizationId };
    if (req.user!.role === Role.USER) where.userId = req.user!.id;
    if (status) where.status = status;

    const [vacations, total] = await Promise.all([
      prisma.vacationPeriod.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          colleague: { select: { id: true, name: true, email: true } },
          _count: { select: { emails: true } },
        },
        orderBy: { startDate: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.vacationPeriod.count({ where }),
    ]);

    res.json({ vacations, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (err) {
    logger.error('List vacations error:', err);
    res.status(500).json({ error: 'Failed to fetch vacations' });
  }
});

// Get single vacation
vacationRouter.get('/:id', param('id').isString(), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vacation = await prisma.vacationPeriod.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user!.organizationId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        colleague: { select: { id: true, name: true, email: true } },
        emails: {
          include: { aiAnalysis: true },
          orderBy: { receivedAt: 'desc' },
          take: 20,
        },
        summaryReport: true,
      },
    });

    if (!vacation) {
      res.status(404).json({ error: 'Vacation not found' });
      return;
    }

    res.json(vacation);
  } catch (err) {
    logger.error('Get vacation error:', err);
    res.status(500).json({ error: 'Failed to fetch vacation' });
  }
});

// Create vacation
vacationRouter.post(
  '/',
  [
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('colleagueId').isString().notEmpty(),
    body('reminderHours').optional().isInt({ min: 1, max: 72 }),
    body('secondReminderHours').optional().isInt({ min: 1, max: 72 }),
    body('escalationHours').optional().isInt({ min: 1, max: 168 }),
    body('oooMessage').optional().isString(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const { startDate, endDate, colleagueId, reminderHours, secondReminderHours, escalationHours, oooMessage } = req.body;

      if (new Date(startDate) >= new Date(endDate)) {
        res.status(400).json({ error: 'End date must be after start date' });
        return;
      }

      const colleague = await prisma.user.findFirst({
        where: { id: colleagueId, organizationId: req.user!.organizationId, isActive: true },
      });
      if (!colleague) {
        res.status(404).json({ error: 'Colleague not found' });
        return;
      }

      const vacation = await prisma.vacationPeriod.create({
        data: {
          userId: req.user!.id,
          organizationId: req.user!.organizationId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          colleagueId,
          reminderHours: reminderHours || 4,
          secondReminderHours: secondReminderHours || 8,
          escalationHours: escalationHours || 24,
          oooMessage,
          status: VacationStatus.SCHEDULED,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          colleague: { select: { id: true, name: true, email: true } },
        },
      });

      await prisma.auditLog.create({
        data: {
          organizationId: req.user!.organizationId,
          userId: req.user!.id,
          action: 'CREATE',
          resource: 'vacation',
          resourceId: vacation.id,
        },
      });

      // Schedule reminders
      await scheduleVacationReminders(vacation.id);

      res.status(201).json(vacation);
    } catch (err) {
      logger.error('Create vacation error:', err);
      res.status(500).json({ error: 'Failed to create vacation' });
    }
  }
);

// Update vacation
vacationRouter.put(
  '/:id',
  [
    param('id').isString(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('colleagueId').optional().isString(),
    body('oooMessage').optional().isString(),
    body('status').optional().isIn(Object.values(VacationStatus)),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    try {
      const existing = await prisma.vacationPeriod.findFirst({
        where: { id: req.params.id, organizationId: req.user!.organizationId },
      });

      if (!existing) {
        res.status(404).json({ error: 'Vacation not found' });
        return;
      }

      if (existing.userId !== req.user!.id && req.user!.role === Role.USER) {
        res.status(403).json({ error: 'Not authorized to update this vacation' });
        return;
      }

      const updated = await prisma.vacationPeriod.update({
        where: { id: req.params.id },
        data: {
          ...(req.body.startDate && { startDate: new Date(req.body.startDate) }),
          ...(req.body.endDate && { endDate: new Date(req.body.endDate) }),
          ...(req.body.colleagueId && { colleagueId: req.body.colleagueId }),
          ...(req.body.oooMessage !== undefined && { oooMessage: req.body.oooMessage }),
          ...(req.body.status && { status: req.body.status }),
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          colleague: { select: { id: true, name: true, email: true } },
        },
      });

      res.json(updated);
    } catch (err) {
      logger.error('Update vacation error:', err);
      res.status(500).json({ error: 'Failed to update vacation' });
    }
  }
);

// Delete vacation
vacationRouter.delete('/:id', param('id').isString(), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.vacationPeriod.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Vacation not found' });
      return;
    }

    if (existing.userId !== req.user!.id && req.user!.role === Role.USER) {
      res.status(403).json({ error: 'Not authorized to delete this vacation' });
      return;
    }

    if (existing.status === VacationStatus.ACTIVE) {
      res.status(400).json({ error: 'Cannot delete an active vacation. Cancel it first.' });
      return;
    }

    await prisma.vacationPeriod.update({
      where: { id: req.params.id },
      data: { status: VacationStatus.CANCELLED },
    });

    res.json({ message: 'Vacation cancelled successfully' });
  } catch (err) {
    logger.error('Delete vacation error:', err);
    res.status(500).json({ error: 'Failed to delete vacation' });
  }
});
