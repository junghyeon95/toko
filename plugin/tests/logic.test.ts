import { expect, test } from 'claude-code/testing'

import { DAILY_TOKEN_CAP, GACHA, SHOP, balanceOf, buy, capTokenIncome, emptyEarn, gachaPool, pullGacha, turnIncome, wear, wornOf } from '../hooks/lib/economy'
import { BUBBLES_PER_HOUR, canSpeak, emptyBudget, gateCandidates, learnAnswer, recordBubble } from '../hooks/lib/gate'
import { failureStreak, readGitEvents, readTestOutcome } from '../hooks/lib/perceive'
import { MAX_LINE, OFFER_FALLBACK, REACTION_FALLBACK, SPECIES_VOICE, bonkMessage, fallbackLine, parseIntent, parseSoul, sanitizeLine, soulPrompt, soulSystem, voiceLine } from '../hooks/lib/persona'
import { freshSignal, lastAiTitle, signalLabel, signalParts, transcriptExcerpt } from '../hooks/lib/peers'
import { SPECIES, SPECIES_IDS, clampName, createFallbackSoul, nextStage, rollSpecies } from '../hooks/lib/pet'
import { lookSprite, parseSnapshot, plazaEndpoint, spriteOf, wearOf } from '../hooks/lib/plaza'
import type { Canvas } from '../hooks/lib/raster'
import { createRandom } from '../hooks/lib/random'
import { DEFAULT, createCanvas, decodeGlyphs, encodeCells, setPixel, toBase64 } from '../hooks/lib/raster'
import type { Look, Step } from '../hooks/lib/scene'
import { BAND_ROWS, addVisitor, createScene, paint, paintRoom, tick } from '../hooks/lib/scene'
import { mergeShared } from '../hooks/lib/shared'
import { hex } from '../hooks/lib/sprites'
import { candidatesOf, decayNeeds, encounterOf, fullNeeds, moodOf } from '../hooks/lib/sim'
import { SPECIES_ART } from '../hooks/lib/sprites'

const usage = (output: number, cacheRead = 0) => ({ input_tokens: 1000, output_tokens: output, cache_read_input_tokens: cacheRead, cache_creation_input_tokens: 0 })

const SETTINGS = { isMuted: false, isHidden: false, quiet: null, breakMinutes: 50, offWorkHour: null, isAiOn: true, isNotifyOn: false, isMoodSensing: false, isPlazaOn: true, isPeersOn: true, isMeterOn: true } as const

test('turn income grows on a log scale, so heavy token use pays less per token', async () => {
  expect(turnIncome(usage(0))).toBe(0)
  expect(turnIncome(usage(500))).toBe(9)
  expect(turnIncome(usage(1500))).toBe(18)
  expect(turnIncome(usage(7500))).toBe(36)
  const perTokenSmall = turnIncome(usage(500)) / 500
  const perTokenLarge = turnIncome(usage(50_000)) / 50_000
  expect(perTokenLarge < perTokenSmall / 10).toBe(true)
})

test('a cache-heavy turn earns the efficiency bonus', async () => {
  expect(turnIncome(usage(1500, 9000))).toBe(Math.round(9 * Math.log2(4) * 1.2))
})

test('a shared value keeps what this terminal changed and takes what another terminal changed', async () => {
  const base = { isHidden: false, isMuted: false, breakMinutes: 50 }
  expect(mergeShared(base, { ...base, isMuted: true }, { ...base, isHidden: true })).toEqual({ isHidden: true, isMuted: true, breakMinutes: 50 })
  expect(Object.keys(mergeShared(base, { ...base, isMuted: true }, { isHidden: true }))).toEqual(['isHidden', 'isMuted'])
  const pet = { soul: { name: '곰도리' }, growth: { stage: 'baby', breaksAccepted: 1 } }
  const renamedThere = { ...pet, soul: { name: '토뀌' } }
  const restedHere = { ...pet, growth: { stage: 'baby', breaksAccepted: 2 } }
  expect(mergeShared(pet, restedHere, renamedThere)).toEqual({ soul: { name: '토뀌' }, growth: { stage: 'baby', breaksAccepted: 2 } })
  expect(mergeShared(pet, pet, renamedThere)).toEqual(renamedThere)
  expect(mergeShared(null, restedHere, null)).toEqual(restedHere)
})

