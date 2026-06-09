import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { prisma } from '@vacation-inbox/database';
import { aiService } from '../services/aiService';
import { emailService } from '../services/emailService';

const router = Router();

router.use(requireAuth);

// GET /emails - list emails for current user's vacation periods
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, priority, category, vacationId, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {
      recipientId: req.user!.id,
    };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (vacationId) where.vacationId = vacationId as string;

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        include: {
          aiAnalysis: true,
          reminders: { orderBy: { createdAt: 'desc' }, take: 1 },
          replies: { orderBy: { sentAt: 'desc' }, take: 1 },
        },
        orderBy: { receivedAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.email.count({ where }),
    ]);

    res.json({ emails, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// GET /emails/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const email = await prisma.email.findFirst({
      where: { id: req.params.id, recipientId: req.user!.id },
      include: {
        aiAnalysis: true,
        reminders: { orderBy: { createdAt: 'asc' } },
        replies: { orderBy: { sentAt: 'asc' } },
        vacation: { include: { colleague: true } },
      },
    });

    if (!email) return res.status(404).json({ error: 'Email not found' });
    res.json(email);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

// POST /emails/:id/delegate - manually delegate an email
router.post('/:id/delegate', async (req: Request, res: Response) => {
  try {
    const { colleagueId } = req.body;
    if (!colleagueId) return res.status(400).json({ error: 'colleagueId required' });

    const email = await prisma.email.findFirst({
      where: { id: req.params.id, recipientId: req.user!.id },
    });
    if (!email) return res.status(404).json({ error: 'Email not found' });

    const updated = await emailService.delegateEmail(email.id, colleagueId, req.user!.organizationId);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delegate email' });
  }
});

// POST /emails/:id/analyse - trigger AI analysis
router.post('/:id/analyse', async (req: Request, res: Response) => {
  try {
    const email = await prisma.email.findFirst({
      where: { id: req.params.id, recipientId: req.user!.id },
    });
    if (!email) return res.status(404).json({ error: 'Email not found' });

    const analysis = await aiService.analyseEmail(email);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: 'Failed to analyse email' });
  }
});

// PATCH /emails/:id/status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'DELEGATED', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED', 'IGNORED'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const email = await prisma.email.findFirst({
      where: { id: req.params.id, recipientId: req.user!.id },
    });
    if (!email) return res.status(404).json({ error: 'Email not found' });

    const updated = await prisma.email.update({
      where: { id: req.params.id },
      data: { status, handledAt: status === 'COMPLETED' ? new Date() : undefined },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update email status' });
  }
});

export default router;
