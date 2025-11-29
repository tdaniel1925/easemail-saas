// ===========================================
// USAGE TRACKING
// Track API usage for billing and analytics
// ===========================================

import { db } from './db.js';

// ===========================================
// TRACK USAGE
// ===========================================

export async function trackUsage(params: {
  tenantId: string;
  integrationId: string;
  tool: string;
  count?: number;
}): Promise<void> {
  const { tenantId, integrationId, tool, count = 1 } = params;

  // Get current period (year-month)
  const period = getCurrentPeriod();

  try {
    // Upsert usage record
    await db.usageRecord.upsert({
      where: {
        tenantId_integrationId_tool_period: {
          tenantId,
          integrationId,
          tool,
          period,
        },
      },
      update: {
        count: { increment: count },
      },
      create: {
        tenantId,
        integrationId,
        tool,
        period,
        count,
      },
    });
  } catch (error) {
    // Don't fail the request if usage tracking fails
    console.error('Failed to track usage:', error);
  }
}

// Fire and forget version
export function trackUsageAsync(params: {
  tenantId: string;
  integrationId: string;
  tool: string;
  count?: number;
}): void {
  trackUsage(params).catch(() => {});
}

// ===========================================
// GET USAGE
// ===========================================

export interface UsageSummary {
  period: string;
  totalCalls: number;
  byIntegration: Record<string, number>;
  byTool: Record<string, number>;
  details: Array<{
    integrationId: string;
    tool: string;
    count: number;
  }>;
}

export async function getUsage(tenantId: string, period?: string): Promise<UsageSummary> {
  const targetPeriod = period || getCurrentPeriod();

  const records = await db.usageRecord.findMany({
    where: {
      tenantId,
      period: targetPeriod,
    },
  });

  const byIntegration: Record<string, number> = {};
  const byTool: Record<string, number> = {};
  let totalCalls = 0;

  for (const record of records) {
    totalCalls += record.count;
    byIntegration[record.integrationId] = (byIntegration[record.integrationId] || 0) + record.count;
    byTool[record.tool] = (byTool[record.tool] || 0) + record.count;
  }

  return {
    period: targetPeriod,
    totalCalls,
    byIntegration,
    byTool,
    details: records.map(r => ({
      integrationId: r.integrationId,
      tool: r.tool,
      count: r.count,
    })),
  };
}

export async function getUsageHistory(tenantId: string, months: number = 6): Promise<UsageSummary[]> {
  const periods = getPastPeriods(months);

  const records = await db.usageRecord.findMany({
    where: {
      tenantId,
      period: { in: periods },
    },
    orderBy: { period: 'desc' },
  });

  // Group by period
  const byPeriod: Record<string, typeof records> = {};
  for (const record of records) {
    if (!byPeriod[record.period]) {
      byPeriod[record.period] = [];
    }
    byPeriod[record.period].push(record);
  }

  // Build summaries
  return periods.map(period => {
    const periodRecords = byPeriod[period] || [];
    const byIntegration: Record<string, number> = {};
    const byTool: Record<string, number> = {};
    let totalCalls = 0;

    for (const record of periodRecords) {
      totalCalls += record.count;
      byIntegration[record.integrationId] = (byIntegration[record.integrationId] || 0) + record.count;
      byTool[record.tool] = (byTool[record.tool] || 0) + record.count;
    }

    return {
      period,
      totalCalls,
      byIntegration,
      byTool,
      details: periodRecords.map(r => ({
        integrationId: r.integrationId,
        tool: r.tool,
        count: r.count,
      })),
    };
  });
}

// ===========================================
// BILLING HELPERS
// ===========================================

// Plan limits (calls per month)
const PLAN_LIMITS: Record<string, number> = {
  free: 1000,
  pro: 50000,
  enterprise: 500000,
};

export interface BillingInfo {
  plan: string;
  period: string;
  usage: number;
  limit: number;
  percentUsed: number;
  isOverLimit: boolean;
  overage: number;
}

export async function getBillingInfo(tenantId: string): Promise<BillingInfo> {
  // Get tenant plan
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [{ id: tenantId }, { slug: tenantId }],
    },
    select: { plan: true },
  });

  const plan = tenant?.plan || 'free';
  const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  // Get current usage
  const { totalCalls } = await getUsage(tenantId);

  const percentUsed = (totalCalls / limit) * 100;
  const isOverLimit = totalCalls > limit;
  const overage = Math.max(0, totalCalls - limit);

  return {
    plan,
    period: getCurrentPeriod(),
    usage: totalCalls,
    limit,
    percentUsed: Math.round(percentUsed * 100) / 100,
    isOverLimit,
    overage,
  };
}

// ===========================================
// HELPERS
// ===========================================

function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getPastPeriods(months: number): string[] {
  const periods: string[] = [];
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    periods.push(`${year}-${month}`);
  }

  return periods;
}
