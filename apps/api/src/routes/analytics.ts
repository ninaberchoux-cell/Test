import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { analyticsService } from '../services/analyticsService';

const router = Router();

router.use(requireAuth);

// GET /analytics/overview - dashboard summary
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const data = await analyticsService.getOverview(req.user!.organizationId, req.user!.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

// GET /analytics/response-time - response time trends
router.get('/response-time', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const data = await analyticsService.getResponseTimeTrends(
      req.user!.organizationId,
      req.user!.id,
      parseInt(days as string)
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch response time data' });
  }
});

// GET /analytics/email-volume - email volume by day
router.get('/email-volume', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const data = await analyticsService.getEmailVolume(
      req.user!.organizationId,
      req.user!.id,
      parseInt(days as string)
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch email volume' });
  }
});

// GET /analytics/categories - email breakdown by category
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const data = await analyticsService.getCategoryBreakdown(req.user!.organizationId, req.user!.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch category data' });
  }
});

// GET /analytics/sla - SLA compliance metrics
router.get('/sla', async (req: Request, res: Response) => {
  try {
    const data = await analyticsService.getSLAMetrics(req.user!.organizationId, req.user!.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch SLA metrics' });
  }
});

// GET /analytics/org - org-wide analytics (admin only)
router.get('/org', requireRole(['ORG_ADMIN', 'SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const data = await analyticsService.getOrgAnalytics(req.user!.organizationId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch org analytics' });
  }
});

export default router;
