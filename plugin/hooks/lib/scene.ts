import type { TokoBones, TokoMood, TokoRoom, TokoSpecies, TokoStage } from '../../types'

import { rarityOf } from './pet'
import type { RoomSlot } from './room'
import { ROOM_SLOTS, completedSets } from './room'

import type { Random } from './random'
import type { Canvas, DrawOptions } from './raster'
import { clear, createCanvas, drawGrid, setPixel } from './raster'
import type { DayPhase, Face, Glasses, Grid, Mark, MouthShape, Palette, SpeciesArt } from './sprites'
import {
  BACKS,
  BAT,
  BOSS,
  BUBBLE,
  BUG,
  BUTTERFLY,
  CLAWD,
  CLAWD_SQUASHED,
  CLOUD,
  COIN,
  COOKIE,
  CRITTERS,
  CRUMB,
  CUP,
  DROP,
  EGG,
  EGG_CRACK,
  FEET,
  FIREFLY,
  GLASSES,
  HANDS,
  GIFT,
  GIFT_OPEN,
  HAMMER_DOWN,
  HAMMER_SIDE,
  HAMMER_SKINS,
  HAMMER_UP,
  HATS,
  HEART,
  LAMP_GLOW,
  LEAF,
  MOOD_FACE,
  MOUTHS,
  NECKS,
  NOTE,
  PUMPKIN,
  ROOM_COLORS,
  ROOM_PHASES,
  ROOM_PROPS,
  SET_BONUS,
  SHOOTING_STAR,
  SPARKLE,
  SPECIES_ART,
  SPROUT,
  STAR,
  STICKERS,
  TROPHY,
  UMBRELLA,
  WATERING_CAN,
  ZZZ,
  dyeGrid,
  eyeGrids,
  hex,
  paletteOf,
} from './sprites'

export const PET_WIDTH = 16
export const PET_HEIGHT = 16
export const BAND_ROWS = 8

export type Pose =
  | 'idle'
  | 'walk'
  | 'run'
  | 'sit'
  | 'sleep'
  | 'yawn'
  | 'eat'
  | 'jump'
  | 'stretch'
  | 'wave'
  | 'look'
  | 'windup'
  | 'strike'
  | 'recoil'
  | 'proud'
  | 'breathe-in'
  | 'breathe-out'
  | 'cower'
  | 'full'
  | 'dance'
  | 'egg'
  | 'egg-wobble'
  | 'egg-crack'
  | 'hidden'

export type Step = {
  pose: Pose
  ms: number
  toX?: number
  speed?: number
  dir?: 1 | -1
  enter?: (scene: Scene) => void
  priority?: number
}

export type EffectKind = 'z' | 'heart' | 'star' | 'coin' | 'sparkle' | 'note' | 'crumb' | 'leaf' | 'bubble' | 'drop' | 'shooting-star' | 'firefly' | 'butterfly' | 'bat'

export type Effect = { kind: EffectKind; x: number; y: number; vx: number; vy: number; until: number; born: number; gravity: number }

export type PropKind = 'clawd' | 'clawd-squashed' | 'gift' | 'gift-open' | 'cup' | 'umbrella' | 'cloud' | 'sprout' | 'can' | 'bug' | 'pumpkin' | 'boss'

export type Prop = { id: string; kind: PropKind; x: number; y: number; vx: number; until: number; born: number }

export type Wear = { hat?: string; neck?: string; face?: string; back?: string; hand?: string; dyes?: Readonly<Record<string, number>> }

export type Visitor = { id: string; species: TokoSpecies | 'shadow'; x: number; dir: 1 | -1; speed: number; until: number; pauseAt: number | null; pauseMs: number; pausePose: Pose; wear: Wear }

export type Look = {
  bones: TokoBones
  stage: TokoStage
  mood: TokoMood
  hat?: string
  neck?: string
  face?: string
  back?: string
  hand?: string
  dyes?: Readonly<Record<string, number>>
  hammer: string
  critter?: string
}

export type Follower = { x: number; dir: 1 | -1; side: 1 | -1; isMoving: boolean }

export type Scene = {
  width: number
  clock: number
  x: number
  dir: 1 | -1
  current: Step | null
  stepAt: number
  steps: Step[]
  effects: Effect[]
  props: Prop[]
  visitors: Visitor[]
  follower: Follower
  nextBlinkAt: number
  blinkUntil: number
  look: Look
  palette: Palette
  hammerPalette: ReadonlyMap<string, number>
  isFrozen: boolean
  planIdle: (scene: Scene) => Step[]
}

const hammerOverrides = (skin: string): ReadonlyMap<string, number> => {
  const colors = HAMMER_SKINS[skin] ?? HAMMER_SKINS.toy ?? { R: '#EE3344', r: '#AA2233' }
  return new Map([
    ['R', hex(colors.R)],
    ['r', hex(colors.r)],
  ])
}

export const createScene = (width: number, look: Look, planIdle: (scene: Scene) => Step[]): Scene => ({
  width,
  clock: 0,
  x: Math.max(0, Math.round(width / 2 - PET_WIDTH / 2)),
  dir: 1,
  current: null,
  stepAt: 0,
  steps: [],
  effects: [],
  props: [],
  visitors: [],
  follower: { x: Math.max(0, Math.round(width / 2 - PET_WIDTH / 2)), dir: 1, side: -1, isMoving: false },
  nextBlinkAt: 3000,
  blinkUntil: 0,
  look,
  palette: paletteOf(look.bones.species),
  hammerPalette: hammerOverrides(look.hammer),
  isFrozen: false,
  planIdle,
})

export const setLook = (scene: Scene, look: Look): void => {
  if (look.bones.species !== scene.look.bones.species) {
    scene.palette = paletteOf(look.bones.species)
  }
  if (look.hammer !== scene.look.hammer) {
    scene.hammerPalette = hammerOverrides(look.hammer)
  }
  scene.look = look
}

export const resize = (scene: Scene, width: number): void => {
  scene.width = width
  scene.x = Math.min(Math.max(0, scene.x), Math.max(0, width - PET_WIDTH))
}

