import { PrismaClient, type EquipmentCategory, type MuscleRole } from '@prisma/client';
import { equipment, exercises, muscleGroups } from '../src/catalogue';

const prisma = new PrismaClient();

async function main() {
  for (const muscle of muscleGroups) {
    await prisma.muscleGroup.upsert({
      where: { slug: muscle.slug },
      update: {
        name: muscle.name,
        anatomicalRegion: muscle.anatomicalRegion,
        sortOrder: muscle.sortOrder,
      },
      create: {
        slug: muscle.slug,
        name: muscle.name,
        anatomicalRegion: muscle.anatomicalRegion,
        sortOrder: muscle.sortOrder,
      },
    });
  }

  for (const item of equipment) {
    await prisma.equipment.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        category: item.category as EquipmentCategory,
      },
      create: {
        slug: item.slug,
        name: item.name,
        category: item.category as EquipmentCategory,
      },
    });
  }

  await prisma.exercise.deleteMany({
    where: { slug: { notIn: exercises.map((exercise) => exercise.slug) } },
  });

  const muscles = await prisma.muscleGroup.findMany();
  const equipmentRows = await prisma.equipment.findMany();
  const muscleBySlug = new Map(muscles.map((muscle) => [muscle.slug, muscle]));
  const equipmentBySlug = new Map(equipmentRows.map((item) => [item.slug, item]));

  for (const exercise of exercises) {
    const saved = await prisma.exercise.upsert({
      where: { slug: exercise.slug },
      update: {
        name: exercise.name,
        description: exercise.description,
        instructions: exercise.instructions,
        difficulty: exercise.difficulty,
        movementType: exercise.movementType,
      },
      create: {
        slug: exercise.slug,
        name: exercise.name,
        description: exercise.description,
        instructions: exercise.instructions,
        difficulty: exercise.difficulty,
        movementType: exercise.movementType,
      },
    });

    await prisma.exerciseMuscle.deleteMany({ where: { exerciseId: saved.id } });
    await prisma.exerciseEquipment.deleteMany({ where: { exerciseId: saved.id } });

    await prisma.exerciseMuscle.createMany({
      data: exercise.muscles.map((muscle) => {
        const row = muscleBySlug.get(muscle.slug);
        if (!row) {
          throw new Error(`Unknown muscle slug: ${muscle.slug}`);
        }
        return {
          exerciseId: saved.id,
          muscleId: row.id,
          role: muscle.role as MuscleRole,
        };
      }),
    });

    await prisma.exerciseEquipment.createMany({
      data: exercise.equipment.map((slug) => {
        const row = equipmentBySlug.get(slug);
        if (!row) {
          throw new Error(`Unknown equipment slug: ${slug}`);
        }
        return { exerciseId: saved.id, equipmentId: row.id };
      }),
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