test('a need another terminal refilled adds to this terminal’s own drop, and a need this terminal left alone follows the other terminal', async () => {
  const was = { energy: 60, fun: 50, hunger: 40, social: 70, updatedAt: 0 }
  const here = { energy: 59, fun: 49, hunger: 39, social: 70, updatedAt: 10 }
  const there = { energy: 58, fun: 50, hunger: 65, social: 69, updatedAt: 9 }
  expect(mergeShared(was, here, there, [], ['energy', 'fun', 'hunger', 'social'])).toEqual({ energy: 59, fun: 49, hunger: 64, social: 69, updatedAt: 10 })
})

test('coins and items two terminals add at the same time both count', async () => {
  const base = { coins: 100, items: ['cookie'], worn: [] as string[] }
  const here = { coins: 130, items: ['cookie', 'cookie'], worn: [] }
  const there = { coins: 150, items: ['cookie', 'ribbon'], worn: ['ribbon'] }
  const merged = mergeShared(base, here, there, ['coins'])
  expect(merged.coins).toBe(180)
  expect([...merged.items].sort()).toEqual(['cookie', 'cookie', 'ribbon'])
  expect(merged.worn).toEqual(['ribbon'])
  const ate = { coins: 100, items: [], worn: [] }
  expect(mergeShared(base, ate, there, ['coins']).items).toEqual(['ribbon'])
})

test('token income stops at the daily cap, health rewards do not', async () => {
  expect(DAILY_TOKEN_CAP).toBe(500)
  expect(capTokenIncome(10, DAILY_TOKEN_CAP - 4)).toBe(4)
  expect(capTokenIncome(10, DAILY_TOKEN_CAP)).toBe(0)
  const wallet = { coins: 10, items: [], worn: [] }
  expect(balanceOf(wallet, [{ ...emptyEarn('d'), earned: 120, health: 35, spent: 5 }])).toBe(160)
})

test('the shop sells room things once, leaves fashion to the gacha and swaps worn hats', async () => {
  const wallet = { coins: 0, items: [] as string[], worn: [] as string[] }
  expect(buy(wallet, 999, 'beanie')).toEqual({ reason: '패션 아이템은 뽑기로만 나와' })
  expect('reason' in buy(wallet, 10, 'lamp')).toBe(true)
  const bought = buy(wallet, 100, 'lamp')
  if ('reason' in bought) {
    throw new Error(bought.reason)
  }
  expect(bought.spent).toBe(90)
  expect('reason' in buy(bought.wallet, 100, 'lamp')).toBe(true)
  const withHats = { ...wallet, items: ['beanie', 'crown'] }
  expect(wear(wear(withHats, 'beanie'), 'crown').worn).toEqual(['crown'])
})

test('the shop sells pets, and only one comes along at a time', async () => {
  expect(SHOP.filter(item => item.kind === 'pet').map(item => item.id)).toEqual(['chick', 'hamster', 'kitten', 'baby-bunny', 'puppy'])
  const wallet = { coins: 0, items: ['beanie', 'chick', 'kitten'], worn: ['beanie'] }
  const swapped = wear(wear(wallet, 'chick'), 'kitten')
  expect(swapped.worn).toEqual(['beanie', 'kitten'])
  expect(wornOf(swapped, 'pet')).toBe('kitten')
})

