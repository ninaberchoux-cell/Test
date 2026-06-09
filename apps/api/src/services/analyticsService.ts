import { prisma } from '@vacation-inbox/database';

class AnalyticsService {
  async getOverview(organizationId: string, userId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      activeVacations,
      pendingDelegations,
      handledToday,
      totalEmails,
      urgentPending,
      avgResponseTime,
    ] = await Promise.all([
      prisma.vacationPeriod.count({
        where: { organizationId, status: 'ACTIVE', userId },
      }),
      prisma.email.count({
        where: { delegatedTo: userId, status: { in: ['DELEGATED', 'IN_PROGRESS'] } },
      }),
      prisma.email.count({
        where: { recipientId: userId, status: 'COMPLETED', handledAt: { gte: today } },
      }),
      prisma.email.count({ where: { recipientId: userId } }),
      prisma.email.count({
        where: { recipientId: userId, priority: 'URGENT', status: { not: 'COMPLETED' } },
      }),
      this._getAvgResponseTime(userId),
    ]);

    return {
      activeVacations,
      pendingDelegations,
      handledToday,
      totalEmails,
      urgentPending,
      avgResponseTimeHours: avgResponseTime,
    };
  }

  async getResponseTimeTrends(organizationId: string, userId: string, days: number) {
    const since = new Date(Date.now() - days * 86400000);

    const emails = await prisma.email.findMany({
      where: {
        recipientId: userId,
        status: 'COMPLETED',
        handledAt: { gte: since },
        receivedAt: { gte: since },
      },
      select: { receivedAt: true, handledAt: true },
    });

    const byDay: Record<string, { total: number; count: number }> = {};

    for (const e of emails) {
      if (!e.handledAt) continue;
      const day = e.receivedAt.toISOString().split('T')[0];
      const hours = (e.handledAt.getTime() - e.receivedAt.getTime()) / 3600000;
      if (!byDay[day]) byDay[day] = { total: 0, count: 0 };
      byDay[day].total += hours;
      byDay[day].count++;
    }

    return Object.entries(byDay)
      .map(([date, v]) => ({ date, avgHours: v.total / v.count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getEmailVolume(organizationId: string, userId: string, days: number) {
    const since = new Date(Date.now() - days * 86400000);

    const emails = await prisma.email.findMany({
      where: { recipientId: userId, receivedAt: { gte: since } },
      select: { receivedAt: true, status: true },
    });

    const byDay: Record<string, { received: number; handled: number }> = {};

    for (const e of emails) {
      const day = e.receivedAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { received: 0, handled: 0 };
      byDay[day].received++;
      if (e.status === 'COMPLETED') byDay[day].handled++;
    }

    return Object.entries(byDay)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getCategoryBreakdown(organizationId: string, userId: string) {
    const results = await prisma.email.groupBy({
      by: ['category'],
      where: { recipientId: userId },
      _count: { id: true },
    });

    return results.map(r => ({ category: r.category, count: r._count.id }));
  }

  async getSLAMetrics(organizationId: string, userId: string) {
    const slaThresholdHours = 24;

    const emails = await prisma.email.findMany({
      where: { recipientId: userId, status: 'COMPLETED' },
      select: { receivedAt: true, handledAt: true, priority: true },
    });

    let withinSla = 0;
    let breached = 0;

    for (const e of emails) {
      if (!e.handledAt) continue;
      const hours = (e.handledAt.getTime() - e.receivedAt.getTime()) / 3600000;
      const threshold = e.priority === 'URGENT' ? 4 : e.priority === 'HIGH' ? 8 : slaThresholdHours;
      if (hours <= threshold) withinSla++;
      else breached++;
    }

    const total = withinSla + breached;
    return {
      withinSla,
      breached,
      complianceRate: total > 0 ? (withinSla / total) * 100 : 100,
      totalMeasured: total,
    };
  }

  async getOrgAnalytics(organizationId: string) {
    const [totalUsers, activeVacations, totalEmails, handledEmails] = await Promise.all([
      prisma.user.count({ where: { organizationId } }),
      prisma.vacationPeriod.count({ where: { organizationId, status: 'ACTIVE' } }),
      prisma.email.count({ where: { organizationId } }),
      prisma.email.count({ where: { organizationId, status: 'COMPLETED' } }),
    ]);

    return {
      totalUsers,
      activeVacations,
      totalEmails,
      handledEmails,
      overallComplianceRate: totalEmails > 0 ? (handledEmails / totalEmails) * 100 : 100,
    };
  }

  private async _getAvgResponseTime(userId: string): Promise<number | null> {
    const emails = await prisma.email.findMany({
      where: { recipientId: userId, status: 'COMPLETED' },
      select: { receivedAt: true, handledAt: true },
      take: 100,
      orderBy: { handledAt: 'desc' },
    });

    const times = emails
      .filter(e => e.handledAt)
      .map(e => (e.handledAt!.getTime() - e.receivedAt.getTime()) / 3600000);

    if (times.length === 0) return null;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }
}

export const analyticsService = new AnalyticsService();
