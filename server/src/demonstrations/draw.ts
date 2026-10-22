import type { PoseRecipe } from './pose.js';
import { encodePng } from './png.js';

const SCALE = 1.5;
export const FRAME_WIDTH = 480;
export const FRAME_HEIGHT = 360;
export const FRAME_COUNT = 20;
export const FRAME_RATE = 10;

const PAPER: Rgb = [244, 239, 230];
const INK: Rgb = [42, 37, 32];
function accent(tint: number, phase: number): Rgb {
  return [158 + ((tint + phase) % 48), 54 + (phase % 11), 8];
}
const PROP: Rgb = [90, 98, 104];
const FAR: Rgb = [132, 124, 116];
const FLOOR: Rgb = [196, 186, 170];
const GROUND = 226;

type Rgb = [number, number, number];
type Point = { x: number; y: number };

type Joints = {
  head: Point;
  neck: Point;
  shoulder: Point;
  hip: Point;
  knee: Point;
  ankle: Point;
  elbow: Point;
  hand: Point;
  backElbow: Point;
  backHand: Point;
  otherKnee?: Point;
  otherAnkle?: Point;
  otherElbow?: Point;
  otherHand?: Point;
};

const background = Buffer.alloc(FRAME_WIDTH * FRAME_HEIGHT * 4);
for (let index = 0; index < background.length; index += 4) {
  background[index] = PAPER[0];
  background[index + 1] = PAPER[1];
  background[index + 2] = PAPER[2];
  background[index + 3] = 255;
}

function point(x: number, y: number): Point {
  return { x, y };
}

function mix(start: Point, end: Point, amount: number, boost = 0): Point {
  return {
    x: start.x + (end.x - start.x) * amount + (end.x >= start.x ? boost : -boost),
    y: start.y + (end.y - start.y) * amount + (end.y >= start.y ? boost * 0.3 : -boost * 0.3),
  };
}

function depthAt(recipe: PoseRecipe, frame: number) {
  const progress = frame / FRAME_COUNT;
  if (recipe.movementType === 'isometric') {
    return 0.5 + 0.08 * Math.sin(progress * Math.PI * 2);
  }
  return (1 - Math.cos(progress * Math.PI * 2)) / 2;
}

function poseAt(recipe: PoseRecipe, depth: number): Joints {
  const boost = recipe.reach * 0.8 * depth;
  switch (recipe.action) {
    case 'squat':
      return squatPose(depth, boost);
    case 'hinge':
      return hingePose(depth, boost);
    case 'press':
      return recipe.posture === 'plank'
        ? pushUpPose(depth, boost)
        : recipe.posture === 'lie'
          ? benchPose(depth, boost)
          : overheadPose(depth, boost, recipe.posture === 'sit');
    case 'fly':
      return flyPose(depth, boost);
    case 'row':
      return rowPose(depth, boost);
    case 'pulldown':
      return pulldownPose(depth, boost);
    case 'curl':
      return curlPose(depth, boost);
    case 'extend':
      return extendPose(depth, boost);
    case 'raise':
      return raisePose(depth, boost);
    case 'extend-leg':
      return legExtensionPose(depth, boost);
    case 'curl-leg':
      return recipe.posture === 'lie' ? legCurlPose(depth, boost) : standingCurlPose(depth, boost);
    case 'bridge':
      return bridgePose(depth, boost);
    case 'kick':
      return kickPose(depth, boost);
    case 'calf':
      return calfPose(depth, boost, recipe.posture === 'sit');
    case 'crunch':
      return crunchPose(depth, boost);
    case 'side-bend':
      return sideBendPose(depth, boost);
    case 'plank':
      return plankPose(depth);
    default:
      return overheadPose(depth, boost, false);
  }
}

function squatPose(depth: number, boost: number): Joints {
  const drop = depth * (52 + boost);
  const hip = point(150, 116 + drop);
  const shoulder = point(154, hip.y - 50);
  return {
    head: point(156, shoulder.y - 28),
    neck: point(155, shoulder.y - 12),
    shoulder,
    hip,
    knee: point(168 + depth * 26, 176),
    ankle: point(164, 216),
    elbow: point(188, shoulder.y + 8),
    hand: point(206, shoulder.y + 4),
    backElbow: point(132, shoulder.y + 16),
    backHand: point(118, shoulder.y + 18),
  };
}

