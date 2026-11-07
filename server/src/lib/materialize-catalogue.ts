import type { PrismaClient } from '@prisma/client';
import { equipment, exercises, muscleGroups } from '../catalogue.js';
import { cooldowns } from '../cooldowns.js';
import { warmups } from '../warmups.js';

export async function ensureStoredExercises(db: PrismaClient, ids: string[]) {
  const defs = ids.flatMap((id) => {
    const exercise = exercises.find((item) => item.slug === id);
    return exercise ? [exercise] : [];
  });
  if (defs.length === 0) {
    return 0;
  }

  const muscleSlugs = [...new Set(defs.flatMap((exercise) => exercise.muscles.map((muscle) => muscle.slug)))];
  for (const slug of muscleSlugs) {
    const muscle = muscleGroups.find((item) => item.slug === slug);
    if (!muscle) {
      continue;
    }
    await db.muscleGroup.upsert({
      where: { slug },
      update: {
        name: muscle.name,
        anatomicalRegion: muscle.anatomicalRegion,
        sortOrder: muscle.sortOrder,
      },
      create: {
        slug,
        name: muscle.name,
        anatomicalRegion: muscle.anatomicalRegion,
        sortOrder: muscle.sortOrder,
      },
    });
  }

  const equipmentSlugs = [...new Set(defs.flatMap((exercise) => exercise.equipment))];
  for (const slug of equipmentSlugs) {
    const item = equipment.find((entry) => entry.slug === slug);
    if (!item) {
      continue;
    }
    await db.equipment.upsert({
      where: { slug },
      update: { name: item.name, category: item.category },
      create: { slug, name: item.name, category: item.category },
    });
  }

  const [muscleRows, equipmentRows] = await Promise.all([
    db.muscleGroup.findMany({ where: { slug: { in: muscleSlugs } } }),
    db.equipment.findMany({ where: { slug: { in: equipmentSlugs } } }),
  ]);
  const muscleBySlug = new Map(muscleRows.map((muscle) => [muscle.slug, muscle]));
  const equipmentBySlug = new Map(equipmentRows.map((item) => [item.slug, item]));

  for (const exercise of defs) {
    const saved = await db.exercise.upsert({
      where: { slug: exercise.slug },
      update: {
        name: exercise.name,
        description: exercise.description,
        instructions: exercise.instructions,
        difficulty: exercise.difficulty,
        movementType: exercise.movementType,
        region: exercise.region,
        goals: [exercise.goal],
      },
      create: {
        slug: exercise.slug,
        name: exercise.name,
        description: exercise.description,
        instructions: exercise.instructions,
        difficulty: exercise.difficulty,
        movementType: exercise.movementType,
        region: exercise.region,
        goals: [exercise.goal],
      },
    });
    await db.exerciseMuscle.deleteMany({ where: { exerciseId: saved.id } });
    await db.exerciseEquipment.deleteMany({ where: { exerciseId: saved.id } });
    await db.exerciseMuscle.createMany({
      data: exercise.muscles.flatMap((muscle) => {
        const row = muscleBySlug.get(muscle.slug);
        return row ? [{ exerciseId: saved.id, muscleId: row.id, role: muscle.role }] : [];
      }),
    });
    await db.exerciseEquipment.createMany({
      data: exercise.equipment.flatMap((slug) => {
        const row = equipmentBySlug.get(slug);
        return row ? [{ exerciseId: saved.id, equipmentId: row.id }] : [];
      }),
    });
  }

  await ensureStretches(db, muscleSlugs, muscleBySlug);
  return defs.length;
}

async function ensureStretches(
  db: PrismaClient,
  muscleSlugs: string[],
  muscleBySlug: Map<string, { id: string }>,
) {
  const stretches = [
    ...warmups
      .filter((stretch) => stretch.muscles.some((slug) => muscleSlugs.includes(slug)))
      .map((stretch) => ({
        slug: stretch.slug,
        name: stretch.name,
        instructions: stretch.instructions,
        durationSeconds: stretch.durationSeconds,
        purpose: 'warmup' as const,
        muscles: stretch.muscles.filter((slug) => muscleSlugs.includes(slug)),
      })),
    ...cooldowns
      .filter((stretch) => muscleSlugs.includes(stretch.muscle))
      .map((stretch) => ({
        slug: stretch.slug,
        name: stretch.name,
        instructions: stretch.instructions,
        durationSeconds: stretch.durationSeconds,
        purpose: 'cooldown' as const,
        muscles: [stretch.muscle],
      })),
  ];

  for (const stretch of stretches) {
    const saved = await db.stretch.upsert({
      where: { slug: stretch.slug },
      update: {
        name: stretch.name,
        instructions: stretch.instructions,
        durationSeconds: stretch.durationSeconds,
        purpose: stretch.purpose,
      },
      create: {
        slug: stretch.slug,
        name: stretch.name,
        instructions: stretch.instructions,
        durationSeconds: stretch.durationSeconds,
        purpose: stretch.purpose,
      },
    });
    await db.stretchMuscle.deleteMany({ where: { stretchId: saved.id } });
    await db.stretchMuscle.createMany({
      data: stretch.muscles.flatMap((slug) => {
        const muscle = muscleBySlug.get(slug);
        return muscle ? [{ stretchId: saved.id, muscleId: muscle.id }] : [];
      }),
    });
  }
}
