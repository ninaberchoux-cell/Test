import OpenAI from 'openai';
import { prisma } from '@vacation-inbox/database';
import { Email } from '@prisma/client';
import { logger } from '../lib/logger';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class AIService {
  async analyseEmail(email: Email) {
    const existing = await prisma.aIAnalysis.findUnique({ where: { emailId: email.id } });
    if (existing) return existing;

    const prompt = `Analyse this email and respond with JSON only.

Email Subject: ${email.subject}
From: ${email.fromAddress}
Preview: ${email.bodyPreview || '(no preview)'}
Received: ${email.receivedAt}

Respond with this exact JSON structure:
{
  "summary": "2-3 sentence summary",
  "priority": "URGENT|HIGH|NORMAL|LOW",
  "priorityScore": 1-100,
  "category": "CUSTOMER_SUPPORT|SALES|INTERNAL|FINANCE|HR|OTHER",
  "categoryConfidence": 0.0-1.0,
  "suggestedResponse": "draft reply text",
  "actionItems": ["action 1", "action 2"],
  "recommendedDeadlineHours": 24
}`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 800,
      });

      const raw = JSON.parse(response.choices[0].message.content || '{}');

      const deadline = raw.recommendedDeadlineHours
        ? new Date(Date.now() + raw.recommendedDeadlineHours * 3600 * 1000)
        : null;

      const [analysis] = await Promise.all([
        prisma.aIAnalysis.create({
          data: {
            emailId: email.id,
            summary: raw.summary || '',
            suggestedResponse: raw.suggestedResponse || null,
            actionItems: raw.actionItems || [],
            recommendedDeadline: deadline,
            priorityScore: raw.priorityScore || 50,
            categoryConfidence: raw.categoryConfidence || 0.5,
          },
        }),
        prisma.email.update({
          where: { id: email.id },
          data: {
            priority: raw.priority || 'NORMAL',
            category: raw.category || 'OTHER',
          },
        }),
      ]);

      return analysis;
    } catch (err) {
      logger.error('AI analysis failed', { emailId: email.id, err });
      throw err;
    }
  }

  async generateDraft(email: Email & { aiAnalysis?: any }, tone: string): Promise<string> {
    const context = email.aiAnalysis?.summary || email.bodyPreview || '';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Write a ${tone} email reply to this message.

Original subject: ${email.subject}
From: ${email.fromAddress}
Context: ${context}

Write only the reply body, no subject line, no signature placeholder. Keep it concise and actionable.`,
        },
      ],
      max_tokens: 400,
    });

    return response.choices[0].message.content || '';
  }

  async generateVacationSummary(vacationId: string) {
    const vacation = await prisma.vacationPeriod.findUnique({
      where: { id: vacationId },
      include: {
        emails: {
          include: { aiAnalysis: true, replies: true },
        },
        user: { select: { name: true, email: true } },
      },
    });

    if (!vacation) throw new Error('Vacation not found');

    const emails = vacation.emails;
    const handled = emails.filter(e => e.status === 'COMPLETED');
    const awaiting = emails.filter(e => e.status !== 'COMPLETED' && e.status !== 'IGNORED');
    const critical = emails.filter(e => e.priority === 'URGENT' || e.priority === 'HIGH');

    // Compute avg response time
    let avgResponseHours: number | null = null;
    const responseTimes = emails
      .filter(e => e.handledAt && e.receivedAt)
      .map(e => (e.handledAt!.getTime() - e.receivedAt.getTime()) / 3600000);
    if (responseTimes.length > 0) {
      avgResponseHours = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }

    // AI insights
    const emailSummaries = emails.slice(0, 20).map(e =>
      `[${e.priority}] ${e.subject} from ${e.fromAddress} - Status: ${e.status}`
    ).join('\n');

    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Generate a vacation return briefing for ${vacation.user.name}.

Vacation: ${vacation.startDate.toDateString()} to ${vacation.endDate.toDateString()}
Total emails: ${emails.length}
Handled: ${handled.length}
Awaiting action: ${awaiting.length}

Top emails during vacation:
${emailSummaries}

Write 3-4 sentences of key insights and suggested follow-ups as JSON:
{
  "insights": "summary paragraph",
  "followUps": ["follow up 1", "follow up 2", "follow up 3"]
}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    });

    const aiData = JSON.parse(aiResponse.choices[0].message.content || '{}');

    const summary = await prisma.vacationSummary.upsert({
      where: { vacationId },
      create: {
        vacationId,
        totalEmailsReceived: emails.length,
        totalEmailsHandled: handled.length,
        emailsAwaitingAction: awaiting.length,
        criticalConversations: critical.map(e => ({ id: e.id, subject: e.subject, from: e.fromAddress, priority: e.priority })),
        customerIssuesResolved: handled.filter(e => e.category === 'CUSTOMER_SUPPORT').length,
        suggestedFollowUps: aiData.followUps || [],
        avgResponseTimeHours: avgResponseHours,
        slaComplianceRate: emails.length > 0 ? (handled.length / emails.length) * 100 : 100,
        aiInsights: aiData.insights || '',
      },
      update: {
        totalEmailsReceived: emails.length,
        totalEmailsHandled: handled.length,
        emailsAwaitingAction: awaiting.length,
        criticalConversations: critical.map(e => ({ id: e.id, subject: e.subject, from: e.fromAddress, priority: e.priority })),
        customerIssuesResolved: handled.filter(e => e.category === 'CUSTOMER_SUPPORT').length,
        suggestedFollowUps: aiData.followUps || [],
        avgResponseTimeHours: avgResponseHours,
        slaComplianceRate: emails.length > 0 ? (handled.length / emails.length) * 100 : 100,
        aiInsights: aiData.insights || '',
        generatedAt: new Date(),
      },
    });

    return summary;
  }
}

export const aiService = new AIService();
