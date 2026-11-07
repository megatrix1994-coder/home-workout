import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedCatalogue } from '../src/lib/seed-catalogue.js';

const prisma = new PrismaClient();

seedCatalogue(prisma)
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
