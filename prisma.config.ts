import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: 'packages/database/prisma/schema.prisma',
  migrations: {
    path: 'packages/database/prisma/migrations',
    seed: 'tsx packages/database/prisma/seed.ts',
  },
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
