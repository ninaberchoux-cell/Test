import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { prisma } from '@vacation-inbox/database';

const router = Router();

router.use(requireAuth);
router.use(requireRole(['ORG_ADMIN', 'SUPER_ADMIN']));

// GET /admin/users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.organizationId = req.user!.organizationId;
    }
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, email: true, name: true, role: true, isActive: true,
        createdAt: true, organization: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /admin/users/:id/role
router.patch('/users/:id/role', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const validRoles = ['USER', 'MANAGER', 'ORG_ADMIN'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.organizationId !== req.user!.organizationId && req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// PATCH /admin/users/:id/deactivate
router.patch('/users/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// GET /admin/organizations (SUPER_ADMIN only)
router.get('/organizations', requireRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    const orgs = await prisma.organization.findMany({
      include: {
        _count: { select: { users: true, vacations: true, emails: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orgs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// GET /admin/audit-logs
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = {};
    if (req.user!.role !== 'SUPER_ADMIN') {
      where.organizationId = req.user!.organizationId;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ logs, total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
