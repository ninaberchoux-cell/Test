import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { emailService } from '../services/emailService';
import { graphService } from '../services/graphService';
import { logger } from '../lib/logger';

const router = Router();

// Microsoft Graph validation token challenge
router.post('/graph', async (req: Request, res: Response) => {
  // Subscription validation handshake
  const validationToken = req.query.validationToken as string;
  if (validationToken) {
    res.set('Content-Type', 'text/plain');
    return res.status(200).send(validationToken);
  }

  // Verify client state secret
  const notifications = req.body?.value;
  if (!Array.isArray(notifications)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  // Respond immediately per Microsoft requirements
  res.status(202).json({ status: 'accepted' });

  // Process notifications asynchronously
  for (const notification of notifications) {
    try {
      const { clientState, resourceData, changeType } = notification;

      // Validate client state
      const expectedSecret = process.env.GRAPH_WEBHOOK_SECRET;
      if (clientState !== expectedSecret) {
        logger.warn('Invalid webhook client state', { clientState });
        continue;
      }

      if (changeType === 'created' && resourceData?.['@odata.type'] === '#Microsoft.Graph.Message') {
        const messageId = resourceData.id;
        const userId = resourceData['@odata.type'];
        await emailService.processIncomingEmail(messageId, notification.subscriptionId);
      }
    } catch (err) {
      logger.error('Webhook processing error', { err, notification });
    }
  }
});

// Webhook subscription renewal (called by cron)
router.post('/graph/renew', async (req: Request, res: Response) => {
  try {
    await graphService.renewSubscriptions();
    res.json({ status: 'renewed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to renew subscriptions' });
  }
});

export default router;
