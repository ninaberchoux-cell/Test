import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '@vacation-inbox/database';
import { aiService } from '../services/aiService';

const router = Router();

router.use(requireAuth);

// POST /ai/summarize/:emailId
router.post('/summarize/:emailId', async (req: Request, res: Response) => {
  try {
    const email = await prisma.email.findFirst({
      where: {
        id: req.params.emailId,
        OR: [{ recipientId: req.user!.id }, { delegatedTo: req.user!.id }],
      },
    });
    if (!email) return res.status(404).json({ error: 'Email not found' });

    const analysis = await aiService.analyseEmail(email);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: 'AI analysis failed' });
  }
});

// POST /ai/draft/:emailId - generate draft reply
router.post('/draft/:emailId', async (req: Request, res: Response) => {
  try {
    const { tone = 'professional' } = req.body;
    const email = await prisma.email.findFirst({
      where: {
        id: req.params.emailId,
        OR: [{ recipientId: req.user!.id }, { delegatedTo: req.user!.id }],
      },
      include: { aiAnalysis: true },
    });
    if (!email) return res.status(404).json({ error: 'Email not found' });

    const draft = await aiService.generateDraft(email, tone);
    res.json({ draft });
  } catch (err) {
    res.status(500).json({ error: 'Draft generation failed' });
  }
});

// POST /ai/vacation-summary/:vacationId
router.post('/vacation-summary/:vacationId', async (req: Request, res: Response) => {
  try {
    const vacation = await prisma.vacationPeriod.findFirst({
      where: { id: req.params.vacationId, userId: req.user!.id },
    });
    if (!vacation) return res.status(404).json({ error: 'Vacation not found' });

    const summary = await aiService.generateVacationSummary(vacation.id);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Vacation summary generation failed' });
  }
});

// GET /ai/summary/:vacationId - get existing summary
router.get('/summary/:vacationId', async (req: Request, res: Response) => {
  try {
    const summary = await prisma.vacationSummary.findFirst({
      where: {
        vacation: { id: req.params.vacationId, userId: req.user!.id },
      },
      include: { vacation: true },
    });
    if (!summary) return res.status(404).json({ error: 'Summary not found' });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

export default router;
