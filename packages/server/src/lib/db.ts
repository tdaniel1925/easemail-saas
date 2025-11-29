import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Helper to get tenant by slug
export async function getTenant(tenantId: string) {
  const tenant = await db.tenant.findFirst({
    where: {
      OR: [
        { id: tenantId },
        { slug: tenantId },
      ],
    },
  });

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  if (!tenant.isActive) {
    throw new Error(`Tenant is inactive: ${tenantId}`);
  }

  return tenant;
}

// Helper to get tenant with Nylas connection
export async function getTenantWithGrant(tenantId: string) {
  const tenant = await getTenant(tenantId);

  if (!tenant.nylasGrantId) {
    throw new Error('Email not connected. Please connect your email account first.');
  }

  return tenant;
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
    data: params,
  });
}
