export type Color = 'honey' | 'mint' | 'peach' | 'lavender'
export type Mood = 'excited' | 'calm' | 'sleepy' | 'worried' | 'sulky'
export type Status = 'working' | 'resting' | 'idle' | 'away'
export type Action = 'wave' | 'heart' | 'snack' | 'stretch-call' | 'cheer'

export type Sprite = { palette: readonly string[]; rows: readonly string[] }

export type Member = { id: string; name: string; color: Color; species?: string; mood: Mood; status: Status; lastSeen: number; sprite?: Sprite }

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
  const sprite = parseSprite(raw.sprite)
  return {
    id,
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
const PIXEL = 5

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

const spriteSvg = (sprite: Sprite): string => {
  const width = Math.max(...sprite.rows.map(row => row.length))
  const paths = new Map<string, string>()
  sprite.rows.forEach((row, y) => {
    for (const run of row.matchAll(/([0-9a-z])\1*/g)) {
      const color = sprite.palette[SPRITE_KEYS.indexOf(run[1] ?? '')] ?? '332233'
      paths.set(color, `${paths.get(color) ?? ''}M${run.index ?? 0} ${y}h${run[0].length}v1h-${run[0].length}z`)
    }
  })
  const shapes = [...paths].map(([color, d]) => `<path fill="#${color}" d="${d}"/>`).join('')
  return `<svg viewBox="0 0 ${width} ${sprite.rows.length}" width="${width * PIXEL}" height="${sprite.rows.length * PIXEL}" shape-rendering="crispEdges" aria-hidden="true">${shapes}</svg>`
}

const hashOf = (text: string): string => {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193) >>> 0
  }
  return hash.toString(36)
}

const cardOf = (member: Member): string => {
  const body = `<span class="bubble">놀러 왔어!</span>${spriteSvg(member.sprite ?? standIn(member.color))}<span class="name">${escapeHtml(member.name)}</span><small>${STATUS_LABEL[member.status]}</small>`
  return `<li class="toko ${member.status}" data-key="${hashOf(member.id)}" data-sig="${hashOf(body)}">${body}</li>`
}

const STYLE = `:root{--bg:#fbf8f2;--ink:#2b2730;--muted:#6b6570;--ground:#eef3e1;--edge:#dbe6c6;--card:#fffdf8;--line:#e6e0d8}
@media (prefers-color-scheme:dark){:root{--bg:#1f1d22;--ink:#eee;--muted:#b5b0ba;--ground:#3d4739;--edge:#4d5a48;--card:#2b2830;--line:#4a4650}}
html{font-size:18px}body{font-family:'Noto Sans KR','Apple SD Gothic Neo',sans-serif;font-size:18px;margin:0;padding:32px 16px;background:var(--bg);color:var(--ink)}
main{max-width:880px;margin:0 auto}h1{font-size:1.4rem;margin:0 0 4px}p{margin:0 0 20px;color:var(--muted)}
#plaza{list-style:none;margin:0;padding:48px 12px 20px;display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:center;gap:44px 16px;min-height:150px;background:var(--ground);border:2px solid var(--edge);border-radius:16px}
.toko{position:relative;display:flex;flex-direction:column;align-items:center;width:104px}
.toko svg{display:block;animation:bob 2.4s ease-in-out infinite}.toko:nth-child(3n+2) svg{animation-delay:-.8s}.toko:nth-child(3n) svg{animation-delay:-1.6s}
.name{max-width:100%;margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.9rem;font-weight:600}small{font-size:.75rem;color:var(--muted)}
.away svg{opacity:.45;animation:none}
.bubble{position:absolute;bottom:calc(100% + 2px);left:50%;transform:translateX(-50%);padding:3px 10px;border:2px solid var(--line);border-radius:12px;background:var(--card);white-space:nowrap;font-size:.75rem;opacity:0;pointer-events:none}
.arrive{animation:arrive .6s cubic-bezier(.3,1.5,.5,1)}.arrive .bubble{animation:say 6s ease forwards}
.empty{align-self:center;color:var(--muted)}.hint{margin:16px 0 0;font-size:.8rem}
@keyframes bob{50%{transform:translateY(-3px)}}@keyframes arrive{from{opacity:0;transform:translateY(24px) scale(.6)}}@keyframes say{0%,80%{opacity:1}to{opacity:0}}
@media (prefers-reduced-motion:reduce){.toko svg,.arrive{animation:none}}`

const REFRESH = `setInterval(async () => {
  try {
    const response = await fetch(location.pathname, { cache: 'no-store' })
    const next = new DOMParser().parseFromString(await response.text(), 'text/html')
    const incoming = next.getElementById('plaza')
    const plaza = document.getElementById('plaza')
    if (!response.ok || incoming === null || plaza === null) return
    const old = new Map([...plaza.children].map(node => [node.dataset.key, node]))
    const wanted = [...incoming.children].map(node => {
      const kept = old.get(node.dataset.key)
      if (kept === undefined) node.classList.add('arrive')
      return kept !== undefined && kept.dataset.sig === node.dataset.sig ? kept : node
    })
    for (const node of [...plaza.children]) if (!wanted.includes(node)) node.remove()
    wanted.forEach((node, index) => { if (plaza.children[index] !== node) plaza.insertBefore(node, plaza.children[index] ?? null) })
    document.getElementById('count').textContent = next.getElementById('count').textContent
  } catch {}
}, 5000)`

export const statusPage = (members: readonly Member[]): string => {
  const cards = members.length === 0 ? '<li class="empty" data-key="empty" data-sig="empty">아직 아무도 없어요. 토코를 데리고 놀러 오세요</li>' : members.map(cardOf).join('')
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>토코 광장</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap">
<style>${STYLE}</style></head>
<body><main><h1>토코 광장</h1><p id="count">지금 ${members.length}마리가 함께 쉬어 가는 중이에요.</p><ul id="plaza">${cards}</ul><p class="hint">Claude Code에서 토코를 켜 두면 이 광장에 들어와요. 화면은 5초마다 새로 고쳐요.</p></main>
<script>${REFRESH}</script></body></html>`
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
  const members = new Map<string, Member>()
  const actions = new Map<string, number[]>()
  let events: PlazaEvent[] = []
  let pending: Promise<void>[] = []
  let counter = 0

  const nextId = (): string => {
    counter += 1
    return `e${now().toString(36)}${counter.toString(36)}`
  }

  const record = (event: PlazaEvent): void => {
    events = [...events, event].slice(-maxEvents)
  }

  const prune = (at: number): void => {
    for (const [id, member] of members) {
      if (at - member.lastSeen > friendTtlMs) {
        members.delete(id)
        actions.delete(id)
      }
    }
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
    members.set(me.id, me)
    const friends = [...members.values()].filter(member => member.id !== me.id).slice(0, 30).map(friendOf)
    const mine = events.filter(event => event.at > since && event.from.id !== me.id && (event.to === null || event.to === me.id)).slice(-20)
    return json(200, { now: at, friends, events: mine })
  }

  const act = async (me: Member, kind: Action, toId: string | null): Promise<Response> => {
    const at = me.lastSeen
    members.set(me.id, me)
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
      return new Response(statusPage([...members.values()]), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } })
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
  const server = Bun.serve({ port: Number(env.PORT ?? 8080), hostname: env.HOST ?? '0.0.0.0', fetch: plaza.handle })
  console.log(`toko plaza listening on http://${server.hostname}:${server.port} (lines: ${source})`)
}