export const centerX = (scene: Scene): number => Math.max(0, Math.round(scene.width / 2 - PET_WIDTH / 2))
export const rightX = (scene: Scene): number => Math.max(0, scene.width - PET_WIDTH - 10)
export const perform = (scene: Scene, steps: readonly Step[], priority: number): void => {
  const currentPriority = scene.current?.priority ?? 0
  if (priority >= currentPriority) {
    scene.current = null
    scene.steps = steps.map(step => ({ ...step, priority }))
    return
  }
  scene.steps = [...scene.steps, ...steps.map(step => ({ ...step, priority }))]
}

export const isBusy = (scene: Scene): boolean => (scene.current?.priority ?? 0) > 0 || scene.steps.length > 0

export const spawn = (scene: Scene, kind: EffectKind, x: number, y: number, vx: number, vy: number, lifeMs: number, gravity = 0): void => {
  scene.effects = [...scene.effects, { kind, x, y, vx, vy, until: scene.clock + lifeMs, born: scene.clock, gravity }].slice(-40)
}

export const placeProp = (scene: Scene, id: string, kind: PropKind, x: number, y: number, lifeMs: number, vx = 0): void => {
  scene.props = [...scene.props.filter(prop => prop.id !== id), { id, kind, x, y, vx, until: scene.clock + lifeMs, born: scene.clock }]
}

export const removeProp = (scene: Scene, id: string): void => {
  scene.props = scene.props.filter(prop => prop.id !== id)
}

const VISITOR_SPEED = 10
const VISITOR_GAP = 4

const visitorPath = (scene: Scene): { dir: 1 | -1; startX: number; pauseAt: number } =>
  scene.x > scene.width / 2
    ? { dir: 1, startX: -PET_WIDTH, pauseAt: scene.x - PET_WIDTH - VISITOR_GAP }
    : { dir: -1, startX: scene.width, pauseAt: scene.x + PET_WIDTH + VISITOR_GAP }

export type VisitTiming = { arrivalMs: number; faceDir: 1 | -1 }

export const visitTiming = (scene: Scene): VisitTiming => {
  const path = visitorPath(scene)
  return { arrivalMs: (Math.abs(path.pauseAt - path.startX) / VISITOR_SPEED) * 1000, faceDir: path.dir === 1 ? -1 : 1 }
}

export const addVisitor = (scene: Scene, id: string, species: TokoSpecies | 'shadow', lifeMs: number, pauseMs = 0, pausePose: Pose = 'wave', wear: Wear = {}): void => {
  const path = visitorPath(scene)
  const visitor: Visitor = {
    id,
    species,
    x: path.startX,
    dir: path.dir,
    speed: VISITOR_SPEED,
    until: scene.clock + lifeMs,
    pauseAt: pauseMs > 0 ? path.pauseAt : null,
    pauseMs,
    pausePose,
    wear,
  }
  scene.visitors = [...scene.visitors.filter(other => other.id !== id), visitor].slice(-3)
}

const advanceStep = (scene: Scene): void => {
  if (scene.current === null) {
    if (scene.steps.length === 0) {
      scene.steps = scene.planIdle(scene).map(step => ({ ...step, priority: 0 }))
    }
    const [next, ...rest] = scene.steps
    scene.steps = rest
    scene.current = next ?? { pose: 'idle', ms: 1000, priority: 0 }
    scene.stepAt = scene.clock
    if (scene.current.dir !== undefined) {
      scene.dir = scene.current.dir
    }
    scene.current.enter?.(scene)
  }
}

const moveToward = (scene: Scene, step: Step, dt: number): boolean => {
  if (step.toX === undefined) {
    return scene.clock - scene.stepAt >= step.ms
  }
  const speed = step.speed ?? (step.pose === 'run' ? 22 : 8)
  const distance = step.toX - scene.x
  scene.dir = distance === 0 ? scene.dir : distance > 0 ? 1 : -1
  const move = (speed * dt) / 1000
  if (Math.abs(distance) <= move) {
    scene.x = step.toX
    return true
  }
  scene.x += Math.sign(distance) * move
  return scene.clock - scene.stepAt >= Math.max(step.ms, 20_000)
}

const stepEffects = (scene: Scene, dt: number): void => {
  const seconds = dt / 1000
  scene.effects = scene.effects
    .filter(effect => effect.until > scene.clock)
    .map(effect => ({
      ...effect,
      x: effect.x + effect.vx * seconds,
      y: effect.y + effect.vy * seconds,
      vy: effect.vy + effect.gravity * seconds,
    }))
  scene.props = scene.props
    .filter(prop => prop.until > scene.clock)
    .map(prop => ({ ...prop, x: prop.x + prop.vx * seconds }))
  scene.visitors = scene.visitors.filter(visitor => visitor.until > scene.clock).map(visitor => moveVisitor(visitor, scene, seconds))
}

const moveVisitor = (visitor: Visitor, scene: Scene, seconds: number): Visitor => {
  if (visitor.pauseAt !== null && Math.abs(visitor.x - visitor.pauseAt) < 1) {
    return visitor.pauseMs > 0 ? { ...visitor, pauseMs: visitor.pauseMs - seconds * 1000 } : { ...visitor, pauseAt: null, dir: visitor.dir === 1 ? -1 : 1 }
  }
  if (visitor.pauseAt !== null) {
    const distance = visitor.pauseAt - visitor.x
    const move = Math.min(Math.abs(distance), visitor.speed * seconds)
    return { ...visitor, x: visitor.x + Math.sign(distance) * move }
  }
  const x = visitor.x + visitor.dir * visitor.speed * seconds
  return x < -PET_WIDTH * 2 || x > scene.width + PET_WIDTH ? { ...visitor, x, until: scene.clock } : { ...visitor, x }
}

const CRITTER_GAP = 2
const CRITTER_SPEED = 16

const critterWidth = (grid: Grid): number => grid.reduce((max, row) => Math.max(max, row.length), 0)

