import type { PrismaClient } from '@prisma/client';
import { seedCatalogue, seedMuscleGroups } from './seed-catalogue.js';

let pending: Promise<void> | undefined;

export function ensureCatalogue(db: PrismaClient) {
  pending ??= seedStoredCatalogue(db).catch((error: unknown) => {
    pending = undefined;
    console.error(error instanceof Error ? error.message : 'The catalogue was not saved.');
  });
  return pending;
}

async function seedStoredCatalogue(db: PrismaClient) {
  await seedMuscleGroups(db);
  if ((await db.exercise.count()) === 0) {
    await seedCatalogue(db);
    console.log('Exercise catalogue is ready.');
  }
}