test('each gacha costs 50 coins, gives only what is not owned yet and puts it on', async () => {
  expect([GACHA.fashion.price, GACHA.pet.price]).toEqual([50, 50])
  const wallet = { coins: 0, items: ['beanie'], worn: ['beanie'] }
  expect(gachaPool(wallet, 'fashion').map(item => item.kind).every(kind => kind === 'hat' || kind === 'neck' || kind === 'face')).toBe(true)
  expect(gachaPool(wallet, 'fashion').some(item => item.id === 'beanie')).toBe(false)
  expect(pullGacha(wallet, 49, 'pet', 0)).toEqual({ reason: '코인이 1개 모자라' })
  const pulled = pullGacha(wallet, 50, 'fashion', 0.99)
  if ('reason' in pulled) {
    throw new Error(pulled.reason)
  }
  expect([pulled.spent, pulled.wallet.items.includes(pulled.item.id), wornOf(pulled.wallet, pulled.item.kind)]).toEqual([50, true, pulled.item.id])
  const everything = { coins: 0, items: SHOP.map(item => item.id), worn: [] }
  expect(pullGacha(everything, 999, 'pet', 0.5)).toEqual({ reason: '다 모았어! 더 나올 게 없어' })
})

const LOOK: Look = { bones: { seed: 7, species: 'cat' }, stage: 'baby', mood: 'calm', hammer: 'toy' }
const CHICK = hex('#FFEE88')
const EYE = hex('#221122')
const FRAME = hex('#334499')
const CROWN = hex('#FFDD44')

test('glasses sit over both eyes with a bridge between them', async () => {
  const still: Step[] = [{ pose: 'sit', ms: 60_000 }]
  expect(colorsIn(run(LOOK, still, 500).canvas, 0, 100).has(FRAME)).toBe(false)
  for (const face of ['round-glasses', 'sunglasses']) {
    const { scene, canvas } = run({ ...LOOK, face }, still, 500)
    const x = Math.round(scene.x)
    expect([face, colorsIn(canvas, x + 2, x + 6).has(FRAME), colorsIn(canvas, x + 6, x + 10).has(FRAME), colorsIn(canvas, x + 10, x + 14).has(FRAME)]).toEqual([face, true, true, true])
  }
})

test('a visiting friend keeps only the things toko knows how to draw, and shows them', async () => {
  expect(wearOf({ hat: 'crown', neck: 'cape', face: 'sunglasses', ring: 'gold' })).toEqual({ hat: 'crown', face: 'sunglasses' })
  expect(wearOf('crown')).toEqual({})
  const scene = createScene(100, LOOK, () => [{ pose: 'sit', ms: 60_000 }])
  addVisitor(scene, 'f1', 'fox', 30_000, 5000, 'wave', { hat: 'crown' })
  for (let at = 0; at < 6000; at += 100) {
    tick(scene, 100, () => 0.5)
  }
  const canvas = createCanvas(100, BAND_ROWS)
  paint(scene, canvas)
  const visitor = scene.visitors[0]
  expect(visitor?.pauseAt !== null && Math.abs((visitor?.x ?? 0) - (visitor?.pauseAt ?? 0)) < 1).toBe(true)
  const at = Math.round(visitor?.x ?? 0)
  expect(colorsIn(canvas, at, at + 16).has(CROWN)).toBe(true)
  expect(colorsIn(canvas, Math.round(scene.x), Math.round(scene.x) + 16).has(CROWN)).toBe(false)
})

const colorsIn = (canvas: Canvas, fromX: number, toX: number): Set<number> => {
  const colors = new Set<number>()
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = Math.max(0, fromX); x < Math.min(canvas.width, toX); x += 1) {
      colors.add(canvas.pixels[y * canvas.width + x] ?? 0)
    }
  }
  return colors
}

const run = (look: Look, plan: readonly Step[], ms: number) => {
  const scene = createScene(100, look, () => [...plan])
  for (let at = 0; at < ms; at += 100) {
    tick(scene, 100, () => 0.5)
  }
  const canvas = createCanvas(100, BAND_ROWS)
  paint(scene, canvas)
  return { scene, canvas }
}