const follow = (scene: Scene, dt: number): void => {
  const critter = scene.look.critter === undefined ? undefined : CRITTERS[scene.look.critter]
  const follower = scene.follower
  if (critter === undefined) {
    scene.follower = { ...follower, x: scene.x, isMoving: false }
    return
  }
  const pose = scene.current?.pose
  const side = pose === 'walk' || pose === 'run' ? (scene.dir > 0 ? -1 : 1) : follower.side
  const target = pose === 'hidden' ? scene.x : side < 0 ? scene.x - CRITTER_GAP - critterWidth(critter.stand) : scene.x + PET_WIDTH + CRITTER_GAP
  const distance = target - follower.x
  const move = (CRITTER_SPEED * dt) / 1000
  if (Math.abs(distance) <= move) {
    scene.follower = { x: target, dir: side < 0 ? 1 : -1, side, isMoving: false }
    return
  }
  scene.follower = { x: follower.x + Math.sign(distance) * move, dir: distance > 0 ? 1 : -1, side, isMoving: true }
}

const ambientEffects = (scene: Scene, random: Random): void => {
  const pose = scene.current?.pose
  if (pose === 'sleep' && random() < 0.04) {
    spawn(scene, 'z', scene.x + 13, 4, 2, -2.5, 1800)
  }
  const rarityChance = { normal: 0, rare: 0.03 }[rarityOf(scene.look.bones)]
  if (pose !== 'hidden' && random() < rarityChance) {
    spawn(scene, 'sparkle', scene.x - 2 + random() * (PET_WIDTH + 4), 1 + random() * 10, 0, 0, 500)
  }
  if (pose === 'dance' && random() < 0.05) {
    spawn(scene, 'note', scene.x + (random() < 0.5 ? -3 : PET_WIDTH), 4, 0, -3, 1200)
  }
}

export const tick = (scene: Scene, dt: number, random: Random): void => {
  if (scene.isFrozen) {
    return
  }
  scene.clock += dt
  advanceStep(scene)
  const step = scene.current
  if (step !== null && moveToward(scene, step, dt)) {
    scene.current = null
    advanceStep(scene)
  }
  follow(scene, dt)
  if (scene.clock >= scene.nextBlinkAt) {
    scene.blinkUntil = scene.clock + 160
    scene.nextBlinkAt = scene.clock + 3000 + random() * 3000
  }
  ambientEffects(scene, random)
  stepEffects(scene, dt)
}

type Frame = { dy: number; feet: keyof typeof FEET; eyes?: 'happy' | 'closed' | 'lidded' | 'open'; mouth?: MouthShape; arms?: 'up' | 'wave-a' | 'wave-b'; hammer?: 'up' | 'down' | 'side'; shakeX: number }

const cycle = (elapsed: number, frameMs: number, count: number): number => Math.floor(elapsed / frameMs) % count

export const frameOf = (pose: Pose, elapsed: number): Frame => {
  const base: Frame = { dy: 0, feet: 'stand', shakeX: 0 }
  switch (pose) {
    case 'idle':
    case 'look':
      return { ...base, dy: cycle(elapsed, 700, 2) }
    case 'walk':
    case 'run': {
      const index = cycle(elapsed, pose === 'run' ? 80 : 140, 4)
      return { ...base, dy: index % 2, feet: index === 0 ? 'stepA' : index === 2 ? 'stepB' : 'stand' }
    }
    case 'sit':
      return { ...base, dy: 1, feet: 'tuck' }
    case 'sleep':
      return { ...base, dy: 1, feet: 'tuck', eyes: 'closed', mouth: 'flat' }
    case 'yawn':
      return { ...base, dy: cycle(elapsed, 500, 2), eyes: 'closed', mouth: 'open' }
    case 'eat':
      return { ...base, mouth: cycle(elapsed, 160, 2) === 0 ? 'open' : 'small', eyes: 'happy' }
    case 'jump': {
      const index = Math.min(6, Math.floor(elapsed / 90))
      const heights = [1, 0, -1, -1, 0, 1, 0]
      return { ...base, dy: heights[index] ?? 0, feet: index >= 2 && index <= 4 ? 'tuck' : 'stand', eyes: 'happy', mouth: 'open' }
    }
    case 'stretch':
      return { ...base, dy: cycle(elapsed, 900, 2) === 0 ? -1 : 0, arms: 'up', eyes: 'happy', mouth: 'small' }
    case 'wave':
      return { ...base, arms: cycle(elapsed, 220, 2) === 0 ? 'wave-a' : 'wave-b', eyes: 'happy', mouth: 'small' }
    case 'windup':
      return { ...base, dy: -1, hammer: 'up', mouth: 'pout' }
    case 'strike':
      return { ...base, dy: 1, hammer: 'down', eyes: 'closed', mouth: 'open' }
    case 'recoil':
      return { ...base, dy: -1, hammer: 'side', eyes: 'happy', mouth: 'open' }
    case 'proud':
      return { ...base, hammer: 'side', eyes: 'happy', mouth: 'small' }
    case 'breathe-in':
      return { ...base, dy: -1, eyes: 'closed', mouth: 'small' }
    case 'breathe-out':
      return { ...base, dy: 1, eyes: 'closed', mouth: 'flat' }
    case 'cower':
      return { ...base, dy: 1, eyes: 'closed', mouth: 'wavy', shakeX: cycle(elapsed, 60, 2) === 0 ? -1 : 1 }
    case 'full':
      return { ...base, dy: 2, feet: 'tuck', eyes: 'happy', mouth: 'small' }
    case 'dance': {
      const index = cycle(elapsed, 250, 4)
      return { ...base, dy: index % 2 === 0 ? 0 : -1, feet: index < 2 ? 'stepA' : 'stepB', eyes: 'happy', mouth: 'open', arms: index < 2 ? 'wave-a' : 'wave-b' }
    }
    default:
      return base
  }
}

