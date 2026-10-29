export type Color = 'honey' | 'mint' | 'peach' | 'lavender'
export type Mood = 'excited' | 'calm' | 'sleepy' | 'worried' | 'sulky'
export type Status = 'working' | 'resting' | 'idle' | 'away'
export type Action = 'wave' | 'heart' | 'snack' | 'stretch-call' | 'cheer'

export type Sprite = { palette: readonly string[]; rows: readonly string[] }

export type Member = { id: string; tab?: string; name: string; color: Color; species?: string; mood: Mood; status: Status; lastSeen: number; sprite?: Sprite }

export type PlazaEvent = {
  id: string
  at: number
  kind: Action | 'join'
  from: { id: string; name: string; color: Color; species?: string }
  to: string | null
  line: string
}

export type Generate = (prompt: string) => Promise<string | null>

export type PlazaOptions = {
  now?: () => number
  generate?: Generate
  friendTtlMs?: number
  maxEvents?: number
  actionsPerMinute?: number
  keepAliveMs?: number
}

const COLORS: ReadonlySet<string> = new Set(['honey', 'mint', 'peach', 'lavender'])
const MOODS: ReadonlySet<string> = new Set(['excited', 'calm', 'sleepy', 'worried', 'sulky'])
const STATUSES: ReadonlySet<string> = new Set(['working', 'resting', 'idle', 'away'])
const ACTIONS: ReadonlySet<string> = new Set(['wave', 'heart', 'snack', 'stretch-call', 'cheer'])
const FORBIDDEN = /(바보|멍청|병신|시발|씨발|ㅅㅂ|개새|꺼져|닥쳐|죽어|죽여|미친|한심|쓰레기)/
const MAX_BODY = 4096
const SPRITE_KEYS = '0123456789abcdefghijklmnopqrstuvwxyz'
const MAX_SPRITE = 32

export const FALLBACK_LINES: Readonly<Record<Action, readonly string[]>> = {
  wave: ['안녕! 잠깐 숨 돌리고 가', '여기도 열심히 하는 중이야. 같이 천천히 가자'],
  heart: ['하트 하나 보낼게. 오늘도 수고 많아', '너무 무리하지 마'],
  snack: ['간식 나눠 줄게. 당 충전하고 가', '쿠키 하나 먹고 해'],
  'stretch-call': ['다 같이 기지개 켜자! 어깨 쭉', '1분만 다 같이 쉬어 가자'],
  cheer: ['응원해! 거의 다 왔어', '천천히 해도 괜찮아'],
}

const ACTION_WORDS: Readonly<Record<Action, string>> = {
  wave: '손 흔들기',
  heart: '하트',
  snack: '간식 나눠 주기',
  'stretch-call': '다 같이 기지개 켜자는 부름',
  cheer: '응원',
}

const clean = (value: unknown, max: number): string =>
  typeof value === 'string'
    ? [...value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()].slice(0, max).join('')
    : ''