test('a pet from the shop trails behind toko on the ground, and naps when toko naps', async () => {
  const plan: Step[] = [{ pose: 'walk', ms: 0, toX: 70 }, { pose: 'sleep', ms: 60_000 }]
  expect(colorsIn(run(LOOK, plan, 2000).canvas, 0, 100).has(CHICK)).toBe(false)
  const walking = run({ ...LOOK, critter: 'chick' }, plan, 2000)
  const behind = Math.round(walking.scene.x)
  expect(colorsIn(walking.canvas, behind - 12, behind).has(CHICK)).toBe(true)
  expect(colorsIn(walking.canvas, behind - 12, behind).has(EYE)).toBe(true)
  expect(colorsIn(walking.canvas, behind + 16, 100).has(CHICK)).toBe(false)
  const napping = run({ ...LOOK, critter: 'chick' }, plan, 10_000)
  expect(napping.scene.current?.pose).toBe('sleep')
  expect(colorsIn(napping.canvas, 70 - 12, 70).has(CHICK)).toBe(true)
  expect(colorsIn(napping.canvas, 70 - 12, 70).has(EYE)).toBe(false)
})

test('the room shows the pet beside toko', async () => {
  const scene = createScene(100, { ...LOOK, critter: 'chick' }, () => [{ pose: 'idle', ms: 1000 }])
  const canvas = createCanvas(100, 18)
  paintRoom(scene, canvas, [])
  expect(colorsIn(canvas, 50 + 16, 100).has(CHICK)).toBe(true)
})

test('the gate holds its tongue while Claude works, while typing, and past the hourly cap', async () => {
  const presence = { now: 100_000, isTurnRunning: false, lastTypingAt: 0, lastInputAt: 0, lastTurnEndAt: 99_000 }
  expect(canSpeak(presence, SETTINGS, 14)).toBe(true)
  expect(canSpeak({ ...presence, isTurnRunning: true }, SETTINGS, 14)).toBe(false)
  expect(canSpeak({ ...presence, lastTypingAt: 95_000 }, SETTINGS, 14)).toBe(false)
  expect(canSpeak(presence, { ...SETTINGS, quiet: [22, 9] }, 23)).toBe(false)
  expect(canSpeak(presence, { ...SETTINGS, isMuted: true }, 14)).toBe(false)
  const busy = Array.from({ length: BUBBLES_PER_HOUR }, (_, index) => index * 1000).reduce((budget, at) => recordBubble(budget, at), emptyBudget('d'))
  const candidates = [{ kind: 'chat' as const, score: 20, description: '' }]
  expect(gateCandidates(candidates, busy, SETTINGS, 10_000)).toEqual([])
  expect(gateCandidates(candidates, emptyBudget('d'), SETTINGS, 10_000).length).toBe(1)
})

test('two declines in a row halve how often that kind comes back', async () => {
  const memory = { events: [], lessons: [], answersByHour: [], declineStreak: {}, kindScale: {}, reflectedDay: '' }
  const once = learnAnswer(memory, 'stretch', 'later', 15)
  expect(once.kindScale.stretch ?? 1).toBe(1)
  const twice = learnAnswer(once, 'stretch', 'later', 15)
  expect(twice.kindScale.stretch).toBe(0.5)
  expect(twice.answersByHour[15]?.declined).toBe(2)
  expect(learnAnswer(twice, 'stretch', 'ignored', 15)).toBe(twice)
})

test('three failures of the same test put "unstick" on the table', async () => {
  const context = {
    now: 0,
    hour: 14,
    needs: fullNeeds(0),
    traits: { energetic: 0.5, chatty: 0.5, worried: 0.5, playful: 0.5 },
    breakMinutes: 50,
    workingMinutes: 10,
    minutesSinceEyeRest: 5,
    minutesSinceWater: 5,
    minutesSinceChat: 5,
    waterToday: 0,
    giftsToday: 0,
    giftQuota: 1,
    failStreak: 3,
    minutesSincePassAfterFail: null,
    bonksToday: 0,
    hasCalmedToday: false,
    awayMinutes: 0,
    hasWorkMemory: true,
    offWorkHour: null,
    hasWrappedToday: false,
    rateLimitPercent: 0,
    friendsOnline: 0,
    kindScale: {},
    luck: 0.9,
  }
  expect(candidatesOf(context)[0]?.kind).toBe('unstick')
  expect(candidatesOf({ ...context, failStreak: 0 }).length).toBe(0)
  expect(candidatesOf({ ...context, failStreak: 0, workingMinutes: 70 }).map(candidate => candidate.kind)).toContain('stretch')
})

