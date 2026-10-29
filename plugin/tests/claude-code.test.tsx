import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { CHANGELOG_URL, compareVersions, freshAdditions, parseChangelog } from '../hooks/lib/news'

const PET = {
  id: 'pet-7',
  bones: { seed: 7, species: 'penguin' },
  soul: { name: '말랑', personality: '느긋하고 다정한 아이', quirk: '"말랑~"', traits: { energetic: 0.5, chatty: 0.7, worried: 0.6, playful: 0.5 }, hatchedAt: '2026-10-01T00:00:00.000Z', isFallback: false, isNamed: true },
  growth: { stage: 'baby', daysTogether: 2, breaksAccepted: 1, lastDay: '2026-10-29' },
}

const START = Date.UTC(2026, 9, 29, 5, 0, 0)

const VERSION = '2.1.304'

const BAND = {
  plugin: 'toko',
  component: 'AbovePrompt',
  requestId: 'band',
  props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 120, scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

const CHANGELOG = [
  '# Changelog',
  '',
  '## 2.1.304',
  '',
  '- Added `/auto-mode-setup`: a guided setup that reads your project and recent sessions to teach auto mode about your environment',
  '- Added `CLAUDE_CODE_AUTO_MODE_MODEL` to choose the model the auto mode classifier uses',
  '- Added the `claude_code.safety_event` OpenTelemetry event for each tool call',
  '- Fixed the spinner naming a newly picked effort level',
  '- [VSCode] Added Memory and Instructions entries to the Customize menu',
  '',
  '## 2.1.303',
  '',
  '- Added the `%` motion to vim mode: jump to the matching bracket',
  '',
  '## 2.1.302',
  '',
  '- Fixed a crash',
].join('\n')

const NEWS_REPLY = '{"pick":0,"title":"/auto-mode-setup","what":"프로젝트와 최근 세션을 읽고 auto mode가 내 환경을 알게 해 주는 안내야","when":"권한 확인이 자꾸 떠서 흐름이 끊길 때","try":"/auto-mode-setup"}'

const PICK = { version: VERSION, title: '/auto-mode-setup', what: '프로젝트를 읽고 auto mode를 가르쳐 줘', when: '', tryIt: '/auto-mode-setup', source: 'Added `/auto-mode-setup`' }

type World = { fetched: string[]; models: string[]; logs: string[]; filled: string[]; saved: Record<string, unknown> }

const engine = (on: On, store: Record<string, unknown>): World => {
  const memory = new Map(Object.entries(store))
  const world: World = { fetched: [], models: [], logs: [], filled: [], saved: {} }
  on('store.get', (_, e) => ({ value: memory.get(e.key) }))
  on('store.set', (_, e) => {
    memory.set(e.key, JSON.parse(JSON.stringify(e.value)))
    world.saved[e.key] = e.value
    return { value: undefined }
  })
  on('store.delete', (_, e) => {
    memory.delete(e.key)
    return { value: undefined }
  })
  on('store.keys', () => ({ value: [...memory.keys()] }))
  mock.env(on, { TERM: 'xterm-256color' })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: 'session-1' }))
  on('session.version', () => ({ value: { version: VERSION, base: VERSION } }))
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
  on('settings.read', () => ({ value: {} }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('tool.register', (_, e) => ({ value: { tool: `mcp__toko__${e.name}` } }))
  on('ui.blit', () => ({ value: {} }))
  on('ui.invalidate', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.log', (_, e) => {
    world.logs.push(e.text)
    return { value: undefined }
  })
  on('http.fetch', (_, e) => {
    world.fetched.push(e.url)
    return { value: { status: 200, ok: true, headers: {}, text: CHANGELOG } }
  })
  on('model.complete', (_, e) => {
    world.models.push(e.prompt)
    const text = e.prompt.includes('새로 생긴 기능 목록') ? NEWS_REPLY : '{"intent":"stay_quiet"}'
    return { value: { isAnswered: true, text, usage: { input_tokens: 10, output_tokens: 10, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } }
  })
  on('prompt.read', () => ({ value: { text: '', cursor: 0 } }) as never)
  on('prompt.fill', (_, e) => {
    world.filled.push(e.text)
    return { isFilled: true }
  })
  on('turn.start', (_, e) => ({ turnId: e.turnId ?? 't' }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('command.run', () => ({ text: '' }))
  on('tool.call', () => ({ result: {}, text: '' }) as never)
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('prompt.mention', () => ({ type: 'file' }) as never)
  return world
}

const begin = async ($: Engine) => $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })

const OFFLINE = { options: { serverUrl: '' } }

const ROOM = {
  plugin: 'toko',
  component: 'Pane',
  requestId: 'toko-room',
  props: { title: '말랑의 방', isFocused: true, bodyColumns: 100, placement: 'dock', scroll: { offset: 0, bodyRows: 80 }, view: {} },
} as const

const typed = async ($: Engine, command: string) => $.command.run({ command, args: '', origin: { kind: 'composer' } } as never)

const healthOf = (world: World) => (world.saved['toko:earn:session-1'] as { health: number } | undefined)?.health ?? 0

const end = async ($: Engine) => $.session.end({ reason: 'other', sessionId: 'session-1', resume: {} } as never)

const newsOf = (world: World) => world.saved['toko:news'] as { seen: string; shownAt: number; notBefore: number; picks: readonly { title: string }[] }

test('the changelog reader keeps the Added lines meant for everyone and looks back five releases on a first install', async () => {
  const releases = parseChangelog(CHANGELOG)
  expect(releases.map(release => release.version)).toEqual(['2.1.304', '2.1.303', '2.1.302'])
  expect(releases[0]?.added).toEqual(['Added `/auto-mode-setup`: a guided setup that reads your project and recent sessions to teach auto mode about your environment'])
  expect(freshAdditions(releases, '2.1.303', VERSION).map(addition => addition.version)).toEqual(['2.1.304'])
  expect(freshAdditions(releases, '', VERSION).map(addition => addition.version)).toEqual(['2.1.304', '2.1.303'])
  expect(freshAdditions(releases, '2.1.303', '2.1.303')).toEqual([])
  expect([compareVersions('2.1.10', '2.1.9'), compareVersions('2.1.9', '2.1.10'), compareVersions('2.1.9', '2.1.9')]).toEqual([1, -1, 0])
})

test('after a Claude Code update the pet picks one new feature, explains it in the transcript and puts its command in the prompt box', OFFLINE, async ($, on) => {
  const clock = mock.clock(on, { now: START })
  const world = engine(on, { 'toko:pet': PET, 'toko:news': { seen: '2.1.303', pick: null, shownAt: 0, notBefore: 0, picks: [] } })
  await begin($)
  await clock.advance(34_000)
  expect(world.fetched).toEqual([CHANGELOG_URL])
  const prompt = world.models.find(text => text.includes('새로 생긴 기능 목록')) ?? ''
  expect(prompt).toContain('0. [2.1.304] Added `/auto-mode-setup`')
  expect(prompt).not.toContain('CLAUDE_CODE_AUTO_MODE_MODEL')
  expect(prompt).not.toContain('vim mode')
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.find({ type: 'Text', text: /2\.1\.304에 새 기능이 생겼어: \/auto-mode-setup/ })).toBeDefined()
  await band.press({ key: 'choice-accept' })
  await band.unmount()
  expect(world.logs.slice(-5)).toEqual([
    'Claude Code 2.1.304 새 기능 · /auto-mode-setup',
    '프로젝트와 최근 세션을 읽고 auto mode가 내 환경을 알게 해 주는 안내야',
    '이럴 때: 권한 확인이 자꾸 떠서 흐름이 끊길 때',
    '해 보기: /auto-mode-setup',
    '원문: Added `/auto-mode-setup`: a guided setup that reads your project and recent sessions to teach auto mode about your environment',
  ])
  expect(world.filled).toEqual(['/auto-mode-setup'])
  expect([newsOf(world).seen, newsOf(world).shownAt > 0, newsOf(world).picks.length]).toEqual([VERSION, true, 1])
  expect((await $.command.run({ command: 'toko', args: 'news' } as never)).text).toContain('2.1.304 /auto-mode-setup: 프로젝트와 최근 세션을 읽고')
})