function hingePose(depth: number, boost: number): Joints {
  const shoulder = mix(point(156, 78), point(214, 150), depth, boost);
  const hand = mix(point(168, 132), point(230, 196), depth, boost);
  return {
    head: point(shoulder.x + 8, shoulder.y - 26),
    neck: point(shoulder.x + 4, shoulder.y - 12),
    shoulder,
    hip: point(158, 132),
    knee: point(176, 174),
    ankle: point(168, 216),
    elbow: mix(point(164, 108), point(220, 172), depth),
    hand,
    backElbow: point(shoulder.x - 16, shoulder.y + 18),
    backHand: point(hand.x - 18, hand.y + 6),
  };
}

function overheadPose(depth: number, boost: number, seated: boolean): Joints {
  const rise = seated ? 18 : 0;
  const shoulder = point(156, 92 - rise);
  const hand = mix(point(186, 148 - rise), point(168, 28 - rise), depth, boost);
  const elbow = mix(point(184, 118 - rise), point(174, 58 - rise), depth);
  const hip = point(152, 154 - rise);
  return {
    head: point(158, shoulder.y - 30),
    neck: point(157, shoulder.y - 14),
    shoulder,
    hip,
    knee: point(seated ? 206 : 158, seated ? 156 : 184),
    ankle: point(seated ? 236 : 154, seated ? 204 : 216),
    elbow,
    hand,
    backElbow: point(elbow.x - 22, elbow.y + 4),
    backHand: point(hand.x - 16, hand.y + 8),
  };
}

function benchPose(depth: number, boost: number): Joints {
  const shoulder = point(118, 124);
  const hand = mix(point(132, 108), point(132, 52), depth, boost);
  return {
    head: point(82, 116),
    neck: point(98, 120),
    shoulder,
    hip: point(196, 128),
    knee: point(236, 108),
    ankle: point(268, 116),
    elbow: mix(point(146, 118), point(138, 86), depth),
    hand,
    backElbow: point(124, 132),
    backHand: point(hand.x + 10, hand.y + 8),
  };
}

function pushUpPose(depth: number, boost: number): Joints {
  const sag = (1 - depth) * (16 + boost);
  const shoulder = point(102, 118 + sag);
  return {
    head: point(68, 108 + sag),
    neck: point(84, 114 + sag),
    shoulder,
    hip: point(186, 124 + sag * 0.4),
    knee: point(224, 128 + sag * 0.2),
    ankle: point(262, 130),
    elbow: mix(point(118, 156), point(104, 150), depth),
    hand: point(108, 176),
    backElbow: point(112, 160),
    backHand: point(100, 178),
  };
}

function flyPose(depth: number, boost: number): Joints {
  const hand = mix(point(48, 104), point(146, 118), depth, boost);
  const other = mix(point(272, 104), point(174, 118), depth, boost);
  return {
    head: point(160, 58),
    neck: point(160, 76),
    shoulder: point(160, 92),
    hip: point(160, 146),
    knee: point(136, 180),
    ankle: point(132, 216),
    elbow: mix(point(86, 96), point(150, 108), depth),
    hand,
    backElbow: point(168, 110),
    backHand: point(176, 128),
    otherKnee: point(184, 180),
    otherAnkle: point(188, 216),
    otherElbow: mix(point(234, 96), point(170, 108), depth),
    otherHand: other,
  };
}

function rowPose(depth: number, boost: number): Joints {
  const shoulder = mix(point(168, 86), point(196, 132), depth * 0.35);
  const hand = mix(point(228, 168), point(188, shoulder.y + 16), depth, boost);
  return {
    head: point(shoulder.x - 6, shoulder.y - 28),
    neck: point(shoulder.x - 2, shoulder.y - 12),
    shoulder,
    hip: point(150, 138),
    knee: point(168, 176),
    ankle: point(160, 216),
    elbow: mix(point(206, 150), point(176, shoulder.y + 8), depth),
    hand,
    backElbow: point(140, shoulder.y + 20),
    backHand: point(hand.x - 24, hand.y + 8),
  };
}

function pulldownPose(depth: number, boost: number): Joints {
  const shoulder = point(156, 96);
  const hand = mix(point(168, 36), point(176, 124), depth, boost);
  return {
    head: point(154, 64),
    neck: point(155, 80),
    shoulder,
    hip: point(150, 156),
    knee: point(204, 158),
    ankle: point(232, 206),
    elbow: mix(point(186, 62), point(196, 108), depth),
    hand,
    backElbow: point(132, 78),
    backHand: point(hand.x - 20, hand.y),
  };
}

