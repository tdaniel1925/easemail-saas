import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Optimized Prisma client for serverless/Railway environments
// Uses connection pooling settings tuned for Supabase
export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Always cache in global for Railway/serverless to prevent connection exhaustion
globalForPrisma.prisma = db;

// Graceful shutdown handler
process.on('beforeExit', async () => {
  await db.$disconnect();
});

// Helper to get tenant by slug - auto-creates if doesn't exist
export async function getTenant(tenantId: string) {
  // Find existing tenant by id or slug
  let tenant = await db.tenant.findFirst({
    where: {
      OR: [
        { id: tenantId },
        { slug: tenantId },
      ],
    },
  });

  // Create if doesn't exist
  if (!tenant) {
    tenant = await db.tenant.create({
      data: {
        id: tenantId,
        name: tenantId,
        slug: tenantId,
      },
    });
  }

  if (!tenant.isActive) {
    throw new Error(`Tenant is inactive: ${tenantId}`);
  }

  return tenant;
}

// Helper to get an account with Nylas grant
// Supports: accountId (specific), or uses primary/first active account
export async function getAccountWithGrant(tenantId: string, accountId?: string) {
  const tenant = await getTenant(tenantId);

  let account;

  if (accountId) {
    // Get specific account
    account = await db.account.findFirst({
      where: { id: accountId, tenantId: tenant.id, isActive: true },
    });
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }
  } else {
    // Get primary account, or first active account
    account = await db.account.findFirst({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' },
      ],
    });
  }

  // Fall back to legacy tenant grant if no accounts
  if (!account) {
    if (tenant.nylasGrantId) {
      // Return a pseudo-account from legacy tenant data
      return {
        id: 'legacy',
        tenantId: tenant.id,
        email: tenant.connectedEmail || 'unknown',
        provider: tenant.provider || 'unknown',
        nylasGrantId: tenant.nylasGrantId,
        isActive: true,
        isPrimary: true,
        tenant,
      };
    }
    throw new Error('No email account connected. Please connect your email first.');
  }

  return { ...account, tenant };
}

// Legacy helper - uses primary account or legacy tenant grant
export async function getTenantWithGrant(tenantId: string) {
  const account = await getAccountWithGrant(tenantId);

  // Return tenant-like object with nylasGrantId for backward compatibility
  return {
    ...account.tenant,
    nylasGrantId: account.nylasGrantId,
    connectedEmail: account.email,
    provider: account.provider,
  };
}

// Helper to log activity
export async function logActivity(params: {
  tenantId: string;
  action: string;
  status: 'success' | 'error';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  duration?: number;
}) {
  return db.activityLog.create({
    data: {
      tenantId: params.tenantId,
      action: params.action,
      status: params.status,
      input: params.input as any,
      output: params.output as any,
      error: params.error,
      duration: params.duration,
    },
  });
}