test('a version already introduced is not fetched again, and another terminal’s intro is not shown twice', OFFLINE, async ($, on) => {
  const clock = mock.clock(on, { now: START })
  const world = engine(on, { 'toko:pet': PET, 'toko:news': { seen: VERSION, pick: PICK, shownAt: START - 60_000, notBefore: 0, picks: [PICK] } })
  await begin($)
  await clock.advance(60_000)
  expect(world.fetched).toEqual([])
  expect(world.models.some(text => text.includes('새로 생긴 기능 목록'))).toBe(false)
  expect(world.saved['toko:news']).toBeUndefined()
})

test('with the small model off, the update is skipped without fetching the changelog', OFFLINE, async ($, on) => {
  const clock = mock.clock(on, { now: START })
  const world = engine(on, { 'toko:pet': PET, 'toko:settings': { isAiOn: false }, 'toko:news': { seen: '2.1.303', pick: null, shownAt: 0, notBefore: 0, picks: [] } })
  await begin($)
  await clock.advance(40_000)
  expect(world.fetched).toEqual([])
  expect([newsOf(world).seen, newsOf(world).picks.length]).toEqual([VERSION, 0])
})

test('later puts the intro off for thirty minutes, and a put-off intro waits until its time has come', OFFLINE, async ($, on) => {
  const clock = mock.clock(on, { now: START })
  const world = engine(on, { 'toko:pet': PET, 'toko:news': { seen: VERSION, pick: PICK, shownAt: 0, notBefore: START + 50_000, picks: [PICK] } })
  await begin($)
  await clock.advance(40_000)
  expect(world.saved['toko:news']).toBeUndefined()
  await clock.advance(15_000)
  expect(newsOf(world).shownAt).toBeGreaterThanOrEqual(START + 50_000)
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await band.press({ key: 'choice-later' })
  await band.unmount()
  expect([newsOf(world).shownAt, newsOf(world).notBefore >= START + 30 * 60_000 + 50_000]).toEqual([0, true])
  expect(world.fetched).toEqual([])
})