function curlPose(depth: number, boost: number): Joints {
  const shoulder = point(156, 86);
  const hand = mix(point(196, 160), point(158, 78), depth, boost);
  return {
    head: point(158, 54),
    neck: point(157, 70),
    shoulder,
    hip: point(152, 140),
    knee: point(156, 178),
    ankle: point(152, 216),
    elbow: point(188, 118),
    hand,
    backElbow: point(136, 122),
    backHand: mix(point(128, 164), point(140, 96), depth * 0.7),
  };
}

function extendPose(depth: number, boost: number): Joints {
  const shoulder = point(158, 88);
  const elbow = point(176, 70);
  const hand = mix(point(154, 96), point(196, 42), depth, boost);
  return {
    head: point(150, 56),
    neck: point(154, 72),
    shoulder,
    hip: point(152, 142),
    knee: point(156, 178),
    ankle: point(152, 216),
    elbow,
    hand,
    backElbow: point(138, 104),
    backHand: mix(point(132, 132), point(124, 78), depth * 0.65),
  };
}

function raisePose(depth: number, boost: number): Joints {
  const hand = mix(point(132, 168), point(58, 92), depth, boost);
  const other = mix(point(188, 168), point(262, 92), depth, boost);
  return {
    head: point(160, 52),
    neck: point(160, 70),
    shoulder: point(160, 86),
    hip: point(160, 140),
    knee: point(142, 178),
    ankle: point(138, 216),
    elbow: mix(point(140, 124), point(92, 90), depth),
    hand,
    backElbow: point(168, 120),
    backHand: point(176, 150),
    otherKnee: point(178, 178),
    otherAnkle: point(182, 216),
    otherElbow: mix(point(180, 124), point(228, 90), depth),
    otherHand: other,
  };
}

function legExtensionPose(depth: number, boost: number): Joints {
  const ankle = mix(point(214, 188), point(252, 142), depth, boost);
  return {
    head: point(112, 78),
    neck: point(124, 96),
    shoulder: point(132, 112),
    hip: point(156, 156),
    knee: point(206, 158),
    ankle,
    elbow: point(118, 132),
    hand: point(108, 156),
    backElbow: point(146, 128),
    backHand: point(154, 148),
  };
}

function legCurlPose(depth: number, boost: number): Joints {
  const ankle = mix(point(250, 146), point(176, 96), depth, boost);
  return {
    head: point(62, 124),
    neck: point(80, 128),
    shoulder: point(98, 132),
    hip: point(168, 136),
    knee: point(214, 132),
    ankle,
    elbow: point(86, 150),
    hand: point(74, 168),
    backElbow: point(110, 148),
    backHand: point(100, 166),
  };
}

function standingCurlPose(depth: number, boost: number): Joints {
  const ankle = mix(point(214, 214), point(176, 150), depth, boost);
  return {
    head: point(148, 52),
    neck: point(150, 70),
    shoulder: point(152, 86),
    hip: point(156, 138),
    knee: point(188, 168),
    ankle,
    elbow: point(128, 112),
    hand: point(116, 140),
    backElbow: point(140, 118),
    backHand: point(132, 146),
  };
}

function bridgePose(depth: number, boost: number): Joints {
  const hip = point(168, 156 - depth * (40 + boost));
  return {
    head: point(78, 148),
    neck: point(96, 150),
    shoulder: point(112, 152),
    hip,
    knee: point(214, 124),
    ankle: point(246, 176),
    elbow: point(96, 168),
    hand: point(78, 176),
    backElbow: point(124, 166),
    backHand: point(108, 180),
  };
}

function kickPose(depth: number, boost: number): Joints {
  const ankle = mix(point(168, 176), point(246, 112), depth, boost);
  const knee = mix(point(176, 160), point(210, 132), depth);
  return {
    head: point(78, 108),
    neck: point(96, 118),
    shoulder: point(112, 128),
    hip: point(162, 136),
    knee,
    ankle,
    elbow: point(96, 150),
    hand: point(84, 176),
    backElbow: point(124, 146),
    backHand: point(112, 174),
    otherKnee: point(150, 176),
    otherAnkle: point(146, 188),
  };
}