export const sanitizeLine = (text: string | null): string | null => {
  if (text === null) {
    return null
  }
  const rows = text.split('\n').map(row => row.trim().replace(/^(?:[-*>]\s+|\d+\.\s+)/, ''))
  const first = rows.find(row => row.length > 0 && !row.startsWith('#')) ?? ''
  const line = clean(first.replace(/[*_`]/g, ''), 40).replace(/^["'「“]+|["'」”]+$/g, '')
  return line.length === 0 || FORBIDDEN.test(line) ? null : line
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null

export const parseSprite = (value: unknown): Sprite | null => {
  const raw = asRecord(value)
  const palette: unknown[] = Array.isArray(raw?.palette) ? raw.palette : []
  const rows: unknown[] = Array.isArray(raw?.rows) ? raw.rows : []
  const keys = SPRITE_KEYS.slice(0, palette.length)
  const isPalette = palette.length > 0 && palette.length <= SPRITE_KEYS.length && palette.every(color => typeof color === 'string' && /^[0-9a-f]{6}$/i.test(color))
  const isRows = rows.length > 0 && rows.length <= MAX_SPRITE && rows.every(row => typeof row === 'string' && row.length <= MAX_SPRITE && [...row].every(char => char === '.' || keys.includes(char)))
  return isPalette && isRows ? { palette: palette.map(color => String(color).toLowerCase()), rows: rows.map(String) } : null
}

export const parseMe = (value: unknown, now: number): Member | null => {
  const raw = asRecord(value)
  const id = clean(raw?.id, 64)
  if (raw === null || !/^[a-z0-9-]{4,64}$/i.test(id) || !COLORS.has(String(raw.color))) {
    return null
  }
  const species = clean(raw.species, 16)
  const tab = clean(raw.tab, 16)
  const sprite = parseSprite(raw.sprite)
  return {
    id,
    ...(/^[a-z0-9]{1,16}$/i.test(tab) ? { tab } : {}),
    name: clean(raw.name, 12) || '친구',
    color: raw.color as Color,
    ...(/^[a-z]{2,16}$/.test(species) ? { species } : {}),
    mood: MOODS.has(String(raw.mood)) ? (raw.mood as Mood) : 'calm',
    status: STATUSES.has(String(raw.status)) ? (raw.status as Status) : 'idle',
    lastSeen: now,
    ...(sprite === null ? {} : { sprite }),
  }
}

const friendOf = ({ sprite, ...friend }: Member): Omit<Member, 'sprite'> => friend

const TAB_TTL_MS = 45_000

type Listener = { id: string | null; send: (text: string) => void }

const sseMessage = (name: string, data: unknown): string => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`

const sameLook = (a: Member | undefined, b: Member | undefined): boolean =>
  a !== undefined && b !== undefined && JSON.stringify({ ...a, lastSeen: 0 }) === JSON.stringify({ ...b, lastSeen: 0 })

const STATUS_RANK: Readonly<Record<Status, number>> = { away: 0, idle: 1, resting: 2, working: 3 }

export const mergeTabs = ([first, ...rest]: readonly [Member, ...Member[]]): Member => {
  const lead = rest.reduce(
    (best, report) =>
      STATUS_RANK[report.status] > STATUS_RANK[best.status] || (STATUS_RANK[report.status] === STATUS_RANK[best.status] && report.lastSeen > best.lastSeen) ? report : best,
    first,
  )
  const { tab, ...member } = lead
  return { ...member, lastSeen: Math.max(first.lastSeen, ...rest.map(report => report.lastSeen)) }
}

const senderOf = (me: Member): PlazaEvent['from'] => ({ id: me.id, name: me.name, color: me.color, ...(me.species === undefined ? {} : { species: me.species }) })

export const actionPrompt = (from: Member, to: Member | null, kind: Action): string =>
  [
    `"${from.name}"(이)라는 작은 픽셀 펫이 ${to === null ? '광장의 모두' : `"${to.name}"(이)라는 다른 펫`}에게 ${ACTION_WORDS[kind]}를 건넨다.`,
    '받는 사람은 AI와 코딩하느라 지친 개발자다. 이 도구의 목적은 인지 부하를 덜고 잠깐 숨을 돌리게 하는 것이다.',
    '펫이 건넬 다정한 반말 한 줄을 30자 이내로 써. 재촉하지 말고, 이모지와 따옴표 없이 문장만.',
  ].join('\n')

export const dllmGenerator = (env: Readonly<Record<string, string | undefined>>, fetcher: typeof fetch = fetch): Generate => {
  const base = (env.TOKO_DLLM_URL ?? '').trim().replace(/\/+$/, '')
  if (base.length === 0) {
    return async () => null
  }
  const endpoint = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`
  const timeoutMs = Number(env.TOKO_DLLM_TIMEOUT_MS ?? 2500)
  return async prompt => {
    try {
      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(env.TOKO_DLLM_KEY ? { authorization: `Bearer ${env.TOKO_DLLM_KEY}` } : {}),
        },
        body: JSON.stringify({
          model: env.TOKO_DLLM_MODEL ?? 'claude-haiku-4-5',
          messages: [
            { role: 'system', content: '너는 개발자 곁에 사는 다정한 픽셀 펫이다. 한국어 반말 한 줄로만 답한다.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 60,
          temperature: 0.8,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!response.ok) {
        return null
      }
      const json = asRecord(await response.json())
      const choice = asRecord(Array.isArray(json?.choices) ? json.choices[0] : null)
      const content = asRecord(choice?.message)?.content
      return typeof content === 'string' ? content : null
    } catch {
      return null
    }
  }
}

const COLOR_HEX: Readonly<Record<Color, string>> = { honey: 'ffdd99', mint: 'aaeecc', peach: 'ffbbaa', lavender: 'ccbbee' }
const STATUS_LABEL: Readonly<Record<Status, string>> = { working: '일하는 중', resting: '쉬는 중', idle: '잠깐 멈춤', away: '자리 비움' }

const STAND_IN: readonly string[] = [
  '................',
  '....oooooooo....',
  '..oobbbbbbbboo..',
  '.obbbbbbbbbbbbo.',
  '.obbbbbbbbbbbbo.',
  'obbwebbbbbbwebbo',
  'obbeebbbbbbeebbo',
  'obpbbbbmmbbbbpbo',
  'obbbbbbbbbbbbbbo',
  'obbbbbbbbbbbbbbo',
  '.obbbbbbbbbbbbo.',
  '.obbbbbbbbbbbbo.',
  '..obbbbbbbbbbo..',
  '...oooooooooo...',
  '...oo......oo...',
  '................',
]

const STAND_IN_KEYS: Readonly<Record<string, string>> = { o: '0', b: '1', w: '2', e: '3', p: '4', m: '5' }

const standIn = (color: Color): Sprite => ({
  palette: ['332233', COLOR_HEX[color], 'ffffff', '221122', 'ff9999', '883344'],
  rows: STAND_IN.map(row => row.replace(/[a-z]/g, key => STAND_IN_KEYS[key] ?? '.')),
})

const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`)

const hashOf = (text: string): string => {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193) >>> 0
  }
  return hash.toString(36)
}

export type PlazaView = {
  now: number
  pets: { key: string; name: string; status: Status; mood: Mood; sprite: Sprite }[]
  events: { key: string; at: number; kind: Action; from: string; to: string | null; line: string }[]
}

export const plazaView = (members: readonly Member[], events: readonly PlazaEvent[], now: number): PlazaView => ({
  now,
  pets: members.map(member => ({ key: hashOf(member.id), name: member.name, status: member.status, mood: member.mood, sprite: member.sprite ?? standIn(member.color) })),
  events: events
    .flatMap(event => (event.kind === 'join' ? [] : [{ key: hashOf(event.id), at: event.at, kind: event.kind, from: hashOf(event.from.id), to: event.to === null ? null : hashOf(event.to), line: event.line }]))
    .slice(-20),
})

const PAGE = await Bun.file(`${import.meta.dir}/page.html`).text()

export const statusPage = (view: PlazaView): string => {
  const roster = view.pets.map(pet => `<li>${escapeHtml(pet.name)} · ${STATUS_LABEL[pet.status]}</li>`).join('')
  return PAGE.replace('{{count}}', () => String(view.pets.length))
    .replace('{{empty}}', () => (view.pets.length === 0 ? '' : 'hidden'))
    .replace('{{roster}}', () => roster || '<li>아직 아무도 없어요</li>')
    .replace('{{state}}', () => JSON.stringify(view).replace(/</g, '\\u003c'))
}

export type Runner = (argv: readonly string[], timeoutMs: number) => Promise<string | null>

const runProcess: Runner = async (argv, timeoutMs) => {
  try {
    const child = Bun.spawn([...argv], { stdout: 'pipe', stderr: 'ignore', stdin: 'ignore' })
    const timer = setTimeout(() => child.kill(), timeoutMs)
    const [text, code] = await Promise.all([new Response(child.stdout).text(), child.exited])
    clearTimeout(timer)
    return code === 0 ? text : null
  } catch {
    return null
  }
}

export const claudeCodeGenerator = (env: Readonly<Record<string, string | undefined>>, run: Runner = runProcess): Generate => {
  if (!env.CLAUDE_CODE_OAUTH_TOKEN) {
    return async () => null
  }
  const timeoutMs = Number(env.TOKO_CLAUDE_TIMEOUT_MS ?? 20000)
  const model = env.TOKO_CLAUDE_MODEL ?? 'haiku'
  let running = 0
  return async prompt => {
    if (running >= 2) {
      return null
    }
    running += 1
    try {
      return await run(['claude', '-p', '--model', model, '--max-turns', '1', '--output-format', 'text', prompt], timeoutMs)
    } finally {
      running -= 1
    }
  }
}

export const pickGenerator = (env: Readonly<Record<string, string | undefined>>): { generate: Generate; source: string } => {
  if ((env.TOKO_DLLM_URL ?? '').trim().length > 0) {
    return { generate: dllmGenerator(env), source: 'LLM gateway' }
  }
  if (env.CLAUDE_CODE_OAUTH_TOKEN) {
    return { generate: claudeCodeGenerator(env), source: 'Claude Code (OAuth)' }
  }
  return { generate: async () => null, source: 'fallback lines' }
}

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

const readBody = async (request: Request): Promise<Record<string, unknown> | null> => {
  const text = await request.text()
  if (text.length > MAX_BODY) {
    return null
  }
  try {
    return asRecord(JSON.parse(text))
  } catch {
    return null
  }
}

export const createPlaza = (options: PlazaOptions = {}) => {
  const now = options.now ?? (() => Date.now())
  const generate = options.generate ?? (async () => null)
  const friendTtlMs = options.friendTtlMs ?? 90_000
  const maxEvents = options.maxEvents ?? 500
  const actionsPerMinute = options.actionsPerMinute ?? 12
  const keepAliveMs = options.keepAliveMs ?? 15_000
  const members = new Map<string, Member>()
  const tabs = new Map<string, Map<string, Member>>()
  const actions = new Map<string, number[]>()
  const listeners = new Set<Listener>()
  let events: PlazaEvent[] = []
  let pending: Promise<void>[] = []
  let counter = 0

  const nextId = (): string => {
    counter += 1
    return `e${now().toString(36)}${counter.toString(36)}`
  }

  const friendsOf = (id: string): Omit<Member, 'sprite'>[] => [...members.values()].filter(member => member.id !== id).slice(0, 30).map(friendOf)

  const eventsFor = (id: string, since: number): PlazaEvent[] =>
    events.filter(event => event.at > since && event.from.id !== id && (event.to === null || event.to === id)).slice(-20)

  const messageFor = (listener: Listener, at: number): string =>
    listener.id === null
      ? sseMessage('view', plazaView([...members.values()], events, at))
      : sseMessage('plaza', { now: at, friends: friendsOf(listener.id), events: eventsFor(listener.id, 0) })

  const broadcast = (): void => {
    const at = now()
    for (const listener of listeners) {
      listener.send(messageFor(listener, at))
    }
  }

  const record = (event: PlazaEvent): void => {
    events = [...events, event].slice(-maxEvents)
    broadcast()
  }

  const prune = (at: number): void => {
    const before = members.size
    for (const [id, member] of members) {
      if (at - member.lastSeen > friendTtlMs) {
        members.delete(id)
        tabs.delete(id)
        actions.delete(id)
      }
    }
    if (members.size !== before) {
      broadcast()
    }
  }

  const remerge = (id: string): void => {
    const [first, ...rest] = [...(tabs.get(id)?.values() ?? [])]
    if (first !== undefined) {
      members.set(id, mergeTabs([first, ...rest]))
    }
  }

  const join = (me: Member): void => {
    const before = members.get(me.id)
    const reports = tabs.get(me.id) ?? new Map<string, Member>()
    reports.set(me.tab ?? '', me)
    for (const [tab, report] of reports) {
      if (me.lastSeen - report.lastSeen > TAB_TTL_MS) {
        reports.delete(tab)
      }
    }
    tabs.set(me.id, reports)
    remerge(me.id)
    if (!sameLook(before, members.get(me.id))) {
      broadcast()
    }
  }

  const touch = (id: string, tab: string, at: number): void => {
    const report = tabs.get(id)?.get(tab)
    if (report !== undefined) {
      tabs.get(id)?.set(tab, { ...report, lastSeen: at })
      remerge(id)
    }
  }

  const stream = (id: string | null, tab: string): Response => {
    const encoder = new TextEncoder()
    let listener: Listener | null = null
    let timer: ReturnType<typeof setInterval> | undefined
    const close = (): void => {
      clearInterval(timer)
      if (listener !== null) {
        listeners.delete(listener)
      }
    }
    const body = new ReadableStream<Uint8Array>({
      start: controller => {
        const send = (text: string): void => {
          try {
            controller.enqueue(encoder.encode(text))
          } catch {
            close()
          }
        }
        const opened: Listener = { id, send }
        listener = opened
        listeners.add(opened)
        send(`retry: 3000\n\n${messageFor(opened, now())}`)
        timer = setInterval(() => {
          const at = now()
          if (id !== null) {
            touch(id, tab, at)
          }
          prune(at)
          send(': ping\n\n')
        }, keepAliveMs)
      },
      cancel: close,
    })
    return new Response(body, { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' } })
  }

  const isRateLimited = (id: string, at: number): boolean => {
    const recent = (actions.get(id) ?? []).filter(time => at - time < 60_000)
    actions.set(id, [...recent, at])
    return recent.length >= actionsPerMinute
  }

  const fallbackLine = (kind: Action): string => {
    const lines = FALLBACK_LINES[kind]
    return lines[counter % lines.length] ?? lines[0] ?? ''
  }

  const poll = (me: Member, since: number): Response => {
    const at = me.lastSeen
    prune(at)
    if (!members.has(me.id)) {
      record({ id: nextId(), at, kind: 'join', from: senderOf(me), to: null, line: '' })
    }
    join(me)
    return json(200, { now: at, friends: friendsOf(me.id), events: eventsFor(me.id, since) })
  }

  const act = async (me: Member, kind: Action, toId: string | null): Promise<Response> => {
    const at = me.lastSeen
    join(me)
    if (isRateLimited(me.id, at)) {
      return json(429, { error: 'too many actions, take a breath' })
    }
    const to = toId === null ? null : (members.get(toId) ?? null)
    if (toId !== null && to === null) {
      return json(404, { error: 'that friend is not in the plaza' })
    }
    const id = nextId()
    const from = senderOf(me)
    const task = generate(actionPrompt(me, to, kind))
      .catch(() => null)
      .then(raw => record({ id, at: now(), kind, from, to: to?.id ?? null, line: sanitizeLine(raw) ?? fallbackLine(kind) }))
    pending = [...pending, task]
    void task.finally(() => {
      pending = pending.filter(other => other !== task)
    })
    return json(202, { ok: true, queued: true, id })
  }

  const handle = async (request: Request): Promise<Response> => {
    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname === '/') {
      prune(now())
      return new Response(statusPage(plazaView([...members.values()], events, now())), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
    }
    if (request.method === 'GET' && url.pathname === '/v1/plaza') {
      prune(now())
      return json(200, plazaView([...members.values()], events, now()))
    }
    if (request.method === 'GET' && url.pathname === '/v1/plaza/stream') {
      prune(now())
      return stream(null, '')
    }
    if (request.method === 'GET' && url.pathname === '/v1/stream') {
      const id = url.searchParams.get('id') ?? ''
      const tab = url.searchParams.get('tab') ?? ''
      if (!/^[a-z0-9-]{4,64}$/i.test(id)) {
        return json(400, { error: 'bad request' })
      }
      prune(now())
      return stream(id, /^[a-z0-9]{1,16}$/i.test(tab) ? tab : '')
    }
    if (request.method === 'GET' && url.pathname === '/health') {
      return json(200, { ok: true, members: members.size })
    }
    if (request.method !== 'POST' || (url.pathname !== '/v1/poll' && url.pathname !== '/v1/act')) {
      return json(404, { error: 'not found' })
    }
    const body = await readBody(request)
    const me = parseMe(body?.me, now())
    if (body === null || me === null) {
      return json(400, { error: 'bad request' })
    }
    if (url.pathname === '/v1/poll') {
      return poll(me, typeof body.since === 'number' ? body.since : 0)
    }
    const kind = String(body.kind)
    if (!ACTIONS.has(kind)) {
      return json(400, { error: 'unknown action' })
    }
    return act(me, kind as Action, typeof body.to === 'string' ? body.to : null)
  }

  const settle = async (): Promise<void> => {
    await Promise.all(pending)
  }

  return { handle, members, events: () => events, settle }
}

if (import.meta.main) {
  const env = process.env
  const { generate, source } = pickGenerator(env)
  const plaza = createPlaza({ generate })
  const server = Bun.serve({ port: Number(env.PORT ?? 8080), hostname: env.HOST ?? '0.0.0.0', idleTimeout: 120, fetch: plaza.handle })
  console.log(`toko plaza listening on http://${server.hostname}:${server.port} (lines: ${source})`)
}
