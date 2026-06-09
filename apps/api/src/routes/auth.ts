import { Router, Request, Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { prisma, Role } from '@vacation-inbox/database';
import { logger } from '../lib/logger';
import { authenticate, AuthRequest } from '../middleware/auth';

export const authRouter = Router();

const MICROSOFT_TENANT = process.env.MICROSOFT_TENANT_ID || 'common';
const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!;
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET!;
const REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:4000/api/auth/callback';

// Initiate Microsoft OAuth flow
authRouter.get('/login', (_req: Request, res: Response) => {
  const scopes = [
    'openid',
    'profile',
    'email',
    'offline_access',
    'Mail.Read',
    'Mail.Send',
    'Calendars.Read',
    'User.Read',
  ].join(' ');

  const authUrl =
    `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&response_mode=query`;

  res.json({ authUrl });
});

// OAuth callback
authRouter.get('/callback', async (req: Request, res: Response): Promise<void> => {
  const { code, error } = req.query;

  if (error) {
    res.redirect(`${process.env.FRONTEND_URL}/login?error=${error}`);
    return;
  }

  if (!code) {
    res.status(400).json({ error: 'No authorization code provided' });
    return;
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post(
      `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code as string,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    // Get user info from Microsoft Graph
    const graphResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const msUser = graphResponse.data;
    const email: string = msUser.mail || msUser.userPrincipalName;
    const domain = email.split('@')[1];

    // Find or create organization
    let org = await prisma.organization.findFirst({ where: { domain } });
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: domain,
          domain,
          tenantId: msUser.id + '-tenant',
        },
      });
    }

    // Find or create user
    let user = await prisma.user.findFirst({
      where: { microsoftId: msUser.id },
    });

    if (!user) {
      const userCount = await prisma.user.count({ where: { organizationId: org.id } });
      user = await prisma.user.create({
        data: {
          email,
          name: msUser.displayName,
          microsoftId: msUser.id,
          accessToken: access_token,
          refreshToken: refresh_token,
          organizationId: org.id,
          role: userCount === 0 ? Role.ORG_ADMIN : Role.USER,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { accessToken: access_token, refreshToken: refresh_token },
      });
    }

    // Generate JWT
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Log audit
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'LOGIN',
        resource: 'auth',
        resourceId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${jwtToken}`);
  } catch (err) {
    logger.error('OAuth callback error:', err);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
});

// Get current user
authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        isActive: true,
        createdAt: true,
        organization: {
          select: { id: true, name: true, domain: true, plan: true },
        },
      },
    });
    res.json(user);
  } catch (err) {
    logger.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Refresh token
authRouter.post('/refresh', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user?.refreshToken) {
      res.status(401).json({ error: 'No refresh token available' });
      return;
    }

    const tokenResponse = await axios.post(
      `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/token`,
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: user.refreshToken,
        grant_type: 'refresh_token',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    await prisma.user.update({
      where: { id: user.id },
      data: { accessToken: access_token, refreshToken: refresh_token },
    });

    const newJwt = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({ token: newJwt });
  } catch (err) {
    logger.error('Token refresh error:', err);
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

// Logout
authRouter.post('/logout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: req.user!.organizationId,
        userId: req.user!.id,
        action: 'LOGOUT',
        resource: 'auth',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    logger.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});
