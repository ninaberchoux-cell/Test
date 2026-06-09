import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { prisma } from '@vacation-inbox/database';
import { logger } from '../lib/logger';

export interface GraphMessage {
  id: string;
  subject: string;
  from: { emailAddress: { address: string; name: string } };
  bodyPreview: string;
  receivedDateTime: string;
  isRead: boolean;
  importance: string;
}

class GraphService {
  private getClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => done(null, accessToken),
    });
  }

  async getMailboxMessages(accessToken: string, top = 10): Promise<GraphMessage[]> {
    const client = this.getClient(accessToken);
    const result = await client
      .api('/me/messages')
      .select('id,subject,from,bodyPreview,receivedDateTime,isRead,importance')
      .top(top)
      .orderby('receivedDateTime desc')
      .get();
    return result.value || [];
  }

  async getMessage(accessToken: string, messageId: string): Promise<GraphMessage> {
    const client = this.getClient(accessToken);
    return client
      .api(`/me/messages/${messageId}`)
      .select('id,subject,from,bodyPreview,body,receivedDateTime,isRead,importance')
      .get();
  }

  async forwardMessage(accessToken: string, messageId: string, toAddress: string, comment?: string): Promise<void> {
    const client = this.getClient(accessToken);
    await client.api(`/me/messages/${messageId}/forward`).post({
      comment: comment || 'Forwarded while on vacation',
      toRecipients: [{ emailAddress: { address: toAddress } }],
    });
  }

  async createMailFolder(accessToken: string, folderName: string): Promise<string> {
    const client = this.getClient(accessToken);
    try {
      const existing = await client
        .api('/me/mailFolders')
        .filter(`displayName eq '${folderName}'`)
        .get();
      if (existing.value?.length > 0) return existing.value[0].id;

      const folder = await client.api('/me/mailFolders').post({ displayName: folderName });
      return folder.id;
    } catch (err) {
      logger.error('Failed to create mail folder', { err, folderName });
      throw err;
    }
  }

  async moveMessageToFolder(accessToken: string, messageId: string, folderId: string): Promise<void> {
    const client = this.getClient(accessToken);
    await client.api(`/me/messages/${messageId}/move`).post({ destinationId: folderId });
  }

  async tagMessage(accessToken: string, messageId: string, category: string): Promise<void> {
    const client = this.getClient(accessToken);
    await client.api(`/me/messages/${messageId}`).patch({
      categories: [category],
    });
  }

  async subscribeToMailbox(accessToken: string, userId: string, notificationUrl: string): Promise<string> {
    const client = this.getClient(accessToken);
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 4230 / 60); // ~70 hours max

    const subscription = await client.api('/subscriptions').post({
      changeType: 'created',
      notificationUrl,
      resource: '/me/messages',
      expirationDateTime: expiry.toISOString(),
      clientState: process.env.GRAPH_WEBHOOK_SECRET,
    });

    logger.info('Graph subscription created', { subscriptionId: subscription.id, userId });
    return subscription.id;
  }

  async renewSubscriptions(): Promise<void> {
    const expiringSoon = new Date();
    expiringSoon.setHours(expiringSoon.getHours() + 24);

    const vacations = await prisma.vacationPeriod.findMany({
      where: { status: 'ACTIVE', endDate: { gte: new Date() } },
      include: { user: true },
    });

    for (const vacation of vacations) {
      try {
        if (!vacation.user.accessToken) continue;
        const decryptedToken = vacation.user.accessToken; // TODO: decrypt
        await this.subscribeToMailbox(
          decryptedToken,
          vacation.userId,
          `${process.env.API_URL}/webhooks/graph`
        );
      } catch (err) {
        logger.error('Failed to renew subscription', { vacationId: vacation.id, err });
      }
    }
  }

  async sendEmail(accessToken: string, to: string, subject: string, body: string): Promise<void> {
    const client = this.getClient(accessToken);
    await client.api('/me/sendMail').post({
      message: {
        subject,
        body: { contentType: 'HTML', content: body },
        toRecipients: [{ emailAddress: { address: to } }],
      },
    });
  }

  async getUserProfile(accessToken: string) {
    const client = this.getClient(accessToken);
    return client.api('/me').select('id,displayName,mail,userPrincipalName').get();
  }
}

export const graphService = new GraphService();
