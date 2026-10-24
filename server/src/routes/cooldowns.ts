import { Router } from 'express';
import { muscleGroups } from '../catalogue.js';
import { cooldowns } from '../cooldowns.js';

export const cooldownsRouter = Router();

cooldownsRouter.get('/', (_req, res) => {
  res.json({
    data: muscleGroups.map((muscle) => ({
      slug: muscle.slug,
      name: muscle.name,
      stretches: cooldowns
        .filter((stretch) => stretch.muscle === muscle.slug)
        .map((stretch) => ({
          slug: stretch.slug,
          name: stretch.name,
          durationSeconds: stretch.durationSeconds,
          ease: stretch.ease,
          instructions: stretch.instructions,
          animations: [
            {
              id: stretch.slug,
              format: 'video',
              assetUrl: `/demonstrations/${stretch.slug}.mp4`,
            },
          ],
        })),
    })),
  });
});
