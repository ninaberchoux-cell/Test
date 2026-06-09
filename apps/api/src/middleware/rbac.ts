import { Response, NextFunction } from 'express';
import { Role } from '@vacation-inbox/database';
import { AuthRequest } from './auth';

const roleHierarchy: Record<string, number> = {
  [Role.SUPER_ADMIN]: 4,
  [Role.ORG_ADMIN]: 3,
  [Role.MANAGER]: 2,
  [Role.USER]: 1,
};

export const requireRole = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const userRoleLevel = roleHierarchy[req.user.role] || 0;
    const requiredLevel = Math.min(...roles.map((r) => roleHierarchy[r] || 0));

    if (userRoleLevel < requiredLevel) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

export const requireSameOrg = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const orgIdFromParam = req.params.organizationId || req.body.organizationId;
  if (orgIdFromParam && orgIdFromParam !== req.user?.organizationId) {
    if (req.user?.role !== Role.SUPER_ADMIN) {
      res.status(403).json({ error: 'Access denied to this organization' });
      return;
    }
  }
  next();
};

export const requireOwnershipOrAdmin = (
  getResourceOwnerId: (req: AuthRequest) => Promise<string | null>
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const isSuperAdmin = req.user.role === Role.SUPER_ADMIN;
      const isOrgAdmin = req.user.role === Role.ORG_ADMIN;

      if (isSuperAdmin || isOrgAdmin) {
        next();
        return;
      }

      const ownerId = await getResourceOwnerId(req);
      if (ownerId !== req.user.id) {
        res.status(403).json({ error: 'Access denied to this resource' });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Authorization error' });
    }
  };
};
