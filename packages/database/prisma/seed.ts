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

  await prisma.uiSpecification.createMany({
    data: [
      {
        id: '33333333-3333-4333-8333-333333333331',
        projectId,
        projectVersionId: '22222222-2222-4222-8222-222222222221',
        status: 'APPROVED',
        approvedAt: new Date('2026-01-01T00:00:00.000Z'),
        content: {
          productSummary: 'A synthetic customer service command center.',
          audiences: ['Support agents', 'Team leads'],
          roles: ['Agent', 'Supervisor'],
          pages: [
            {
              id: 'overview',
              name: 'Service overview',
              route: '/',
              purpose: 'Prioritize queues and active conversations.',
              components: [
                'Queue health',
                'Active conversations',
                'Agent availability',
              ],
              dataNeeds: ['Synthetic queue metrics'],
            },
          ],
          workflows: [],
          navigation: {
            pattern: 'SIDEBAR',
            items: [{ label: 'Overview', route: '/' }],
          },
          branding: {
            tone: 'Clear and calm',
            primaryColor: '#55f2b0',
            accessibilityNotes: ['Maintain AA contrast'],
          },
          assumptions: ['All data is synthetic.'],
          openQuestions: [],
        },
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
