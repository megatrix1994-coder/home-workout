import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { exercises } from '../catalogue.js';
import { cooldowns } from '../cooldowns.js';
import { FRAME_COUNT, FRAME_RATE, paintFrame } from './draw.js';
import { poseRecipe, stretchPose, type PoseRecipe } from './pose.js';

const packageRequire = createRequire(path.resolve('package.json'));
export const demonstrationDir = path.resolve(process.cwd(), '../client/public/demonstrations');

function ffmpegBinary() {
  try {
    const resolved = packageRequire('ffmpeg-static') as string | null;
    if (resolved) {
      return resolved;
    }
  } catch {
    // The render falls back to the ffmpeg-static binary installed beside node_modules.
  }
  return path.resolve(process.cwd(), '../node_modules/ffmpeg-static/ffmpeg.exe');
}

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let errors = '';
    child.stderr.on('data', (chunk: Buffer) => {
      errors += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(errors.trim() || `${command} exited ${code}`));
    });
  });
}

async function renderClip(slug: string, recipe: PoseRecipe, outputDir: string) {
  const ffmpegPath = ffmpegBinary();
  const frames = path.join(outputDir, '.frames', slug);
  await mkdir(frames, { recursive: true });
  for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
    await writeFile(
      path.join(frames, `frame-${String(frame).padStart(2, '0')}.png`),
      paintFrame(recipe, frame),
    );
  }
  const output = path.join(outputDir, `${slug}.mp4`);
  await run(ffmpegPath, [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-framerate',
    String(FRAME_RATE),
    '-i',
    path.join(frames, 'frame-%02d.png'),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    output,
  ]);
  await rm(frames, { recursive: true, force: true });
  return output;
}

export async function renderExercise(slug: string, outputDir = demonstrationDir) {
  const exercise = exercises.find((item) => item.slug === slug);
  if (!exercise) {
    throw new Error(`Unknown exercise: ${slug}`);
  }
  return renderClip(slug, poseRecipe(exercise), outputDir);
}

export async function renderCooldown(slug: string, outputDir = demonstrationDir) {
  const stretch = cooldowns.find((item) => item.slug === slug);
  if (!stretch) {
    throw new Error(`Unknown cooldown: ${slug}`);
  }
  return renderClip(slug, stretchPose(stretch), outputDir);
}

export async function renderDemonstrations(
  slugs = exercises.map((exercise) => exercise.slug),
  render: (slug: string) => Promise<string> = renderExercise,
) {
  await mkdir(demonstrationDir, { recursive: true });
  let cursor = 0;
  let finished = 0;
  async function worker() {
    while (cursor < slugs.length) {
      const index = cursor;
      cursor += 1;
      const slug = slugs[index];
      if (!slug) {
        continue;
      }
      await render(slug);
      finished += 1;
      if (finished % 25 === 0 || finished === slugs.length) {
        console.log(`Rendered ${finished} of ${slugs.length}`);
      }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  await rm(path.join(demonstrationDir, '.frames'), { recursive: true, force: true });
}

export function missingClips(slugs: string[], outputDir = demonstrationDir) {
  return slugs.filter((slug) => !existsSync(path.join(outputDir, `${slug}.mp4`)));
}

async function renderMissing() {
  const exerciseSlugs = missingClips(exercises.map((exercise) => exercise.slug));
  const cooldownSlugs = missingClips(cooldowns.map((stretch) => stretch.slug));
  console.log(`Missing: ${exerciseSlugs.length} exercises, ${cooldownSlugs.length} cooldowns`);
  if (exerciseSlugs.length > 0) await renderDemonstrations(exerciseSlugs, renderExercise);
  if (cooldownSlugs.length > 0) await renderDemonstrations(cooldownSlugs, renderCooldown);
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (entry.endsWith(`${path.sep}render.ts`) || entry.endsWith(`${path.sep}render.js`)) {
  const only = process.argv[2];
  const job =
    only === '--missing'
      ? renderMissing()
      : only === '--cooldowns'
        ? renderDemonstrations(cooldowns.map((stretch) => stretch.slug), renderCooldown)
        : renderDemonstrations(only ? [only] : undefined, renderExercise);
  job.catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