test('needs drop only while the person is at the desk, and mood follows', async () => {
  const needs = fullNeeds(0)
  expect(decayNeeds(needs, 10 * 60_000, false).energy).toBe(needs.energy)
  expect(decayNeeds(needs, 10 * 60_000, true).energy < needs.energy).toBe(true)
  expect(moodOf(needs, [{ at: 0, kind: 'test-pass', detail: '', weight: 1 }], 1000, 14, 0)).toBe('excited')
  expect(moodOf(needs, [], 1000, 14, 3)).toBe('worried')
  expect(moodOf({ ...needs, energy: 10 }, [], 1000, 14, 0)).toBe('sleepy')
})

test('needs keep dropping when the pet checks on them every two seconds', async () => {
  let needs = fullNeeds(0)
  for (let at = 2000; at <= 5 * 60_000; at += 2000) {
    needs = decayNeeds(needs, at, true)
  }
  expect(Math.abs(needs.hunger - 68.25) < 0.01).toBe(true)
  expect(Math.abs(needs.energy - 78.75) < 0.01).toBe(true)
})

test('random encounters wait six minutes and change with the hour', async () => {
  expect(encounterOf({ hour: 14, mood: 'calm', isWorking: true, minutesSinceEncounter: 2, luck: 0 })).toEqual([])
  const day = encounterOf({ hour: 14, mood: 'calm', isWorking: true, minutesSinceEncounter: 10, luck: 0 }).map(entry => entry.item)
  const night = encounterOf({ hour: 22, mood: 'calm', isWorking: true, minutesSinceEncounter: 10, luck: 0 }).map(entry => entry.item)
  expect(day).toContain('butterfly')
  expect(day).not.toContain('firefly')
  expect(night).toContain('shooting-star')
  expect(night).not.toContain('butterfly')
})

test('the perceiver reads tests and git from shell results', async () => {
  expect(readTestOutcome('npm test', true, 'FAIL src/a.test.ts\n  ✕ adds')?.kind).toBe('test-fail')
  expect(readTestOutcome('cd app && pnpm run test -- -u', false, '')?.kind).toBe('test-pass')
  expect(readTestOutcome('ls -la', true, '')).toBe(null)
  expect(readGitEvents({ commit: { sha: 'abcdef123', kind: 'committed', branch: 'main' }, push: { branch: 'main' } }).map(event => event.kind)).toEqual(['commit', 'push'])
  const events = [
    { kind: 'test-fail', detail: 'npm test :: x' },
    { kind: 'test-pass', detail: 'npm test' },
    { kind: 'test-fail', detail: 'npm test :: y' },
    { kind: 'test-fail', detail: 'npm test :: z' },
  ]
  expect(failureStreak(events, 'npm test')).toBe(2)
})

const GHOST: Look = { ...LOOK, bones: { seed: 7, species: 'ghost' } }
const GLOW = hex('#FFC4DD')
const GHOST_MOUTH = hex('#3D2B5E')
const STAY: Step[] = [{ pose: 'idle', ms: 60_000 }]

test('a ghost toko glows pink around its body, and no other species does', async () => {
  const ghost = run(GHOST, STAY, 500)
  const x = Math.round(ghost.scene.x)
  expect(colorsIn(ghost.canvas, x - 1, x).has(GLOW)).toBe(true)
  expect(colorsIn(ghost.canvas, x + 16, x + 17).has(GLOW)).toBe(true)
  expect(colorsIn(run(LOOK, STAY, 500).canvas, 0, 100).has(GLOW)).toBe(false)
})

