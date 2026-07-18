import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed AJ Mock Hub');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main(): Promise<void> {
  const projectId = '11111111-1111-4111-8111-111111111111';

  await prisma.project.createMany({
    data: [
      {
        id: projectId,
        name: 'Customer service workspace',
        description: 'Synthetic demonstration project for local development.',
      },
    ],
    skipDuplicates: true,
  });

  await prisma.projectVersion.createMany({
    data: [
      {
        id: '22222222-2222-4222-8222-222222222221',
        projectId,
        versionNumber: 1,
        label: 'Initial requirements',
        instructionsSnapshot:
          'Create a responsive customer service dashboard with clear navigation.',
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        projectId,
        versionNumber: 2,
        label: 'Navigation revision',
        instructionsSnapshot:
          'Keep the dashboard and add a persistent navigation sidebar.',
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