const drawFace = (canvas: Canvas, scene: Scene, frame: Frame, x: number, y: number, scale: number, isBlinking: boolean): void => {
  const mood = MOOD_FACE[scene.look.mood]
  const art = SPECIES_ART[scene.look.bones.species]
  const face = art.face
  const eyeShape = isBlinking && (frame.eyes ?? mood.eyes) === 'open' ? 'closed' : (frame.eyes ?? mood.eyes)
  const [left, right] = eyeGrids(art.eyes, eyeShape)
  const options: DrawOptions = { scale }
  drawGrid(canvas, left, x + face.leftEye[0] * scale, y + face.leftEye[1] * scale, scene.palette, options)
  drawGrid(canvas, right, x + face.rightEye[0] * scale, y + face.rightEye[1] * scale, scene.palette, options)
  const blush = scene.palette.get('p') ?? 0
  const eyeColor = scene.palette.get('e') ?? 0
  for (const [bx, by] of [face.leftBlush, face.rightBlush]) {
    fillBlock(canvas, x + bx * scale, y + by * scale, scale, blush)
  }
  if (mood.hasBrows && frame.eyes === undefined) {
    fillBlock(canvas, x + (face.leftEye[0] + 1) * scale, y + (face.leftEye[1] - 1) * scale, scale, eyeColor)
    fillBlock(canvas, x + face.rightEye[0] * scale, y + (face.rightEye[1] - 1) * scale, scale, eyeColor)
  }
  drawMouth(canvas, scene.palette, art, frame.mouth ?? mood.mouth, x, y, scale)
}

const drawWear = (canvas: Canvas, palette: Palette, art: SpeciesArt, wear: Wear, x: number, y: number, scale: number, isFlipped: boolean): void => {
  const glasses = wear.face === undefined ? undefined : GLASSES[wear.face]
  if (glasses !== undefined) {
    drawGlasses(canvas, palette, art.face, glasses, x, y, scale)
  }
  const hat = wear.hat === undefined ? undefined : HATS[wear.hat]
  if (hat !== undefined) {
    drawMark(canvas, palette, { ...hat, grid: dyeGrid(hat.grid, wear.dyes?.[wear.hat ?? ''] ?? 0), dy: hat.dy + art.hatDy }, x, y, scale, isFlipped)
  }
  const hand = wear.hand === undefined ? undefined : HANDS[wear.hand]
  if (hand !== undefined) {
    const [, right] = bodyEdges(art)
    drawGrid(canvas, dyeGrid(hand.grid, wear.dyes?.[wear.hand ?? ''] ?? 0), x + (right + 1) * scale, y + (art.armY + hand.dy) * scale, palette, { scale })
  }
}

const bodyEdges = (art: SpeciesArt): readonly [number, number] => {
  const row = art.body[art.armY] ?? ''
  return [row.search(/[^.]/), row.length - 1 - [...row].reverse().join('').search(/[^.]/)]
}

const drawBack = (canvas: Canvas, palette: Palette, art: SpeciesArt, wear: Wear, x: number, y: number, scale: number): void => {
  const back = wear.back === undefined ? undefined : BACKS[wear.back]
  if (back === undefined) {
    return
  }
  const dye = wear.dyes?.[wear.back ?? ''] ?? 0
  const [left, right] = bodyEdges(art)
  const top = y + (art.armY + back.dy) * scale
  const width = Math.max(0, ...back.left.map(row => row.length))
  drawGrid(canvas, dyeGrid(back.left, dye), x + (left - width) * scale, top, palette, { scale })
  drawGrid(canvas, dyeGrid(back.right, dye), x + (right + 1) * scale, top, palette, { scale })
}

const drawNeck = (canvas: Canvas, palette: Palette, art: SpeciesArt, wear: Wear, x: number, y: number, scale: number, isFlipped: boolean): void => {
  const neck = wear.neck === undefined ? undefined : NECKS[wear.neck]
  if (neck !== undefined) {
    drawMark(canvas, palette, { ...neck, grid: dyeGrid(neck.grid, wear.dyes?.[wear.neck ?? ''] ?? 0), dy: art.neckY + neck.dy }, x, y, scale, isFlipped)
  }
}

const drawGlasses = (canvas: Canvas, palette: Palette, face: Face, glasses: Glasses, x: number, y: number, scale: number): void => {
  for (const [ex, ey] of [face.leftEye, face.rightEye]) {
    drawGrid(canvas, glasses.lens, x + (ex - 1) * scale, y + (ey - 1) * scale, palette, { scale })
  }
  const bridge = palette.get(glasses.bridge) ?? 0
  for (let bx = face.leftEye[0] + 3; bx < face.rightEye[0] - 1; bx += 1) {
    fillBlock(canvas, x + bx * scale, y + face.leftEye[1] * scale, scale, bridge)
  }
}

const drawMouth = (canvas: Canvas, palette: Palette, art: SpeciesArt, shape: MouthShape, x: number, y: number, scale: number): void => {
  for (const [mx, my, key] of MOUTHS[art.mouths?.[shape] ?? shape]) {
    fillBlock(canvas, x + (art.face.mouth[0] + mx) * scale, y + (art.face.mouth[1] + my) * scale, scale, palette.get(key) ?? 0)
  }
}

const fillBlock = (canvas: Canvas, x: number, y: number, scale: number, color: number): void => {
  for (let dy = 0; dy < scale; dy += 1) {
    for (let dx = 0; dx < scale; dx += 1) {
      setPixel(canvas, x + dx, y + dy, color)
    }
  }
}

const drawArms = (canvas: Canvas, palette: Palette, art: SpeciesArt, arms: Frame['arms'], x: number, y: number, scale: number, isFlipped: boolean): void => {
  if (arms === undefined) {
    return
  }
  const body = palette.get('b') ?? 0
  const outline = palette.get('o') ?? 0
  const row = art.body[art.armY] ?? ''
  const left = row.search(/[^.]/) - 1
  const right = row.length - [...row].reverse().join('').search(/[^.]/)
  const at = art.armY
  const spots: readonly (readonly [number, number, number])[] =
    arms === 'up'
      ? [[left, at - 2, outline], [left, at - 1, body], [left, at, outline], [right, at - 2, outline], [right, at - 1, body], [right, at, outline]]
      : arms === 'wave-a'
        ? [[right, at - 2, outline], [right, at - 1, body], [right + 1, at - 2, outline]]
        : [[right, at, outline], [right, at + 1, body], [right + 1, at + 1, outline]]
  for (const [ax, ay, color] of spots) {
    fillBlock(canvas, x + (isFlipped ? PET_WIDTH - 1 - ax : ax) * scale, y + ay * scale, scale, color)
  }
}