test('a calm ghost smiles with a small v instead of a flat line', async () => {
  const { canvas } = run(GHOST, STAY, 500)
  const mouth: [number, number][] = []
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (canvas.pixels[y * canvas.width + x] === GHOST_MOUTH) {
        mouth.push([x, y])
      }
    }
  }
  const [left, top] = [Math.min(...mouth.map(([x]) => x)), Math.min(...mouth.map(([, y]) => y))]
  expect(mouth.map(([x, y]) => [x - left, y - top])).toEqual([
    [0, 0],
    [2, 0],
    [1, 1],
  ])
})

test('a draw lands on a known species, rare about one time in ten', async () => {
  const random = createRandom(42)
  const rolls = Array.from({ length: 4000 }, () => rollSpecies(random))
  expect(rolls.every(species => SPECIES_IDS.includes(species))).toBe(true)
  const rare = rolls.filter(species => SPECIES[species].rarity === 'rare').length / rolls.length
  expect(rare > 0.08 && rare < 0.12).toBe(true)
  expect(SPECIES_IDS.filter(species => SPECIES[species].rarity === 'rare').every(species => rolls.includes(species))).toBe(true)
  expect(clampName('  말랑이는 귀여워 ')).toBe('말랑이는')
  expect(nextStage({ stage: 'baby', daysTogether: 3, breaksAccepted: 3, lastDay: '' })).toBe('child')
  expect(nextStage({ stage: 'baby', daysTogether: 30, breaksAccepted: 0, lastDay: '' })).toBe('baby')
})

test('model replies are parsed defensively', async () => {
  const fallback = createFallbackSoul(7, 'now')
  const soul = parseSoul('여기요 {"name":"콩떡","personality":"느긋해","quirk":"\\"음…\\"","traits":{"energetic":2,"chatty":0.3}}', fallback, clampName)
  expect(soul?.name).toBe('콩떡')
  expect(soul?.traits.energetic).toBe(1)
  expect(parseSoul('nope', fallback, clampName)).toBe(null)
  const candidates = [{ kind: 'stretch' as const, score: 10, description: '' }]
  expect(parseIntent('{"intent":"stretch","line":"쭉 펴자"}', candidates)?.intent).toBe('stretch')
  expect(parseIntent('{"intent":"launch-rockets","line":"가자"}', candidates)?.intent).toBe('stay_quiet')
  expect(parseIntent('잘 모르겠어요', candidates)).toBe(null)
  expect(sanitizeLine('바보야 쉬어')).toBe(null)
  expect(bonkMessage('말랑', '테스트 지우지 말랬잖아')).toContain('mcp__toko__apologize')
  expect(bonkMessage('몽떡', '').split('\n')[0]).toBe('몽떡이가 뿅망치로 너를 콩 때렸어. 이유: 그냥 기분이 그랬어')
  expect(bonkMessage('풍풍이', '')).toContain('풍풍이한테 사과해 줘')
})

test('every species speaks fallback lines in its own voice, within the line rules', async () => {
  const keys = [...Object.keys(OFFER_FALLBACK).map(key => ({ table: OFFER_FALLBACK, key })), ...Object.keys(REACTION_FALLBACK).map(key => ({ table: REACTION_FALLBACK, key }))]
  for (const species of SPECIES_IDS) {
    const random = createRandom(3)
    const lines = keys.flatMap(({ table, key }) => [fallbackLine(random, table, key, species), fallbackLine(random, table, key, species)])
    expect([species, lines.filter(line => sanitizeLine(line) !== line || [...line].length > MAX_LINE)]).toEqual([species, []])
    expect([species, fallbackLine(createRandom(1), REACTION_FALLBACK, 'hello', species).includes(SPECIES_VOICE[species].sound)]).toEqual([species, true])
  }
})

test('species voices change the ending, lead in or trail off without breaking the sentence', async () => {
  expect(voiceLine('cat', '물 한 모금 어때?')).toBe('물 한 모금 어때냥?')
  expect(voiceLine('cat', '한 걸음 저장 완료')).toBe('한 걸음 저장 완료 냥')
  expect(voiceLine('robot', '끝났어!')).toBe('삐빅. 끝났어!')
  expect(voiceLine('frog', '끝났어!')).toBe('끝났어! 개굴')
  expect(voiceLine('bear', '음… 어디가 걸렸을까')).toBe('음… 어디가 걸렸을까')
  expect(SPECIES_VOICE.robot.lines.water).toContain(fallbackLine(createRandom(1), OFFER_FALLBACK, 'water', 'robot'))
  expect(REACTION_FALLBACK.bonkHit).toContain(fallbackLine(createRandom(1), REACTION_FALLBACK, 'bonkHit', 'chick'))
})

