// ===========================================
// USAGE TRACKING
// Track API usage for billing and analytics
// ===========================================

import { db } from './db.js';

// ===========================================
// TRACK USAGE (General)
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
// PLATFORM USAGE TRACKING (For INCLUDED integrations)
// Tracks usage with cost for rebilling to customers
// ===========================================

export interface PlatformUsageParams {
  tenantId: string;
  integrationId: string;
  operation: string;
  units?: number;
  cost?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Track platform usage for INCLUDED integrations
 * This records detailed usage for cost calculation and rebilling
 */
export async function trackPlatformUsage(params: PlatformUsageParams): Promise<void> {
  const { tenantId, integrationId, operation, units = 1, cost, metadata } = params;

  try {
    // Check if this integration is INCLUDED (platform-paid)
    const config = await db.integrationConfig.findUnique({
      where: { integrationId },
      select: { mode: true, basePricePerUnit: true },
    });

    // Only track platform usage for INCLUDED integrations
    if (config?.mode !== 'INCLUDED') {
      return;
    }

    // Calculate cost if not provided
    const calculatedCost = cost ?? (config.basePricePerUnit ? units * config.basePricePerUnit : 0);

    // Record platform usage
    await db.platformUsage.create({
      data: {
        tenantId,
        integrationId,
        operation,
        units,
        cost: calculatedCost,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });

    // Also track in general usage for consistency
    await trackUsage({
      tenantId,
      integrationId,
      tool: operation,
      count: 1,
    });
  } catch (error) {
    console.error('Failed to track platform usage:', error);
  }
}

/**
 * Fire and forget version of platform usage tracking
 */
export function trackPlatformUsageAsync(params: PlatformUsageParams): void {
  trackPlatformUsage(params).catch(() => {});
}

/**
 * Get the integration mode for a given integration
 * Returns the mode from config or catalog default
 */
export async function getIntegrationMode(integrationId: string): Promise<'INCLUDED' | 'BYOK' | 'DISABLED'> {
  const config = await db.integrationConfig.findUnique({
    where: { integrationId },
    select: { mode: true },
  });

  return config?.mode || 'DISABLED';
}

/**
 * Check if integration is available for a tenant
 * For INCLUDED: always available
 * For BYOK: check if tenant has a connection
 * For DISABLED: not available
 */
export async function isIntegrationAvailable(
  tenantId: string,
  integrationId: string
): Promise<{ available: boolean; mode: string; reason?: string }> {
  const config = await db.integrationConfig.findUnique({
    where: { integrationId },
    select: { mode: true, credentialsEncrypted: true },
  });

  if (!config || config.mode === 'DISABLED') {
    return { available: false, mode: 'DISABLED', reason: 'Integration is disabled' };
  }

  if (config.mode === 'INCLUDED') {
    // Check if platform has credentials configured
    if (!config.credentialsEncrypted) {
      return { available: false, mode: 'INCLUDED', reason: 'Platform credentials not configured' };
    }
    return { available: true, mode: 'INCLUDED' };
  }

  // BYOK - check if tenant has a connection
  const connection = await db.connection.findFirst({
    where: {
      tenantId,
      integrationId,
      isActive: true,
      status: 'active',
    },
  });

  if (!connection) {
    return { available: false, mode: 'BYOK', reason: 'No connection configured' };
  }

  return { available: true, mode: 'BYOK' };
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