const drawHammer = (canvas: Canvas, scene: Scene, hammer: Frame['hammer'], x: number, y: number, scale: number): void => {
  if (hammer === undefined) {
    return
  }
  const options: DrawOptions = { scale, overrides: scene.hammerPalette, isFlipped: scene.dir < 0 && hammer === 'side' }
  const front = scene.dir > 0 ? x + 14 * scale : x - 5 * scale
  if (hammer === 'up') {
    drawGrid(canvas, HAMMER_UP, scene.dir > 0 ? x - 4 * scale : x + 15 * scale, y - 1 * scale, scene.palette, options)
  } else if (hammer === 'down') {
    drawGrid(canvas, HAMMER_DOWN, front, y + 6 * scale, scene.palette, options)
  } else {
    drawGrid(canvas, HAMMER_SIDE, scene.dir > 0 ? x + 14 * scale : x - 7 * scale, y + 7 * scale, scene.palette, options)
  }
}

const drawMark = (canvas: Canvas, palette: Palette, mark: Mark, x: number, y: number, scale: number, isFlipped: boolean): void => {
  const width = mark.grid.reduce((max, row) => Math.max(max, row.length), 0)
  const dx = isFlipped ? PET_WIDTH - mark.dx - width : mark.dx
  drawGrid(canvas, mark.grid, x + dx * scale, y + mark.dy * scale, palette, { scale, isFlipped })
}

type Point = readonly [number, number]

const NEAR: readonly Point[] = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]
const FAR: readonly Point[] = [[-2, 0], [2, 0], [0, -2], [0, 2]]
const rings = new Map<Grid, { near: Point[]; far: Point[] }>()

const ringOf = (body: Grid): { near: Point[]; far: Point[] } => {
  const cached = rings.get(body)
  if (cached !== undefined) {
    return cached
  }
  const isBody = (x: number, y: number): boolean => (body[y]?.[x] ?? '.') !== '.'
  const ring = { near: [] as Point[], far: [] as Point[] }
  for (let y = -2; y < body.length + 2; y += 1) {
    for (let x = -2; x < critterWidth(body) + 2; x += 1) {
      if (isBody(x, y)) {
        continue
      }
      if (NEAR.some(([dx, dy]) => isBody(x + dx, y + dy))) {
        ring.near.push([x, y])
      } else if (FAR.some(([dx, dy]) => isBody(x + dx, y + dy))) {
        ring.far.push([x, y])
      }
    }
  }
  rings.set(body, ring)
  return ring
}

const drawAura = (canvas: Canvas, scene: Scene, art: SpeciesArt, x: number, y: number, scale: number): void => {
  if (art.aura === undefined) {
    return
  }
  const ring = ringOf(art.body)
  const near = hex(art.aura.near)
  const far = hex(art.aura.far)
  const phase = cycle(scene.clock, 400, 2)
  for (const [ax, ay] of ring.near) {
    fillBlock(canvas, x + ax * scale, y + ay * scale, scale, near)
  }
  for (const [ax, ay] of ring.far) {
    if ((ax + ay + phase) % 2 === 0) {
      fillBlock(canvas, x + ax * scale, y + ay * scale, scale, far)
    }
  }
}

export const paintPet = (canvas: Canvas, scene: Scene, pose: Pose, elapsed: number, x: number, baseY: number, scale: number): void => {
  const look = scene.look
  if (pose === 'hidden') {
    return
  }
  if (look.stage === 'egg' || pose === 'egg' || pose === 'egg-wobble' || pose === 'egg-crack') {
    const wobble = pose === 'egg-wobble' ? (cycle(elapsed, 120, 4) % 2 === 0 ? -1 : 1) : 0
    const grid = pose === 'egg-crack' ? EGG_CRACK : EGG
    drawGrid(canvas, grid, x + (3 + wobble) * scale, baseY + 4 * scale, scene.palette, { scale })
    return
  }
  const frame = frameOf(pose, elapsed)
  const px = x + frame.shakeX * scale
  const py = baseY + frame.dy * scale
  const isFlipped = scene.dir < 0
  const art = SPECIES_ART[look.bones.species]
  drawAura(canvas, scene, art, px, py, scale)
  drawBack(canvas, scene.palette, art, look, px, py, scale)
  drawGrid(canvas, art.body, px, py, scene.palette, { scale })
  if (art.isFloating !== true) {
    const feetY = frame.feet === 'tuck' ? py : baseY
    drawGrid(canvas, [FEET[frame.feet]], px, feetY + (PET_HEIGHT - 1) * scale, scene.palette, { scale, isFlipped })
  }
  drawNeck(canvas, scene.palette, art, look, px, py, scale, false)
  drawFace(canvas, scene, frame, px, py, scale, scene.clock < scene.blinkUntil)
  drawWear(canvas, scene.palette, art, look, px, py, scale, false)
  drawArms(canvas, scene.palette, art, frame.arms, px, py, scale, scene.dir < 0)
  drawHammer(canvas, scene, frame.hammer, px, py, scale)
}

const PORTRAIT_MARGIN = 2

export const portraitOf = (look: Look): Canvas => {
  const canvas = createCanvas(PET_WIDTH + PORTRAIT_MARGIN * 2, BAND_ROWS + 1)
  paintPet(canvas, createScene(PET_WIDTH, look, () => []), 'idle', 0, PORTRAIT_MARGIN, PORTRAIT_MARGIN, 1)
  return canvas
}

const critterGrid =(critter: { stand: Grid; step: Grid; fur: string }, pose: Pose, isMoving: boolean, clock: number): Grid => {
  if (pose === 'sleep') {
    return critter.stand.slice(0, -1).map(row => row.replaceAll('e', critter.fur))
  }
  if (isMoving) {
    return cycle(clock, 140, 2) === 0 ? critter.stand : critter.step
  }
  return pose === 'sit' || pose === 'full' ? critter.stand.slice(0, -1) : critter.stand
}