function calfPose(depth: number, boost: number, seated: boolean): Joints {
  const rise = depth * (18 + boost);
  if (seated) {
    return {
      head: point(118, 74),
      neck: point(128, 92),
      shoulder: point(136, 108),
      hip: point(158, 154),
      knee: point(208, 150 - rise * 0.2),
      ankle: point(236, 196 - rise),
      elbow: point(122, 128),
      hand: point(112, 150),
      backElbow: point(148, 124),
      backHand: point(156, 146),
    };
  }
  return {
    head: point(158, 48 - rise),
    neck: point(156, 66 - rise),
    shoulder: point(154, 82 - rise),
    hip: point(152, 136 - rise),
    knee: point(156, 176 - rise),
    ankle: point(154, 216 - rise),
    elbow: point(184, 108 - rise),
    hand: point(176, 136 - rise),
    backElbow: point(132, 112 - rise),
    backHand: point(124, 140 - rise),
  };
}

function crunchPose(depth: number, boost: number): Joints {
  const shoulder = mix(point(112, 156), point(142, 118), depth, boost);
  return {
    head: point(shoulder.x - 24, shoulder.y - 8),
    neck: point(shoulder.x - 12, shoulder.y - 2),
    shoulder,
    hip: point(186, 156),
    knee: point(230, 122),
    ankle: point(196, 104),
    elbow: point(shoulder.x + 8, shoulder.y - 16),
    hand: point(shoulder.x - 8, shoulder.y - 28),
    backElbow: point(shoulder.x + 4, shoulder.y + 8),
    backHand: point(shoulder.x - 16, shoulder.y - 6),
  };
}

function sideBendPose(depth: number, boost: number): Joints {
  const lean = (depth - 0.5) * (48 + boost);
  return {
    head: point(160 + lean, 50),
    neck: point(160 + lean * 0.8, 70),
    shoulder: point(160 + lean * 0.7, 86),
    hip: point(160, 142),
    knee: point(140, 178),
    ankle: point(136, 216),
    elbow: point(128 + lean * 0.4, 112),
    hand: point(118 + lean * 0.3, 146),
    backElbow: point(176, 110),
    backHand: point(186, 142),
    otherKnee: point(180, 178),
    otherAnkle: point(184, 216),
  };
}

function plankPose(depth: number): Joints {
  const sag = (depth - 0.5) * 8;
  return {
    head: point(64, 112 + sag),
    neck: point(82, 116 + sag),
    shoulder: point(100, 120 + sag),
    hip: point(186, 124 - sag),
    knee: point(226, 126),
    ankle: point(264, 128),
    elbow: point(108, 150),
    hand: point(112, 176),
    backElbow: point(96, 154),
    backHand: point(100, 178),
  };
}

function stamp(data: Buffer, x: number, y: number, radius: number, color: Rgb) {
  const cx = x * SCALE;
  const cy = y * SCALE;
  const scaled = radius * SCALE;
  const minX = Math.max(0, Math.floor(cx - scaled));
  const maxX = Math.min(FRAME_WIDTH - 1, Math.ceil(cx + scaled));
  const minY = Math.max(0, Math.floor(cy - scaled));
  const maxY = Math.min(FRAME_HEIGHT - 1, Math.ceil(cy + scaled));
  const limit = scaled * scaled;
  for (let py = minY; py <= maxY; py += 1) {
    for (let px = minX; px <= maxX; px += 1) {
      const dx = px - cx;
      const dy = py - cy;
      if (dx * dx + dy * dy <= limit) {
        const index = (py * FRAME_WIDTH + px) * 4;
        data[index] = color[0];
        data[index + 1] = color[1];
        data[index + 2] = color[2];
        data[index + 3] = 255;
      }
    }
  }
}

function stroke(data: Buffer, start: Point, end: Point, radius: number, color: Rgb) {
  const steps = Math.max(1, Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) * SCALE));
  for (let step = 0; step <= steps; step += 1) {
    const amount = step / steps;
    stamp(
      data,
      start.x + (end.x - start.x) * amount,
      start.y + (end.y - start.y) * amount,
      radius,
      color,
    );
  }
}

