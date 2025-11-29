import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

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