const paintCritter = (canvas: Canvas, scene: Scene, pose: Pose, x: number, groundY: number, dir: 1 | -1, isMoving: boolean, scale: number): void => {
  const critter = scene.look.critter === undefined ? undefined : CRITTERS[scene.look.critter]
  if (critter === undefined) {
    return
  }
  const grid = critterGrid(critter, pose, isMoving, scene.clock)
  drawGrid(canvas, grid, x, groundY - grid.length * scale, scene.palette, { scale, isFlipped: dir < 0 })
}

const EFFECT_GRIDS: Readonly<Record<EffectKind, (age: number) => Grid>> = {
  z: () => ZZZ,
  heart: () => HEART,
  star: () => STAR,
  coin: () => COIN,
  sparkle: () => SPARKLE,
  note: () => NOTE,
  crumb: () => CRUMB,
  leaf: age => LEAF[cycle(age, 400, 2)] ?? CRUMB,
  bubble: () => BUBBLE,
  drop: () => DROP,
  'shooting-star': () => SHOOTING_STAR,
  firefly: age => FIREFLY[cycle(age, 300, 2)] ?? CRUMB,
  butterfly: age => BUTTERFLY[cycle(age, 180, 2)] ?? CRUMB,
  bat: age => BAT[cycle(age, 160, 2)] ?? CRUMB,
}

const PROP_GRIDS: Readonly<Record<PropKind, (age: number) => Grid>> = {
  clawd: () => CLAWD,
  'clawd-squashed': () => CLAWD_SQUASHED,
  gift: () => GIFT,
  'gift-open': () => GIFT_OPEN,
  cup: () => CUP,
  umbrella: () => UMBRELLA,
  cloud: () => CLOUD,
  sprout: age => SPROUT[Math.min(SPROUT.length - 1, Math.floor(age / 2500))] ?? CRUMB,
  can: () => WATERING_CAN,
  bug: age => BUG[cycle(age, 200, 2)] ?? CRUMB,
  pumpkin: age => PUMPKIN[cycle(age, 500, 2)] ?? CRUMB,
  boss: age => BOSS[cycle(age, 450, 2)] ?? CRUMB,
}

const SHADOW_TINT = hex('#888899')
const VISITOR_EYE: Grid = ['we', 'ee']

const drawVisitor = (canvas: Canvas, scene: Scene, visitor: Visitor): void => {
  const isPaused = visitor.pauseAt !== null && Math.abs(visitor.x - visitor.pauseAt) < 1
  const frame = frameOf(isPaused ? visitor.pausePose : 'walk', scene.clock)
  const species = visitor.species === 'shadow' ? scene.look.bones.species : visitor.species
  const art = SPECIES_ART[species]
  const palette = visitor.species === 'shadow' ? scene.palette : paletteOf(species)
  const options: DrawOptions = visitor.species === 'shadow' ? { tint: SHADOW_TINT, isFlipped: visitor.dir < 0 } : { isFlipped: visitor.dir < 0 }
  const y = BAND_ROWS * 2 - PET_HEIGHT + frame.dy
  drawGrid(canvas, art.body, visitor.x, y, palette, options)
  if (art.isFloating !== true) {
    drawGrid(canvas, [FEET[frame.feet]], visitor.x, BAND_ROWS * 2 - 1, palette, options)
  }
  if (visitor.species === 'shadow') {
    return
  }
  drawNeck(canvas, palette, art, visitor.wear, visitor.x, y, 1, visitor.dir < 0)
  const [left, right] = frame.eyes === undefined || frame.eyes === 'open' ? [VISITOR_EYE, VISITOR_EYE] : eyeGrids(art.eyes, frame.eyes)
  drawGrid(canvas, left, visitor.x + art.face.leftEye[0], y + art.face.leftEye[1], palette)
  drawGrid(canvas, right, visitor.x + art.face.rightEye[0], y + art.face.rightEye[1], palette)
  drawMouth(canvas, palette, art, frame.mouth ?? 'small', visitor.x, y, 1)
  drawWear(canvas, palette, art, visitor.wear, visitor.x, y, 1, visitor.dir < 0)
  drawArms(canvas, palette, art, frame.arms, visitor.x, y, 1, visitor.dir < 0)
}

export const paint = (scene: Scene, canvas: Canvas): void => {
  clear(canvas)
  for (const prop of scene.props) {
    drawGrid(canvas, PROP_GRIDS[prop.kind](scene.clock - prop.born), prop.x, prop.y, scene.palette)
  }
  for (const visitor of scene.visitors) {
    drawVisitor(canvas, scene, visitor)
  }
  const pose = scene.current?.pose ?? 'idle'
  paintCritter(canvas, scene, pose, Math.round(scene.follower.x), canvas.height, scene.follower.dir, scene.follower.isMoving, 1)
  paintPet(canvas, scene, pose, scene.clock - scene.stepAt, Math.round(scene.x), BAND_ROWS * 2 - PET_HEIGHT, 1)
  for (const effect of scene.effects) {
    drawGrid(canvas, EFFECT_GRIDS[effect.kind](scene.clock - effect.born), effect.x, effect.y, scene.palette)
  }
}

export type RoomGuest = { id: string; look: Look }

export type RoomActKind = 'hug' | 'snack' | 'play' | 'nap'

export type RoomActMark = { guest: string; act: RoomActKind; at: number }

export type RoomView = {
  layout: TokoRoom
  placed: { slot: string; at: number } | null
  hour: number
  guests: readonly RoomGuest[]
  acts: readonly RoomActMark[]
  owner: Look | null
  stickers: readonly string[]
  trophies: number
  care: { kind: 'eat' | 'play'; at: number } | null
}

export type DecorView = Pick<RoomView, 'layout' | 'hour'> & Partial<Pick<RoomView, 'stickers' | 'trophies'>>

export const dayPhase = (hour: number): DayPhase => (hour >= 20 || hour < 7 ? 'night' : hour < 10 ? 'morning' : hour >= 17 ? 'sunset' : 'day')

const ACT_SHOW = 3000

const ACT_POSE: Readonly<Record<RoomActKind, Pose>> = { hug: 'jump', snack: 'eat', play: 'run', nap: 'sleep' }

const ACT_EFFECT: Readonly<Record<RoomActKind, Grid>> = { hug: HEART, snack: COOKIE, play: NOTE, nap: ZZZ }