test('the soul prompt and every model call carry the species persona', async () => {
  const prompt = soulPrompt({ seed: 7, species: 'fox' })
  expect(prompt).toContain(SPECIES_VOICE.fox.persona)
  expect(prompt).toContain(SPECIES_VOICE.fox.style)
  const system = soulSystem(createFallbackSoul(7, 'now'), 'ghost')
  expect(system).toContain('유령')
  expect(system).toContain(SPECIES_VOICE.ghost.style)
  expect(system).toContain(createFallbackSoul(7, 'now').name)
})

test('cells encode half blocks: a bottom pixel draws the lower block, transparent is the terminal default', async () => {
  const canvas = createCanvas(3, 1)
  setPixel(canvas, 0, 0, 0xff0000)
  setPixel(canvas, 1, 1, 0x00ff00)
  setPixel(canvas, 2, 0, 0x0000ff)
  setPixel(canvas, 2, 1, 0xffffff)
  const cells = encodeCells(canvas)
  expect(cells.length).toBe(Math.ceil((3 * 12) / 3) * 4)
  expect(decodeGlyphs(cells, 3)).toEqual(['▀▄▄'])
  const words = Uint32Array.of(0x2580, 0xff0000, DEFAULT, 0x2584, 0x00ff00, DEFAULT, 0x2584, 0xffffff, 0x0000ff)
  expect(cells).toBe(toBase64(new Uint8Array(words.buffer)))
  expect(toBase64(Uint8Array.of(1, 2, 3, 4))).toBe('AQIDBA==')
})

test('every species body fits the 16 by 14 pet frame', async () => {
  for (const species of SPECIES_IDS) {
    const body = SPECIES_ART[species].body
    expect([species, body.length]).toEqual([species, 14])
    expect(body.filter(row => row.length !== 16)).toEqual([])
  }
})

test('plaza snapshots drop my own echo and anything malformed', async () => {
  const body = JSON.stringify({
    now: 5,
    friends: [
      { id: 'me', name: '나', color: 'mint', mood: 'calm', status: 'idle', lastSeen: 1 },
      { id: 'f1', name: '콩떡', color: 'peach', species: 'fox', mood: 'excited', status: 'working', lastSeen: 1 },
      { id: 'f3', name: '옛친구', color: 'mint', species: 'kraken', mood: 'calm', status: 'idle', lastSeen: 1 },
      { id: 'f2', name: '이상해', color: 'rainbow' },
    ],
    events: [{ id: 'e1', at: 1, kind: 'wave', from: { id: 'f1', name: '콩떡', color: 'peach' }, to: 'me', line: '안녕!' }],
  })
  const snapshot = parseSnapshot(body, 'me')
  expect(snapshot?.friends.map(friend => [friend.id, friend.species])).toEqual([
    ['f1', 'fox'],
    ['f3', 'cat'],
  ])
  expect(snapshot?.events[0]?.from.species).toBe('cat')
  expect(snapshot?.events[0]?.line).toBe('안녕!')
  expect(parseSnapshot('not json', 'me')).toBe(null)
  expect(plazaEndpoint('https://plaza.example/', '/v1/poll')).toBe('https://plaza.example/v1/poll')
  expect(plazaEndpoint('javascript:alert(1)', '/v1/poll')).toBe(null)
})

