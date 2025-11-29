import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...\n');

  // Create a test tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'test-tenant' },
    update: {},
    create: {
      name: 'Test Tenant',
      slug: 'test-tenant',
      isActive: true,
      plan: 'pro',
    },
  });

  console.log('Created tenant:', tenant);

  // Create sync state
  await prisma.syncState.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: { tenantId: tenant.id },
  });

  console.log('\n✅ Seeding complete!\n');
  console.log('Next steps:');
  console.log('1. Start the server: npm run dev');
  console.log(`2. Connect email: http://localhost:3001/auth/connect/${tenant.slug}`);
  console.log(`3. Check status: http://localhost:3001/auth/status/${tenant.slug}`);
  console.log(`4. List emails: http://localhost:3001/emails/${tenant.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
