import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('CRITICAL: DATABASE_URL environment variable is missing. Database operations will fail.');
}

const pool = databaseUrl ? new pg.Pool({ connectionString: databaseUrl }) : null;
const adapter = pool ? new PrismaPg(pool) : null;
const prisma = new PrismaClient(adapter ? { adapter } : undefined);

export default prisma;
