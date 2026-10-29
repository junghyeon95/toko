import type { TokoFriend, TokoMood, TokoSpecies, TokoVisitor } from '../../types'

import { BONK_KINDS } from './bonks'
import { SPECIES, isSpecies } from './pet'
import type { Canvas } from './raster'
import { DEFAULT } from './raster'
import type { Look, Wear } from './scene'
import { portraitOf } from './scene'
import { GLASSES, HATS, NECKS } from './sprites'

export const PLAZA_POLL_MS = 20_000
export const STREAM_STEADY_MS = 30_000
export const STREAM_RETRY_MAX_MS = 60_000
export const FRIEND_TTL_MS = 90_000

export type PlazaStatus = 'working' | 'resting' | 'idle' | 'away'

export type PlazaAction = 'wave' | 'heart' | 'snack' | 'stretch-call' | 'cheer'

export const PLAZA_ACTIONS: readonly PlazaAction[] = ['wave', 'heart', 'snack', 'stretch-call', 'cheer']

export const ACTION_LABEL: Readonly<Record<PlazaAction, string>> = {
  wave: '손 흔들기',
  heart: '하트',
  snack: '간식 나눠 주기',
  'stretch-call': '다 같이 기지개',
  cheer: '응원',
}

type WireColor = 'honey' | 'mint' | 'peach' | 'lavender'

const WIRE_COLOR: Readonly<Record<TokoSpecies, WireColor>> = {
  cat: 'honey',
  bear: 'peach',
  chick: 'honey',
  bunny: 'lavender',
  frog: 'mint',
  penguin: 'lavender',
  fox: 'peach',
  dragon: 'mint',
  unicorn: 'lavender',
  ghost: 'lavender',
  phoenix: 'peach',
  robot: 'mint',
  axolotl: 'peach',
}

export const wireColor = (species: TokoSpecies): WireColor => WIRE_COLOR[species]

type PlazaSprite = { palette: readonly string[]; rows: readonly string[] }

const SPRITE_KEYS = '0123456789abcdefghijklmnopqrstuvwxyz'

export const spriteOf = (canvas: Canvas): PlazaSprite | null => {
  const palette: string[] = []
  const keyOf = (color: number): string => {
    if (color === DEFAULT) {
      return '.'
    }
    const value = color.toString(16).padStart(6, '0')
    const index = palette.indexOf(value)
    return SPRITE_KEYS[index < 0 ? palette.push(value) - 1 : index] ?? '.'
  }
  const rows = Array.from({ length: canvas.height }, (_, y) => Array.from(canvas.pixels.subarray(y * canvas.width, (y + 1) * canvas.width), keyOf).join(''))
  return palette.length <= SPRITE_KEYS.length ? { palette, rows } : null
}

const sprites = new Map<string, PlazaSprite | null>()

export const lookSprite = (look: Look): PlazaSprite | null => {
  const key = [look.bones.species, look.stage, look.mood, look.hat, look.neck, look.face].join(':')
  const cached = sprites.get(key)
  if (cached !== undefined) {
    return cached
  }
  const sprite = spriteOf(portraitOf(look))
  sprites.set(key, sprite)
  return sprite
}

export type PlazaEvent = {
  id: string
  at: number
  kind: PlazaAction | 'join' | 'leave'
  from: { id: string; name: string; species: TokoSpecies; wear: Wear }
  to: string | null
  line: string
}

export type PlazaBonks = { total: number; top: readonly { kind: string; count: number }[] }

export const NO_BONKS: PlazaBonks = { total: 0, top: [] }

export type PlazaSnapshot = { friends: readonly TokoFriend[]; events: readonly PlazaEvent[]; bonks: PlazaBonks; now: number }

const COLORS: ReadonlySet<string> = new Set(['honey', 'mint', 'peach', 'lavender'])
const MOODS: ReadonlySet<string> = new Set(['excited', 'calm', 'sleepy', 'worried', 'sulky'])
const KINDS: ReadonlySet<string> = new Set([...PLAZA_ACTIONS, 'join', 'leave'])

const text = (value: unknown, max: number): string => (typeof value === 'string' ? [...value.replace(/\s+/g, ' ').trim()].slice(0, max).join('') : '')

const speciesOf = (raw: Record<string, unknown>): TokoSpecies => (isSpecies(raw.species) ? raw.species : 'cat')

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null

const parseFriend = (value: unknown): TokoFriend | null => {
  const raw = asRecord(value)
  if (raw === null || typeof raw.id !== 'string' || !COLORS.has(String(raw.color))) {
    return null
  }
  return {
    id: text(raw.id, 64),
    name: text(raw.name, 12) || '친구',
    species: speciesOf(raw),
    mood: MOODS.has(String(raw.mood)) ? (raw.mood as TokoMood) : 'calm',
    status: text(raw.status, 12) || 'idle',
    lastSeen: typeof raw.lastSeen === 'number' ? raw.lastSeen : 0,
  }
}

const WEARABLE: Readonly<Record<keyof Wear, Readonly<Record<string, unknown>>>> = { hat: HATS, neck: NECKS, face: GLASSES }

