import { PrismaClient, Role, Plan } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a demo organization
  const org = await prisma.organization.upsert({
    where: { domain: 'demo.company.com' },
    update: {},
    create: {
      name: 'Demo Company',
      domain: 'demo.company.com',
      tenantId: 'demo-tenant-id-12345',
      plan: Plan.PROFESSIONAL,
    },
  });

  // Create a super admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.company.com' },
    update: {},
    create: {
      email: 'admin@demo.company.com',
      name: 'Admin User',
      microsoftId: 'ms-admin-id-12345',
      role: Role.SUPER_ADMIN,
      organizationId: org.id,
    },
  });

  // Create a regular user
  const user = await prisma.user.upsert({
    where: { email: 'user@demo.company.com' },
    update: {},
    create: {
      email: 'user@demo.company.com',
      name: 'John Doe',
      microsoftId: 'ms-user-id-12345',
      role: Role.USER,
      organizationId: org.id,
    },
  });

  // Create a colleague for delegation
  const colleague = await prisma.user.upsert({
    where: { email: 'colleague@demo.company.com' },
    update: {},
    create: {
      email: 'colleague@demo.company.com',
      name: 'Jane Smith',
      microsoftId: 'ms-colleague-id-12345',
      role: Role.USER,
      organizationId: org.id,
    },
  });

  console.log('Seed data created:', { org, admin, user, colleague });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