function flipX(joints: Joints): Joints {
  const mirror = (value: Point) => point(FRAME_WIDTH - value.x, value.y);
  return {
    head: mirror(joints.head),
    neck: mirror(joints.neck),
    shoulder: mirror(joints.shoulder),
    hip: mirror(joints.hip),
    knee: mirror(joints.knee),
    ankle: mirror(joints.ankle),
    elbow: mirror(joints.elbow),
    hand: mirror(joints.hand),
    backElbow: mirror(joints.backElbow),
    backHand: mirror(joints.backHand),
    otherKnee: joints.otherKnee ? mirror(joints.otherKnee) : undefined,
    otherAnkle: joints.otherAnkle ? mirror(joints.otherAnkle) : undefined,
    otherElbow: joints.otherElbow ? mirror(joints.otherElbow) : undefined,
    otherHand: joints.otherHand ? mirror(joints.otherHand) : undefined,
  };
}

function shift(joints: Joints, x: number, y: number): Joints {
  const move = (value: Point) => point(value.x + x, value.y + y);
  const maybe = (value?: Point) => (value ? move(value) : undefined);
  return {
    head: move(joints.head),
    neck: move(joints.neck),
    shoulder: move(joints.shoulder),
    hip: move(joints.hip),
    knee: move(joints.knee),
    ankle: move(joints.ankle),
    elbow: move(joints.elbow),
    hand: move(joints.hand),
    backElbow: move(joints.backElbow),
    backHand: move(joints.backHand),
    otherKnee: maybe(joints.otherKnee),
    otherAnkle: maybe(joints.otherAnkle),
    otherElbow: maybe(joints.otherElbow),
    otherHand: maybe(joints.otherHand),
  };
}

function apart(anchor: Point, limb: Point, gap: number): Point {
  const dx = limb.x - anchor.x;
  const dy = limb.y - anchor.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= gap) {
    return limb;
  }
  if (distance < 1) {
    return point(anchor.x - gap, anchor.y - gap * 0.4);
  }
  return point(anchor.x + (dx / distance) * gap, anchor.y + (dy / distance) * gap);
}

function prepare(joints: Joints): Joints {
  const farLeg = !joints.otherKnee || !joints.otherAnkle;
  return {
    ...joints,
    backElbow: apart(joints.shoulder, joints.backElbow, 18),
    backHand: apart(joints.hand, joints.backHand, 22),
    otherKnee: farLeg
      ? apart(joints.knee, point(joints.knee.x - 16, joints.knee.y - 10), 20)
      : joints.otherKnee,
    otherAnkle: farLeg
      ? apart(joints.ankle, point(joints.ankle.x - 16, joints.ankle.y - 6), 18)
      : joints.otherAnkle,
  };
}

function pointsOf(joints: Joints) {
  return [
    joints.head,
    joints.neck,
    joints.shoulder,
    joints.hip,
    joints.knee,
    joints.ankle,
    joints.elbow,
    joints.hand,
    joints.backElbow,
    joints.backHand,
    joints.otherKnee,
    joints.otherAnkle,
    joints.otherElbow,
    joints.otherHand,
  ].filter((value): value is Point => value !== undefined);
}

function plant(joints: Joints, recipe: PoseRecipe): Joints {
  if (recipe.prop === 'machine' && (recipe.posture === 'sit' || recipe.posture === 'lie')) {
    return joints;
  }
  const hands =
    recipe.posture === 'plank' || recipe.action === 'plank' || recipe.action === 'kick';
  const resting =
    recipe.posture === 'lie' ||
    recipe.posture === 'sit' ||
    recipe.posture === 'bridge' ||
    recipe.action === 'bridge' ||
    recipe.action === 'crunch';
  if (resting) {
    return joints;
  }
  const contact = hands
    ? Math.max(joints.hand.y, joints.backHand.y)
    : Math.max(joints.ankle.y, joints.otherAnkle?.y ?? joints.ankle.y);
  return shift(joints, 0, GROUND - contact);
}

function clampFigure(joints: Joints): Joints {
  const marks = pointsOf(joints);
  const minX = Math.min(...marks.map((mark) => mark.x));
  const maxX = Math.max(...marks.map((mark) => mark.x));
  const minY = Math.min(...marks.map((mark) => mark.y));
  let dx = 0;
  if (minX < 22) {
    dx = 22 - minX;
  } else if (maxX > 298) {
    dx = 298 - maxX;
  }
  const dy = minY < 16 ? 16 - minY : 0;
  return shift(joints, dx, dy);
}

function facing(joints: Joints) {
  return joints.hand.x >= joints.shoulder.x ? 1 : -1;
}

function outlined(data: Buffer, start: Point, end: Point, radius: number) {
  stroke(data, start, end, radius + 1.6, INK);
  stroke(data, start, end, radius, PROP);
}