test('the plaza gets the pet’s own picture, one palette key per pixel', async () => {
  const canvas = createCanvas(2, 1)
  setPixel(canvas, 1, 1, hex('#FFDD99'))
  expect(spriteOf(canvas)).toEqual({ palette: ['ffdd99'], rows: ['..', '.0'] })
  const look: Look = { ...LOOK, bones: { seed: 7, species: 'fox' }, stage: 'adult', hat: 'crown' }
  const sprite = lookSprite(look)
  expect(sprite?.rows.length).toBe(BAND_ROWS * 2 + 2)
  expect(sprite?.rows.filter(row => !/^[.0-9a-z]{20}$/.test(row))).toEqual([])
  expect(sprite?.palette).toContain(hex(SPECIES_ART.fox.colors.b).toString(16).padStart(6, '0'))
  expect(sprite?.palette).toContain(hex('#FFDD44').toString(16).padStart(6, '0'))
  expect(lookSprite(look)).toBe(sprite)
  expect(lookSprite({ ...look, mood: 'sleepy' })).not.toEqual(sprite)
})

test('the freshest signal of another session is picked, own and seen ones are not', async () => {
  const done = { kind: 'done', at: 300, label: '배포' }
  const entries = [
    { key: 'toko:signal:me', value: { kind: 'done', at: 900, label: '나' } },
    { key: 'toko:signal:a', value: { kind: 'waiting', at: 100, label: '오래됨' } },
    { key: 'toko:signal:b', value: done },
    { key: 'toko:signal:c', value: { kind: 'done', at: 200, label: '덜 최근' } },
    { key: 'toko:signal:d', value: { kind: 'sleeping', at: 950, label: '모름' } },
  ]
  expect(freshSignal(entries, 'toko:signal:me', 150)).toEqual(done)
  expect(freshSignal(entries, 'toko:signal:me', 300)).toBe(null)
})

test('a signal names its session in the accent color, a wait in the warning color, and speaks in the species voice', async () => {
  expect(signalLabel('  배포   확인\n해 줘, 그리고 로그도 같이 한 번 봐 줘  ')).toBe('배포 확인 해 줘, 그리고 로그도 같이 한')
  expect(signalParts({ kind: 'done', at: 0, label: '배포 확인' }, 'cat')).toEqual([{ text: '「' }, { text: '배포 확인', color: 'suggestion' }, { text: '」 ' }, { text: '끝났어냥' }])
  expect(signalParts({ kind: 'waiting', at: 0, label: '' }, 'cat')).toEqual([{ text: '다른 세션이 ' }, { text: '확인을 기다려냥', color: 'warning' }])
  expect(signalParts({ kind: 'done', at: 0, label: '배포 확인' }, 'bear')).toEqual([{ text: '음… ' }, { text: '「' }, { text: '배포 확인', color: 'suggestion' }, { text: '」 ' }, { text: '끝났어' }])
})

test('the latest AI title in the transcript lines names the session', async () => {
  const lines = ['{"type":"ai-title","aiTitle":"옛 제목","sessionId":"s"}', '{"type":"ai-title","aiTitle":"toko 세션 완료 알림 기능","sessionId":"s"}', '{"type":"ai-title"', ''].join('\n')
  expect(lastAiTitle(lines)).toBe('toko 세션 완료 알림 기능')
  expect(lastAiTitle('')).toBe('')
})

test('a transcript excerpt keeps the last four typed prompts and the last answer, and skips meta and command lines', async () => {
  const user = (content: string, extra = '') => `{"type":"user"${extra},"message":{"role":"user","content":${JSON.stringify(content)}}}`
  const lines = [
    '잘린 줄"}',
    user('하나'),
    user('둘'),
    user('<command-name>/clear</command-name>'),
    user('셋'),
    user('숨김', ',"isMeta":true'),
    user('넷'),
    user('다섯'),
    '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"처음 답"}]}}',
    '{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","name":"Bash"},{"type":"text","text":"마지막 답"}]}}',
  ]
  expect(transcriptExcerpt(lines.join('\n'))).toBe(['[사용자 질문]', '- 둘', '- 셋', '- 넷', '- 다섯', '[Claude 마지막 답]', '마지막 답'].join('\n'))
  expect(transcriptExcerpt('{"type":"summary"}\n')).toBe('')
})