export const wearOf = (value: unknown): Wear => {
  const raw = asRecord(value)
  return Object.fromEntries(
    (Object.keys(WEARABLE) as (keyof Wear)[]).map(slot => [slot, raw?.[slot]] as const).filter(([slot, id]) => typeof id === 'string' && Object.hasOwn(WEARABLE[slot], id)),
  )
}

const parseEvent = (value: unknown): PlazaEvent | null => {
  const raw = asRecord(value)
  const from = asRecord(raw?.from)
  if (raw === null || from === null || typeof raw.id !== 'string' || !KINDS.has(String(raw.kind)) || !COLORS.has(String(from.color))) {
    return null
  }
  return {
    id: text(raw.id, 64),
    at: typeof raw.at === 'number' ? raw.at : 0,
    kind: raw.kind as PlazaEvent['kind'],
    from: { id: text(from.id, 64), name: text(from.name, 12) || '친구', species: speciesOf(from), wear: wearOf(from.wear) },
    to: typeof raw.to === 'string' ? raw.to : null,
    line: text(raw.line, 80),
  }
}

const isPresent = <T>(value: T | null): value is T => value !== null

const count = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0)

const parseBonks = (value: unknown): PlazaBonks => {
  const raw = asRecord(value)
  const top = (Array.isArray(raw?.top) ? raw.top : [])
    .map(asRecord)
    .filter(isPresent)
    .filter(row => typeof row.kind === 'string' && Object.hasOwn(BONK_KINDS, row.kind) && count(row.count) > 0)
    .map(row => ({ kind: String(row.kind), count: count(row.count) }))
  return { total: count(raw?.total), top: top.slice(0, 5) }
}

export const bonkBoardText = (bonks: PlazaBonks): string | null =>
  bonks.total === 0
    ? null
    : `뿅망치 전광판: 오늘 Clawd가 ${bonks.total}번 맞았어요 · ${bonks.top
        .slice(0, 3)
        .map((row, index) => `${index + 1}위 ${BONK_KINDS[row.kind]}(${row.count}번)`)
        .join(', ')}`

export const parseSnapshot = (body: string, myId: string): PlazaSnapshot | null => {
  try {
    const raw = asRecord(JSON.parse(body))
    if (raw === null) {
      return null
    }
    const friends = (Array.isArray(raw.friends) ? raw.friends : []).map(parseFriend).filter(isPresent).filter(friend => friend.id !== myId)
    const events = (Array.isArray(raw.events) ? raw.events : []).map(parseEvent).filter(isPresent).filter(event => event.from.id !== myId)
    return { friends: friends.slice(0, 30), events: events.slice(-20), bonks: parseBonks(raw.bonks), now: typeof raw.now === 'number' ? raw.now : 0 }
  } catch {
    return null
  }
}

export const plazaEndpoint = (base: string, path: string): string | null => {
  const trimmed = base.trim().replace(/\/+$/, '')
  return /^https?:\/\/[^\s]+$/.test(trimmed) ? `${trimmed}${path}` : null
}

export const plazaStreamUrl = (base: string, id: string, tab: string): string | null => {
  const url = plazaEndpoint(base, '/v1/stream')
  return url === null ? null : `${url}?id=${encodeURIComponent(id)}&tab=${encodeURIComponent(tab)}`
}

export const splitEvents = (text: string): { data: string[]; rest: string } => {
  const blocks = text.replace(/\r\n/g, '\n').split('\n\n')
  const rest = blocks.pop() ?? ''
  const data = blocks
    .map(block => block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n'))
    .filter(payload => payload.length > 0)
  return { data, rest }
}

export const isForMe = (event: PlazaEvent, myId: string): boolean => event.to === null || event.to === myId

const VERB: Readonly<Record<PlazaEvent['kind'], string>> = {
  wave: '손을 흔들었어',
  heart: '하트를 보냈어',
  snack: '간식을 나눠 줬어',
  'stretch-call': '다 같이 기지개 켜자고 해',
  cheer: '응원을 보냈어',
  join: '광장에 왔어',
  leave: '광장을 떠났어',
}

export const eventText = (event: PlazaEvent): string => `${event.from.name}: ${event.line || VERB[event.kind]}`

export const VISITOR_SHOW_MS = 15_000
export const VISITOR_STALE_MS = 30 * 60_000

export const visitorOf = (event: PlazaEvent, at: number): TokoVisitor => ({ name: event.from.name, species: event.from.species, kind: event.kind, line: event.line, at })

export const visitorText = (visitor: TokoVisitor): string => {
  const verb = VERB[visitor.kind as PlazaEvent['kind']] ?? VERB.wave
  return `${visitor.name}(${SPECIES[visitor.species].label}) (•ᴗ•)ﾉ ${verb}${visitor.line.length > 0 ? ` — ${visitor.line}` : ''}`
}

export const shouldDismissVisitor = (visitor: TokoVisitor, visibleMs: number, now: number): boolean =>
  visibleMs >= VISITOR_SHOW_MS || now - visitor.at >= VISITOR_STALE_MS

export const findFriend = (friends: readonly TokoFriend[], query: string): TokoFriend | undefined => {
  const needle = query.trim()
  return friends.find(friend => friend.name === needle) ?? friends.find(friend => friend.name.startsWith(needle)) ?? friends.find(friend => friend.id === needle)
}
