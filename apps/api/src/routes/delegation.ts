import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '@vacation-inbox/database';

const router = Router();

router.use(requireAuth);

// GET /delegations - emails delegated TO the current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { delegatedTo: req.user!.id };
    if (status) where.status = status;

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        include: {
          aiAnalysis: true,
          recipient: { select: { id: true, name: true, email: true } },
          vacation: { select: { id: true, startDate: true, endDate: true } },
          replies: { orderBy: { sentAt: 'desc' }, take: 1 },
          reminders: { where: { status: 'PENDING' } },
        },
        orderBy: [{ priority: 'asc' }, { receivedAt: 'desc' }],
        skip,
        take: parseInt(limit as string),
      }),
      prisma.email.count({ where }),
    ]);

    res.json({ emails, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch delegations' });
  }
});

// GET /delegations/stats - summary stats for delegate
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [pending, completed, escalated, urgent] = await Promise.all([
      prisma.email.count({ where: { delegatedTo: req.user!.id, status: 'DELEGATED' } }),
      prisma.email.count({ where: { delegatedTo: req.user!.id, status: 'COMPLETED' } }),
      prisma.email.count({ where: { delegatedTo: req.user!.id, status: 'ESCALATED' } }),
      prisma.email.count({ where: { delegatedTo: req.user!.id, priority: 'URGENT', status: { not: 'COMPLETED' } } }),
    ]);

    res.json({ pending, completed, escalated, urgent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch delegation stats' });
  }
});

// PATCH /delegations/:id/accept
router.patch('/:id/accept', async (req: Request, res: Response) => {
  try {
    const email = await prisma.email.findFirst({
      where: { id: req.params.id, delegatedTo: req.user!.id },
    });
    if (!email) return res.status(404).json({ error: 'Delegation not found' });

    const updated = await prisma.email.update({
      where: { id: req.params.id },
      data: { status: 'IN_PROGRESS' },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept delegation' });
  }
});

// PATCH /delegations/:id/complete
router.patch('/:id/complete', async (req: Request, res: Response) => {
  try {
    const email = await prisma.email.findFirst({
      where: { id: req.params.id, delegatedTo: req.user!.id },
    });
    if (!email) return res.status(404).json({ error: 'Delegation not found' });

    const updated = await prisma.email.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED', handledAt: new Date() },
    });

    // Cancel pending reminders
    await prisma.reminder.updateMany({
      where: { emailId: req.params.id, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete delegation' });
  }
});

export default router;
