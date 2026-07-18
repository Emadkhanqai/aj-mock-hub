import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  const originalDatabaseUrl = process.env['DATABASE_URL'];

  afterEach(() => {
    if (originalDatabaseUrl) process.env['DATABASE_URL'] = originalDatabaseUrl;
    else delete process.env['DATABASE_URL'];
  });

  it('requires a database connection string', () => {
    delete process.env['DATABASE_URL'];
    expect(() => new PrismaService()).toThrow('DATABASE_URL is required');
  });

  it('creates a client for a configured PostgreSQL URL', async () => {
    process.env['DATABASE_URL'] =
      'postgresql://user:password@127.0.0.1:5432/example';
    const service = new PrismaService();

    expect(service.$connect).toEqual(expect.any(Function));
    expect(service.$disconnect).toEqual(expect.any(Function));
    await service.$disconnect();
  });
});
