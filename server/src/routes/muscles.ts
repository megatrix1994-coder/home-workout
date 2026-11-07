import { Router } from 'express';
import { prisma } from '../db.js';
import { catalogueMuscles, isMissingCatalogueTable } from '../lib/catalogue-fallback.js';
import { ensureCatalogue } from '../lib/ensure-catalogue.js';
import { seedMuscleGroups } from '../lib/seed-catalogue.js';
import { asyncHandler } from '../middleware/error-handler.js';

export const musclesRouter = Router();

function storedMuscles() {
  return prisma.muscleGroup.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { exercises: true } } },
  });
}

musclesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    try {
      let muscles = await storedMuscles();
      if (muscles.length === 0) {
        try {
          await seedMuscleGroups(prisma);
          muscles = await storedMuscles();
        } catch (error) {
          console.error(error instanceof Error ? error.message : 'Muscle groups were not saved.');
        }
      }
      if (muscles.length > 0) {
        if (muscles.every((muscle) => muscle._count.exercises === 0)) {
          void ensureCatalogue(prisma);
        }
        const countsMissing = muscles.every((muscle) => muscle._count.exercises === 0);
        res.json({
          data: countsMissing
            ? catalogueMuscles()
            : muscles.map((muscle) => ({
                id: muscle.id,
                slug: muscle.slug,
                name: muscle.name,
                anatomicalRegion: muscle.anatomicalRegion,
                exerciseCount: muscle._count.exercises,
              })),
        });
        return;
      }
    } catch (error) {
      if (!isMissingCatalogueTable(error)) {
        throw error;
      }
      console.error(error instanceof Error ? error.message : 'Muscle groups could not be read.');
    }

    void ensureCatalogue(prisma);
    res.json({ data: catalogueMuscles() });
  }),
);