const lookScenes = new Map<string, Scene>()

const sceneOfLook = (look: Look, clock: number): Scene => {
  const key = JSON.stringify(look)
  const scene = lookScenes.get(key) ?? createScene(PET_WIDTH, look, () => [{ pose: 'idle', ms: 60_000 }])
  lookScenes.set(key, scene)
  scene.clock = clock
  return scene
}

const ROOM_BEAT = 9000
const ROOM_WALK = 1500
const PLACE_RUN = 1000
export const PLACE_SHOW = 3000
const NARROW_ROOM = 96

const ROOM_USE: Readonly<Record<string, Pose>> = {
  plant: 'look',
  lamp: 'sleep',
  cushion: 'sleep',
  fishbowl: 'look',
  bookshelf: 'sit',
  'cat-tower': 'jump',
  frame: 'look',
  window: 'look',
  clock: 'look',
  rug: 'dance',
  'stripe-rug': 'dance',
  'flower-rug': 'dance',
  'cloud-rug': 'sleep',
  'water-bottle': 'eat',
  'yoga-mat': 'stretch',
  telescope: 'look',
}

type RoomProp = { id: string; slot: RoomSlot; grid: Grid; x: number; y: number; width: number }

type RoomSpot = { x: number; pose: Pose; guest?: number }

const isNight = (hour: number): boolean => hour >= 20 || hour < 7

const slotX = (slot: RoomSlot, width: number, size: number): number =>
  ({
    'wall-left': 6,
    'wall-right': width - 6 - size,
    'floor-1': 3,
    'floor-2': 22,
    'floor-3': width - 22 - size,
    'floor-4': width - 3 - size,
    rug: Math.round(width / 2 - size / 2),
    wallpaper: 0,
    flooring: 0,
  })[slot]

const isShownSlot = (slot: RoomSlot, width: number): boolean => width >= NARROW_ROOM || (slot !== 'floor-2' && slot !== 'floor-3')

const roomProps = (view: DecorView, width: number, floor: number): readonly RoomProp[] =>
  ROOM_SLOTS.map(({ id: slot, spot }) => {
    const id = view.layout[slot]
    const grid = id === undefined ? undefined : (ROOM_PHASES[id]?.[dayPhase(view.hour)] ?? ROOM_PROPS[id])
    if (id === undefined || grid === undefined || !isShownSlot(slot, width)) {
      return null
    }
    const size = (grid[0]?.length ?? 0) * 2
    const y = spot === 'wall' ? 3 : spot === 'rug' ? floor : floor + 2 - grid.length * 2
    return { id, slot, grid, x: slotX(slot, width, size), y, width: size }
  }).filter((prop): prop is RoomProp => prop !== null)

const mix = (n: number): number => {
  const h = Math.imul(n ^ (n >>> 16), 0x45d9f3b) >>> 0
  return (h ^ (h >>> 13)) >>> 0
}

const lerp = (from: number, to: number, t: number): number => Math.round(from + (to - from) * Math.min(1, Math.max(0, t)))

const besideOf = (prop: RoomProp, width: number): number => {
  if (prop.slot === 'rug') {
    return Math.round(prop.x + prop.width / 2 - PET_WIDTH)
  }
  return prop.x + prop.width / 2 < width / 2 ? prop.x + prop.width + 1 : prop.x - PET_WIDTH * 2 - 1
}

const spotFor = (prop: RoomProp, width: number): number => Math.min(width - PET_WIDTH * 2, Math.max(0, besideOf(prop, width)))

const guestX = (index: number, width: number): number => {
  const home = Math.round(width / 2 - PET_WIDTH)
  return Math.min(width - PET_WIDTH * 2, Math.max(0, index === 0 ? home - 40 : home + 60))
}

const besideGuest = (index: number, width: number): number => {
  const x = guestX(index, width)
  return Math.min(width - PET_WIDTH * 2, Math.max(0, index === 0 ? x + PET_WIDTH * 2 + 2 : x - PET_WIDTH * 2 - 2))
}

const roomSpots = (scene: Scene, props: readonly RoomProp[], width: number, hour: number, guests: number): readonly RoomSpot[] => {
  const home: RoomSpot = { x: Math.round(width / 2 - PET_WIDTH), pose: scene.current?.pose === 'sleep' ? 'sleep' : scene.look.mood === 'excited' ? 'dance' : 'idle' }
  const lamp = props.find(prop => prop.id === 'lamp')
  if (isNight(hour) && lamp !== undefined) {
    return [{ x: spotFor(lamp, width), pose: 'sleep' }]
  }
  const withGuests = Array.from({ length: Math.min(2, guests) }, (_, index): RoomSpot => ({ x: besideGuest(index, width), pose: 'wave', guest: index }))
  return [home, ...withGuests, ...props.filter(prop => ROOM_USE[prop.id] !== undefined).map(prop => ({ x: spotFor(prop, width), pose: ROOM_USE[prop.id] ?? 'idle' }))]
}

const petInRoom = (scene: Scene, spots: readonly RoomSpot[], placed: RoomProp | undefined, placedAt: number, width: number): RoomSpot => {
  const home = Math.round(width / 2 - PET_WIDTH)
  const age = scene.clock - placedAt
  if (placed !== undefined && age >= 0 && age < PLACE_SHOW) {
    return { x: lerp(home, spotFor(placed, width), age / PLACE_RUN), pose: age < PLACE_RUN ? 'run' : 'jump' }
  }
  const beat = Math.floor(scene.clock / ROOM_BEAT)
  const at = (n: number): RoomSpot => spots[mix(n) % spots.length] ?? { x: home, pose: 'idle' }
  const [before, now] = [at(beat - 1), at(beat)]
  const into = scene.clock % ROOM_BEAT
  return into < ROOM_WALK && before.x !== now.x ? { x: lerp(before.x, now.x, into / ROOM_WALK), pose: 'walk' } : now
}

