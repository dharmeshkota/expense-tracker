import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is missing');
}

// 1. Initialize the Postgres adapter with your connection string
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

// 2. Pass the adapter to the Prisma client
const prisma = new PrismaClient({ adapter });

export default prisma;