test('/toko event update shows an intro right away for a demo, even for a version already introduced', OFFLINE, async ($, on) => {
  const clock = mock.clock(on, { now: START })
  const world = engine(on, { 'toko:pet': PET, 'toko:news': { seen: VERSION, pick: PICK, shownAt: START - 60_000, notBefore: 0, picks: [PICK] } })
  await begin($)
  expect((await $.command.run({ command: 'toko', args: 'event update' } as never)).text).toContain('새 기능을 고르고 있어요')
  await clock.advance(200)
  expect(world.fetched).toEqual([CHANGELOG_URL])
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.find({ type: 'Text', text: /새 기능이 생겼어: \/auto-mode-setup/ })).toBeDefined()
  await band.unmount()
})

test('the first time a person runs a Claude Code command it joins the feature dex with five coins, and only once', OFFLINE, async ($, on) => {
  const clock = mock.clock(on, { now: START })
  const world = engine(on, { 'toko:pet': PET, 'toko:news': { seen: VERSION, pick: null, shownAt: 0, notBefore: 0, picks: [] } })
  await begin($)
  await typed($, 'compact')
  await clock.advance(100)
  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.find({ type: 'Text', text: /기능 도감에 새로 올렸어: \/compact 대화 줄이기 \(1\/16\) \+5 코인/ })).toBeDefined()
  await band.unmount()
  await typed($, 'compact')
  await $.command.run({ command: 'rewind', args: '', origin: { kind: 'plugin', name: 'other' } } as never)
  await typed($, 'toko')
  await clock.advance(100)
  expect(Object.keys(world.saved['toko:features'] as Record<string, number>)).toEqual(['compact'])
  const text = (await $.command.run({ command: 'toko', args: 'features' } as never)).text
  expect(text).toContain('기능 도감 1/16')
  expect(text).toContain('✓ /compact 대화 줄이기')
  expect(text).toContain('· /rewind 되감기: 코드와 대화를 아까 시점으로 되돌려요')
  await end($)
  expect(healthOf(world)).toBe(5)
})

test('plan mode, a command sent to the background, a pasted image and an @ mention fill the dex too', OFFLINE, async ($, on) => {
  const clock = mock.clock(on, { now: START })
  const world = engine(on, { 'toko:pet': PET, 'toko:news': { seen: VERSION, pick: null, shownAt: 0, notBefore: 0, picks: [] } })
  await begin($)
  await $.tool.call({ tool: 'ExitPlanMode', plan: 'do it' } as never)
  await $.tool.call({ tool: 'Bash', command: 'npm run dev', run_in_background: true } as never)
  await $.tool.call({ tool: 'Bash', command: 'ls' } as never)
  await $.prompt.submit({ text: '이 화면 봐 줘', origin: { kind: 'composer' }, attachments: [{ type: 'image', mediaType: 'image/png' }] } as never)
  await $.prompt.mention({ mention: 'src/app.ts', path: '/work/src/app.ts' } as never)
  await clock.advance(100)
  expect(Object.keys(world.saved['toko:features'] as Record<string, number>).sort()).toEqual(['background', 'image', 'mention', 'plan'])
  await $.command.run({ command: 'toko', args: '' } as never)
  const room = await $.ui.mount({ ...ROOM, surface: 'terminal' })
  expect(await room.find({ type: 'Text', text: /기능 도감 4\/16/ })).toBeDefined()
  expect(await room.find({ type: 'Text', text: /써 볼 것: \/compact 대화 줄이기/ })).toBeDefined()
  await room.unmount()
})

test('the eighth feature tried unlocks 기능 수집가', OFFLINE, async ($, on) => {
  const clock = mock.clock(on, { now: START })
  const seven = Object.fromEntries(['compact', 'clear', 'resume', 'rewind', 'init', 'memory', 'permissions'].map(id => [id, START - 1000]))
  const world = engine(on, { 'toko:pet': PET, 'toko:features': seven, 'toko:news': { seen: VERSION, pick: null, shownAt: 0, notBefore: 0, picks: [] } })
  await begin($)
  await clock.advance(2500)
  expect((world.saved['toko:badges'] as Record<string, number> | undefined)?.['features-8']).toBeUndefined()
  await typed($, 'model')
  await clock.advance(2500)
  expect((world.saved['toko:badges'] as Record<string, number>)['features-8']).toBeDefined()
  expect((await $.command.run({ command: 'toko', args: 'badges' } as never)).text).toContain('✓ 기능 수집가')
})
