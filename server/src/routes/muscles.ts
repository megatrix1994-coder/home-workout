import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../middleware/error-handler.js';

export const musclesRouter = Router();

musclesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const muscles = await prisma.muscleGroup.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { exercises: true } } },
    });

    res.json({
      data: muscles.map((muscle) => ({
        id: muscle.id,
        slug: muscle.slug,
        name: muscle.name,
        anatomicalRegion: muscle.anatomicalRegion,
        exerciseCount: muscle._count.exercises,
      })),
    });
  }),
);