function disc(data: Buffer, at: Point, radius: number) {
  stamp(data, at.x, at.y, radius + 2.4, INK);
  stamp(data, at.x, at.y, radius, PROP);
}

function handle(data: Buffer, at: Point) {
  outlined(data, point(at.x - 9, at.y), point(at.x + 9, at.y), 2.4);
}

function dumbbell(data: Buffer, at: Point) {
  outlined(data, point(at.x - 12, at.y), point(at.x + 12, at.y), 2.2);
  disc(data, point(at.x - 12, at.y), 5);
  disc(data, point(at.x + 12, at.y), 5);
}

function barbell(data: Buffer, hand: Point, other: Point) {
  const gap = Math.hypot(other.x - hand.x, other.y - hand.y);
  const start = gap < 48 ? point(hand.x - 42, hand.y) : other;
  const end = gap < 48 ? point(hand.x + 42, hand.y) : hand;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const tipA = point(start.x - (dx / length) * 8, start.y - (dy / length) * 8);
  const tipB = point(end.x + (dx / length) * 8, end.y + (dy / length) * 8);
  outlined(data, tipA, tipB, 2.6);
  disc(data, tipA, 6);
  disc(data, tipB, 6);
}

function seatAndPost(data: Buffer, joints: Joints) {
  const sign = facing(joints);
  const seatY = joints.hip.y + 16;
  outlined(data, point(joints.hip.x - 26, seatY), point(joints.hip.x + 24, seatY), 3);
  const postX = joints.shoulder.x - sign * 32;
  outlined(data, point(postX, seatY), point(postX, Math.min(joints.head.y, joints.shoulder.y - 36)), 3);
}

function bench(data: Buffer, joints: Joints) {
  const y = Math.max(joints.shoulder.y, joints.hip.y) + 14;
  const left = Math.min(joints.head.x, joints.hip.x, joints.knee.x) - 10;
  const right = Math.max(joints.head.x, joints.hip.x, joints.knee.x) + 18;
  stroke(data, point(left, y), point(right, y), 4, FLOOR);
}

function drawSupport(data: Buffer, joints: Joints, recipe: PoseRecipe) {
  if (recipe.prop === 'machine') {
    const sign = facing(joints);
    const slug = recipe.equipment;
    if (slug === 'cable-machine') {
      const postX = joints.shoulder.x - sign * 52;
      outlined(
        data,
        point(postX, GROUND),
        point(postX, Math.min(joints.head.y - 10, 36)),
        3,
      );
      return;
    }
    if (slug === 'leg-press-machine') {
      seatAndPost(data, joints);
      return;
    }
    if (
      slug === 'leg-extension-machine' ||
      slug === 'leg-curl-machine' ||
      slug === 'glute-drive-machine'
    ) {
      bench(data, joints);
      return;
    }
    if (slug === 'standing-calf-machine') {
      outlined(
        data,
        point(joints.ankle.x - 18, joints.ankle.y),
        point(joints.ankle.x + 18, joints.ankle.y),
        3,
      );
      return;
    }
    seatAndPost(data, joints);
    return;
  }
  const resting =
    recipe.posture === 'lie' ||
    recipe.posture === 'sit' ||
    recipe.posture === 'bridge' ||
    recipe.action === 'bridge' ||
    recipe.action === 'crunch';
  if (resting) {
    bench(data, joints);
    return;
  }
  stroke(data, point(16, GROUND), point(304, GROUND), 3, FLOOR);
}