const fillBand = (canvas: Canvas, id: string | undefined, fromY: number, toY: number, step: number): boolean => {
  const colors = id === undefined ? undefined : ROOM_COLORS[id]
  if (colors === undefined) {
    return false
  }
  const [base, dot] = [hex(colors.base), hex(colors.dot)]
  for (let y = fromY; y < toY; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      setPixel(canvas, x, y, (x + (Math.floor(y / step) % 2) * Math.floor(step / 2)) % step === 0 && y % step === 1 ? dot : base)
    }
  }
  return true
}

export const paintDecor = (canvas: Canvas, palette: Palette, view: DecorView): readonly RoomProp[] => {
  clear(canvas)
  const floor = canvas.height - 3
  fillBand(canvas, view.layout.wallpaper, 0, floor + 1, 6)
  if (!fillBand(canvas, view.layout.flooring, floor + 1, canvas.height, 2)) {
    const floorColor = hex('#CCBBAA')
    for (let x = 0; x < canvas.width; x += 1) {
      setPixel(canvas, x, floor + 2, floorColor)
    }
  }
  for (const [index, set] of completedSets(view.layout).entries()) {
    const bonus = SET_BONUS[set] ?? []
    const span = bonus[0]?.length ?? 1
    for (let x = 0; x < canvas.width; x += span) {
      drawGrid(canvas, bonus, x, index * 3, palette)
    }
  }
  const stickers = (view.stickers ?? []).slice(-12)
  for (const [index, sticker] of stickers.entries()) {
    drawGrid(canvas, STICKERS[sticker] ?? [], Math.round(canvas.width / 2) - 30 + index * 5, 0, palette)
  }
  const props = roomProps(view, canvas.width, floor)
  for (const prop of props) {
    drawGrid(canvas, prop.grid, prop.x, prop.y, palette, { scale: 2 })
    if (prop.id === 'lamp' && isNight(view.hour)) {
      drawGrid(canvas, LAMP_GLOW, prop.x - 1, prop.y - 4, palette)
    }
    if (prop.id === 'trophy-shelf') {
      for (let index = 0; index < Math.min(3, view.trophies ?? 0); index += 1) {
        drawGrid(canvas, TROPHY, prop.x + 2 + index * 4, prop.y + 2, palette)
      }
    }
  }
  return props
}

export const paintRoom = (scene: Scene, canvas: Canvas, view: RoomView): void => {
  const floor = canvas.height - 3
  const props = paintDecor(canvas, scene.palette, view)
  const host = view.owner === null ? scene : sceneOfLook(view.owner, scene.clock)
  const guests = view.guests.slice(0, 2)
  const act = view.acts.filter(mark => scene.clock - mark.at >= 0 && scene.clock - mark.at < ACT_SHOW).at(-1)
  const actGuest = act === undefined ? -1 : guests.findIndex(guest => guest.id === act.guest)
  const placed = view.placed === null ? undefined : props.find(prop => prop.slot === view.placed?.slot)
  const roaming = petInRoom(host, roomSpots(host, props, canvas.width, view.hour, guests.length), placed, view.placed?.at ?? 0, canvas.width)
  const pair = host.look.neck === 'friend-heart' ? guests.findIndex(guest => guest.look.neck === 'friend-heart') : -1
  const care = view.care !== null && scene.clock - view.care.at >= 0 && scene.clock - view.care.at < ACT_SHOW ? view.care : null
  const settled: RoomSpot = care !== null ? { x: roaming.x, pose: care.kind === 'eat' ? 'eat' : 'jump' } : pair >= 0 && view.placed === null ? { x: besideGuest(pair, canvas.width), pose: 'sit', guest: pair } : roaming
  const pet: RoomSpot = act === undefined ? settled : { x: actGuest < 0 ? settled.x : besideGuest(actGuest, canvas.width), pose: ACT_POSE[act.act], ...(actGuest < 0 ? {} : { guest: actGuest }) }
  for (const [index, guest] of guests.entries()) {
    const guestPose: Pose = act !== undefined && index === actGuest ? ACT_POSE[act.act] : pet.pose === 'sleep' ? 'sleep' : cycle(scene.clock + index * 4000, 6000, 2) === 0 ? 'idle' : 'sit'
    paintPet(canvas, sceneOfLook(guest.look, scene.clock), guestPose, scene.clock, guestX(index, canvas.width), floor - PET_HEIGHT * 2, 2)
  }
  paintPet(canvas, host, pet.pose, scene.clock, pet.x, floor - PET_HEIGHT * 2, 2)
  if (view.owner === null) {
    const critterX = pet.x + PET_WIDTH * 2 + 4 + 16 <= canvas.width ? pet.x + PET_WIDTH * 2 + 4 : pet.x - 18
    paintCritter(canvas, scene, pet.pose === 'sleep' ? 'sleep' : 'sit', critterX, floor + 2, -1, false, 2)
  }
  if (care !== null) {
    drawGrid(canvas, care.kind === 'eat' ? COOKIE : NOTE, pet.x + PET_WIDTH - 2, 2 + cycle(scene.clock - care.at, 300, 3), scene.palette, { scale: 2 })
  } else if (act !== undefined) {
    const at = actGuest < 0 ? pet.x + PET_WIDTH : Math.round((pet.x + guestX(actGuest, canvas.width)) / 2 + PET_WIDTH)
    drawGrid(canvas, ACT_EFFECT[act.act], at - 1, 2 + cycle(scene.clock - act.at, 300, 3), scene.palette, { scale: 2 })
  } else if (pet.guest !== undefined && cycle(scene.clock, 600, 2) === 0) {
    drawGrid(canvas, HEART, guestX(pet.guest, canvas.width) + PET_WIDTH - 3, 1, scene.palette, { scale: 2 })
  }
  const age = scene.clock - (view.placed?.at ?? 0)
  if (placed !== undefined && age >= 0 && age < PLACE_SHOW) {
    const sparks = [
      [placed.x - 4, placed.y - 2],
      [placed.x + placed.width + 1, placed.y],
      [placed.x + Math.round(placed.width / 2), placed.y - 5],
    ] as const
    const lit = sparks[cycle(age, 150, sparks.length)]
    if (lit !== undefined) {
      drawGrid(canvas, SPARKLE, lit[0], lit[1], scene.palette)
    }
  }
}