function drawLoad(data: Buffer, joints: Joints, recipe: PoseRecipe) {
  const otherHand = joints.otherHand ?? joints.backHand;
  if (recipe.prop === 'dumbbell') {
    dumbbell(data, joints.hand);
    dumbbell(data, otherHand);
    return;
  }
  if (recipe.prop === 'barbell') {
    barbell(data, joints.hand, otherHand);
    return;
  }
  if (recipe.prop !== 'machine') {
    return;
  }
  const slug = recipe.equipment;
  const sign = facing(joints);
  if (slug === 'cable-machine') {
    const postX = joints.shoulder.x - sign * 52;
    const pulley = point(postX, Math.min(joints.shoulder.y - 20, joints.hand.y));
    stroke(data, pulley, joints.hand, 2.2, INK);
    disc(data, pulley, 4);
    handle(data, joints.hand);
    return;
  }
  if (slug === 'lat-pulldown-machine') {
    const pulley = point(joints.hip.x, joints.head.y - 28);
    stroke(data, pulley, joints.hand, 2.2, INK);
    disc(data, pulley, 4);
    barbell(data, joints.hand, otherHand);
    return;
  }
  if (slug === 'pec-deck' || slug === 'lateral-raise-machine') {
    disc(data, joints.elbow, 7);
    disc(data, joints.otherElbow ?? joints.backElbow, 7);
    return;
  }
  if (slug === 'leg-extension-machine' || slug === 'leg-curl-machine') {
    disc(data, joints.ankle, 8);
    return;
  }
  if (slug === 'leg-press-machine') {
    outlined(
      data,
      point(joints.ankle.x - 8, joints.ankle.y - 10),
      point(joints.ankle.x + 24, joints.ankle.y + 6),
      4,
    );
    return;
  }
  if (slug === 'glute-drive-machine') {
    outlined(data, point(joints.hip.x - 22, joints.hip.y - 8), point(joints.hip.x + 22, joints.hip.y - 8), 4);
    return;
  }
  if (slug === 'standing-calf-machine') {
    disc(data, point(joints.shoulder.x - 12, joints.shoulder.y - 6), 6);
    disc(data, point(joints.shoulder.x + 12, joints.shoulder.y - 6), 6);
    return;
  }
  if (slug === 'seated-calf-machine') {
    disc(data, joints.knee, 7);
    return;
  }
  if (slug === 'abdominal-crunch-machine') {
    disc(data, point(joints.shoulder.x + sign * 14, joints.shoulder.y), 8);
    return;
  }
  handle(data, joints.hand);
  handle(data, otherHand);
}

function dot(data: Buffer, at: Point, color: Rgb) {
  stamp(data, at.x, at.y, 3.4, color);
}

function drawJoints(data: Buffer, joints: Joints, color: Rgb) {
  const bilateral = Boolean(joints.otherElbow && joints.otherHand);
  if (joints.otherKnee && joints.otherAnkle) {
    stroke(data, joints.hip, joints.otherKnee, 3.6, FAR);
    stroke(data, joints.otherKnee, joints.otherAnkle, 3.6, FAR);
  }
  if (!bilateral) {
    stroke(data, joints.shoulder, joints.backElbow, 3.2, FAR);
    stroke(data, joints.backElbow, joints.backHand, 3.2, FAR);
  }
  stroke(data, joints.neck, joints.hip, 5.2, INK);
  stroke(data, joints.hip, joints.knee, 4.8, INK);
  stroke(data, joints.knee, joints.ankle, 4.8, INK);
  stroke(data, joints.neck, joints.shoulder, 4.6, INK);
  stroke(data, joints.shoulder, joints.elbow, 4.4, color);
  stroke(data, joints.elbow, joints.hand, 4.4, color);
  if (bilateral && joints.otherElbow && joints.otherHand) {
    stroke(data, joints.shoulder, joints.otherElbow, 4.4, color);
    stroke(data, joints.otherElbow, joints.otherHand, 4.4, color);
  }
  stroke(data, joints.neck, joints.head, 4, INK);
  dot(data, joints.shoulder, INK);
  dot(data, joints.elbow, color);
  dot(data, joints.hand, color);
  dot(data, joints.hip, INK);
  dot(data, joints.knee, INK);
  dot(data, joints.ankle, INK);
  stamp(data, joints.head.x, joints.head.y, 11, INK);
}

export function renderFrame(recipe: PoseRecipe, frame: number) {
  const pixels = Buffer.from(background);
  const depth = depthAt(recipe, frame);
  const posed = recipe.lead === 'left' ? flipX(poseAt(recipe, depth)) : poseAt(recipe, depth);
  const shifted = shift(
    posed,
    recipe.nudgeX + (recipe.phase % 5) - 2,
    recipe.nudgeY + (recipe.cycles % 2),
  );
  const joints = clampFigure(plant(prepare(shifted), recipe));
  drawSupport(pixels, joints, recipe);
  drawJoints(pixels, joints, accent(recipe.tint, recipe.phase));
  drawLoad(pixels, joints, recipe);
  return pixels;
}

export function paintFrame(recipe: PoseRecipe, frame: number) {
  return encodePng(FRAME_WIDTH, FRAME_HEIGHT, renderFrame(recipe, frame));
}
