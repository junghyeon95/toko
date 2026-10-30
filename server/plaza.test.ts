import { describe, expect, test } from 'bun:test'

import { claudeCodeGenerator, createPlaza, dllmGenerator, pickGenerator, sanitizeLine } from './plaza'

const me = (id: string, name: string) => ({ id, name, color: 'mint', mood: 'calm', status: 'working' })

const post = (path: string, body: unknown) =>
  new Request(`http://plaza.test${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

const read = async (response: Response) => ({ status: response.status, body: (await response.json()) as Record<string, any> })

const listen = async (path: string, plaza: ReturnType<typeof createPlaza>) => {
  const response = await plaza.handle(new Request(`http://plaza.test${path}`))
  const reader = (response.body as ReadableStream<Uint8Array>).getReader()
  const decoder = new TextDecoder()
  const next = async (name: string): Promise<Record<string, any>> => {
    const { value } = await reader.read()
    const block = decoder.decode(value).split('\n\n').find(part => part.includes(`event: ${name}`)) ?? ''
    return JSON.parse(block.slice(block.indexOf('data: ') + 6))
  }
  return { type: response.headers.get('content-type'), next, close: () => reader.cancel() }
}

describe('plaza', () => {
  test('a wave reaches its target over the event stream without waiting for a poll', async () => {
    const plaza = createPlaza({ keepAliveMs: 60_000 })
    await plaza.handle(post('/v1/poll', { me: me('aaaa1', '말랑'), since: 0 }))
    await plaza.handle(post('/v1/poll', { me: me('bbbb2', '콩떡'), since: 0 }))
    const kong = await listen('/v1/stream?id=bbbb2&tab=t1', plaza)
    const page = await listen('/v1/plaza/stream', plaza)
    expect(kong.type).toContain('text/event-stream')
    expect((await kong.next('plaza')).friends.map((friend: { name: string }) => friend.name)).toEqual(['말랑'])
    expect((await page.next('view')).pets.length).toBe(2)
    await plaza.handle(post('/v1/act', { me: me('aaaa1', '말랑'), kind: 'wave', to: 'bbbb2' }))
    await plaza.settle()
    expect((await kong.next('plaza')).events.at(-1).kind).toBe('wave')
    expect((await page.next('view')).events.at(-1).kind).toBe('wave')
    expect((await plaza.handle(new Request('http://plaza.test/v1/stream?id=!'))).status).toBe(400)
    await kong.close()
    await page.close()
  })

  test('changes made close together reach a listener as one message', async () => {
    const plaza = createPlaza({ keepAliveMs: 60_000, flushMs: 200 })
    await plaza.handle(post('/v1/poll', { me: me('bbbb2', '콩떡'), since: 0 }))
    const kong = await listen('/v1/stream?id=bbbb2&tab=t1', plaza)
    await kong.next('plaza')
    await plaza.handle(post('/v1/poll', { me: me('aaaa1', '말랑'), since: 0 }))
    await plaza.handle(post('/v1/poll', { me: me('cccc3', '보들'), since: 0 }))
    await plaza.handle(post('/v1/poll', { me: me('dddd4', '찹쌀'), since: 0 }))
    expect((await kong.next('plaza')).friends.length).toBe(3)
    const more = await Promise.race([kong.next('plaza').then(() => 'more', () => 'more'), Bun.sleep(300).then(() => 'none')])
    expect(more).toBe('none')
    await kong.close()
  })

  test('friends who are working or just changed come first, so late arrivals are not hidden behind the first thirty', async () => {
    let clock = 1_000
    const plaza = createPlaza({ now: () => clock })
    for (let i = 10; i < 45; i += 1) {
      clock += 1_000
      await plaza.handle(post('/v1/poll', { me: { ...me(`pet${i}`, `펫${i}`), status: 'idle' }, since: 0 }))
    }
    clock += 1_000
    await plaza.handle(post('/v1/poll', { me: { ...me('pet10', '펫10'), status: 'working' }, since: 0 }))
    const seen = await read(await plaza.handle(post('/v1/poll', { me: { ...me('watcher', '구경꾼'), status: 'idle' }, since: 0 })))
    const ids = seen.body.friends.map((friend: { id: string }) => friend.id)
    expect(ids.length).toBe(30)
    expect(ids[0]).toBe('pet10')
    expect(ids[1]).toBe('pet44')
    expect(ids).not.toContain('pet11')
  })

  test('bonks are counted by kind for the day, odd kinds are refused, and the board starts over the next day', async () => {
    let clock = Date.UTC(2026, 9, 29, 3, 0)
    const plaza = createPlaza({ now: () => clock, actionsPerMinute: 3 })
    const bonk = async (id: string, kind: string) => (await plaza.handle(post('/v1/bonk', { me: me(id, '말랑'), kind }))).status
    expect([await bonk('aaaa1', 'unverified'), await bonk('bbbb2', 'unverified'), await bonk('bbbb2', 'overreach')]).toEqual([202, 202, 202])
    expect(await bonk('aaaa1', '<script>')).toBe(400)
    const board = (await read(await plaza.handle(new Request('http://plaza.test/v1/plaza')))).body.bonks
    expect(board).toEqual({
      total: 3,
      top: [
        { kind: 'unverified', label: '안 돌려 보고 됐다고 함', count: 2 },
        { kind: 'overreach', label: '시키지 않은 것까지 고침', count: 1 },
      ],
    })
    expect((await read(await plaza.handle(post('/v1/poll', { me: me('cccc3', '보들'), since: 0 })))).body.bonks.total).toBe(3)
    expect([await bonk('aaaa1', 'stuck'), await bonk('aaaa1', 'stuck'), await bonk('aaaa1', 'stuck')]).toEqual([202, 202, 429])
    clock = Date.UTC(2026, 9, 29, 15, 1)
    expect((await read(await plaza.handle(new Request('http://plaza.test/v1/plaza')))).body.bonks).toEqual({ total: 0, top: [] })
    expect(await bonk('aaaa1', 'wordy')).toBe(202)
    expect((await read(await plaza.handle(new Request('http://plaza.test/v1/plaza')))).body.bonks.total).toBe(1)
  })

  test('friends see each other and a wave reaches only its target', async () => {
    let clock = 1_000
    const plaza = createPlaza({ now: () => clock })
    await plaza.handle(post('/v1/poll', { me: me('aaaa1', '말랑'), since: 0 }))
    await plaza.handle(post('/v1/poll', { me: me('bbbb2', '콩떡'), since: 0 }))
    await plaza.handle(post('/v1/poll', { me: me('cccc3', '보들'), since: 0 }))
    clock += 1_000
    const sent = await read(await plaza.handle(post('/v1/act', { me: me('aaaa1', '말랑'), kind: 'wave', to: 'bbbb2' })))
    expect(sent.status).toBe(202)
    await plaza.settle()
    expect((plaza.events().at(-1)?.line.length ?? 0) > 0).toBe(true)
    const forKong = await read(await plaza.handle(post('/v1/poll', { me: me('bbbb2', '콩떡'), since: 1_500 })))
    const forBodeul = await read(await plaza.handle(post('/v1/poll', { me: me('cccc3', '보들'), since: 1_500 })))
    expect(forKong.body.events.map((event: { kind: string }) => event.kind)).toEqual(['wave'])
    expect(forBodeul.body.events).toEqual([])
    expect(forKong.body.friends.map((friend: { name: string }) => friend.name).sort()).toEqual(['말랑', '보들'])
  })

  test('the LLM gateway writes the line, and a rude or empty line falls back', async () => {
    const replies = ['"같이 숨 한 번 쉬자"', '바보야 일해', null]
    const plaza = createPlaza({ generate: async () => replies.shift() ?? null })
    await plaza.handle(post('/v1/poll', { me: me('aaaa1', '말랑'), since: 0 }))
    for (let round = 0; round < 3; round += 1) {
      await plaza.handle(post('/v1/act', { me: me('aaaa1', '말랑'), kind: 'heart', to: null }))
      await plaza.settle()
    }
    const lines = plaza.events().filter(event => event.kind === 'heart').map(event => event.line)
    expect(lines[0]).toBe('같이 숨 한 번 쉬자')
    expect(lines[1]).not.toContain('바보')
    expect((lines[2]?.length ?? 0) > 0).toBe(true)
  })

  test('one person’s tabs show as their busiest tab, and a closed tab stops counting', async () => {
    let clock = 1_000
    const plaza = createPlaza({ now: () => clock })
    const hat = { palette: ['332233'], rows: ['00', '00'] }
    const bare = { palette: ['332233'], rows: ['..', '00'] }
    const view = async () => (await read(await plaza.handle(new Request('http://plaza.test/v1/plaza')))).body.pets[0]
    await plaza.handle(post('/v1/poll', { me: { ...me('aaaa1', '말랑'), tab: 'one', status: 'working', mood: 'excited', sprite: hat }, since: 0 }))
    clock += 5_000
    await plaza.handle(post('/v1/poll', { me: { ...me('aaaa1', '말랑'), tab: 'two', status: 'away', mood: 'sleepy', sprite: bare }, since: 0 }))
    expect([(await view()).mood, (await view()).sprite.rows]).toEqual(['excited', hat.rows])
    expect(plaza.members.size).toBe(1)
    clock += 50_000
    await plaza.handle(post('/v1/poll', { me: { ...me('aaaa1', '말랑'), tab: 'two', status: 'away', mood: 'sleepy', sprite: bare }, since: 0 }))
    expect([(await view()).mood, (await view()).sprite.rows]).toEqual(['sleepy', bare.rows])
  })

  test('a wave carries what the sender wears, and odd values are dropped', async () => {
    const plaza = createPlaza()
    const wear = { hat: 'crown', face: 'sunglasses', neck: 'Scarf!', cape: 'red' }
    await plaza.handle(post('/v1/poll', { me: { ...me('aaaa1', '말랑'), wear }, since: 0 }))
    await plaza.handle(post('/v1/poll', { me: me('bbbb2', '콩떡'), since: 0 }))
    await plaza.handle(post('/v1/act', { me: { ...me('aaaa1', '말랑'), wear }, kind: 'wave', to: 'bbbb2' }))
    await plaza.settle()
    const forKong = await read(await plaza.handle(post('/v1/poll', { me: me('bbbb2', '콩떡'), since: 0 })))
    expect(forKong.body.events.at(-1).from.wear).toEqual({ hat: 'crown', face: 'sunglasses' })
  })

  test('too many actions in a minute are refused gently', async () => {
    const plaza = createPlaza({ actionsPerMinute: 2 })
    const act = () => plaza.handle(post('/v1/act', { me: me('aaaa1', '말랑'), kind: 'cheer', to: null }))
    expect((await act()).status).toBe(202)
    expect((await act()).status).toBe(202)
    expect((await act()).status).toBe(429)
  })

  test('bad input is refused, and friends who leave drop out', async () => {
    let clock = 0
    const plaza = createPlaza({ now: () => clock, friendTtlMs: 1_000 })
    expect((await plaza.handle(post('/v1/poll', { me: { id: '!', color: 'mint' } }))).status).toBe(400)
    expect((await plaza.handle(post('/v1/act', { me: me('aaaa1', '말랑'), kind: 'punch' }))).status).toBe(400)
    expect((await plaza.handle(post('/v1/act', { me: me('aaaa1', '말랑'), kind: 'wave', to: 'ghost' }))).status).toBe(404)
    await plaza.handle(post('/v1/poll', { me: me('bbbb2', '콩떡'), since: 0 }))
    clock = 5_000
    const later = await read(await plaza.handle(post('/v1/poll', { me: me('aaaa1', '말랑'), since: 0 })))
    expect(later.body.friends).toEqual([])
    expect((await plaza.handle(new Request('http://plaza.test/health'))).status).toBe(200)
  })

  test('the gateway client speaks the OpenAI-compatible chat API and gives up quietly', async () => {
    const calls: { url: string; body: any }[] = []
    const fake = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) })
      return new Response(JSON.stringify({ choices: [{ message: { content: '천천히 해도 괜찮아' } }] }))
    }) as unknown as typeof fetch
    const generate = dllmGenerator({ TOKO_DLLM_URL: 'https://dllm.example/v1/', TOKO_DLLM_MODEL: 'llada-8b' }, fake)
    expect(await generate('hi')).toBe('천천히 해도 괜찮아')
    expect(calls[0]?.url).toBe('https://dllm.example/v1/chat/completions')
    expect(calls[0]?.body.model).toBe('llada-8b')
    expect(await dllmGenerator({})('hi')).toBe(null)
    const broken = dllmGenerator({ TOKO_DLLM_URL: 'https://dllm.example' }, (async () => new Response('nope', { status: 500 })) as unknown as typeof fetch)
    expect(await broken('hi')).toBe(null)
  })

  test('a species rides along with the pet, and an odd one is dropped', async () => {
    const plaza = createPlaza()
    await plaza.handle(post('/v1/poll', { me: { ...me('aaaa1', '말랑'), species: 'fox' }, since: 0 }))
    await plaza.handle(post('/v1/poll', { me: { ...me('bbbb2', '콩떡'), species: '<script>' }, since: 0 }))
    const seen = await read(await plaza.handle(post('/v1/poll', { me: me('cccc3', '보들'), since: 0 })))
    expect(seen.body.friends.map((friend: { name: string; species?: string }) => [friend.name, friend.species ?? null]).sort()).toEqual([
      ['말랑', 'fox'],
      ['콩떡', null],
    ])
    expect(seen.body.events.find((event: { from: { name: string } }) => event.from.name === '말랑')?.from.species).toBe('fox')
  })

  test('the status page lists the pets in the plaza and escapes their names', async () => {
    const plaza = createPlaza()
    await plaza.handle(post('/v1/poll', { me: { ...me('aaaa1', '<b>말랑'), color: 'peach' }, since: 0 }))
    const html = await (await plaza.handle(new Request('http://plaza.test/'))).text()
    expect(html).toContain('1마리')
    expect(html).toContain('&#60;b&#62;말랑')
    expect(html).not.toContain('<b>말랑')
  })

  test('a pet’s own picture reaches the plaza view but not its friends, and a broken one gets a stand-in', async () => {
    const plaza = createPlaza()
    const sprite = { palette: ['332233', 'FFDD99'], rows: ['.00.', '0110', '.00.'] }
    await plaza.handle(post('/v1/poll', { me: { ...me('aaaa1', '말랑'), sprite }, since: 0 }))
    await plaza.handle(post('/v1/poll', { me: { ...me('bbbb2', '콩떡'), sprite: { palette: ['tomato'], rows: ['00'] } }, since: 0 }))
    await plaza.handle(post('/v1/poll', { me: { ...me('cccc3', '보들'), sprite: { palette: ['332233'], rows: ['01'] } }, since: 0 }))
    expect(plaza.members.get('aaaa1')?.sprite).toEqual({ palette: ['332233', 'ffdd99'], rows: sprite.rows })
    expect(plaza.members.get('bbbb2')?.sprite).toBe(undefined)
    expect(plaza.members.get('cccc3')?.sprite).toBe(undefined)
    const seen = await read(await plaza.handle(post('/v1/poll', { me: me('dddd4', '몽떡'), since: 0 })))
    expect(seen.body.friends.filter((friend: { sprite?: unknown }) => friend.sprite !== undefined)).toEqual([])
    const view = await read(await plaza.handle(new Request('http://plaza.test/v1/plaza')))
    expect(view.body.pets.map((pet: { name: string; sprite: { palette: string[] } }) => [pet.name, pet.sprite.palette[1]])).toEqual([
      ['말랑', 'ffdd99'],
      ['콩떡', 'aaeecc'],
      ['보들', 'aaeecc'],
      ['몽떡', 'aaeecc'],
    ])
  })

  test('the status page draws the plaza from a public view without plaza ids, and greets an empty plaza', async () => {
    const plaza = createPlaza()
    await plaza.handle(post('/v1/poll', { me: me('aaaa1', '말랑'), since: 0 }))
    await plaza.handle(post('/v1/poll', { me: me('bbbb2', '콩떡'), since: 0 }))
    await plaza.handle(post('/v1/act', { me: me('aaaa1', '말랑'), kind: 'heart', to: 'bbbb2' }))
    await plaza.settle()
    const view = (await read(await plaza.handle(new Request('http://plaza.test/v1/plaza')))).body
    expect(view.events.map((event: { kind: string }) => event.kind)).toEqual(['heart'])
    expect([view.events[0].from, view.events[0].to]).toEqual(view.pets.map((pet: { key: string }) => pet.key))
    const html = await (await plaza.handle(new Request('http://plaza.test/'))).text()
    expect(html).toContain("fetch('/v1/plaza'")
    expect(html).not.toContain('{{')
    expect(`${html}${JSON.stringify(view)}`).not.toContain('aaaa1')
    expect(JSON.parse(html.match(/<script id="state" type="application\/json">(.*?)<\/script>/)?.[1] ?? '{}').pets.length).toBe(2)
    expect(await (await createPlaza().handle(new Request('http://plaza.test/'))).text()).toContain('아직 아무도 없어요')
  })

  test('with an OAuth token, Claude Code writes the line, two at a time at most', async () => {
    const calls: string[][] = []
    let release: () => void = () => {}
    const gate = new Promise<void>(resolve => {
      release = resolve
    })
    const run = async (argv: readonly string[]) => {
      calls.push([...argv])
      await gate
      return '같이 숨 한 번 쉬자\n'
    }
    const generate = claudeCodeGenerator({ CLAUDE_CODE_OAUTH_TOKEN: 'x' }, run)
    const first = generate('a')
    const second = generate('b')
    expect(await generate('c')).toBe(null)
    release()
    expect(await first).toBe('같이 숨 한 번 쉬자\n')
    await second
    expect(calls[0]?.slice(0, 4)).toEqual(['claude', '-p', '--model', 'haiku'])
    expect(await claudeCodeGenerator({})('a')).toBe(null)
    expect(pickGenerator({ CLAUDE_CODE_OAUTH_TOKEN: 'x' }).source).toContain('Claude Code')
    expect(pickGenerator({ TOKO_DLLM_URL: 'https://g/v1', CLAUDE_CODE_OAUTH_TOKEN: 'x' }).source).toBe('LLM gateway')
    expect(pickGenerator({}).source).toBe('fallback lines')
  })

  test('lines are trimmed to one short line', () => {
    expect(sanitizeLine('첫 줄\n둘째 줄')).toBe('첫 줄')
    expect(sanitizeLine('가'.repeat(80))?.length).toBe(40)
    expect(sanitizeLine('   ')).toBe(null)
    expect(sanitizeLine('# 제목\n\n"**같이 쉬자**"')).toBe('같이 쉬자')
  })
})

describe('rooms and visits', () => {
  const memoryStorage = () => {
    let text: string | null = null
    return { read: () => text, write: (next: string) => void (text = next) }
  }
  const host = { ...me('host1', '말랑'), room: { 'floor-1': 'cushion', rug: 'rug' } }

  test('a guest stays in a room until it leaves, even across a server restart', async () => {
    const storage = memoryStorage()
    const first = createPlaza({ storage })
    await first.handle(post('/v1/poll', { me: host, since: 0 }))
    expect((await read(await first.handle(post('/v1/visit', { me: me('guest1', '콩떡'), to: 'host1' })))).status).toBe(200)
    expect((await read(await first.handle(post('/v1/poll', { me: host, since: 0 })))).body.events.at(-1)).toMatchObject({ kind: 'visit', line: '콩떡이(가) 놀러 왔어' })
    const second = createPlaza({ storage })
    const guestHome = await read(await second.handle(post('/v1/poll', { me: me('guest1', '콩떡'), since: 0 })))
    expect(guestHome.body.away).toMatchObject({ host: 'host1', hostName: '말랑' })
    const hostHome = await read(await second.handle(post('/v1/poll', { me: host, since: 0 })))
    expect(hostHome.body.guests.map((guest: { name: string }) => guest.name)).toEqual(['콩떡'])
    const room = await read(await second.handle(new Request('http://plaza.test/v1/room?id=host1')))
    expect(room.body).toMatchObject({ layout: { 'floor-1': 'cushion', rug: 'rug' }, guests: [{ id: 'guest1' }] })
    await second.handle(post('/v1/visit/end', { me: me('guest1', '콩떡') }))
    expect((await read(await second.handle(post('/v1/poll', { me: me('guest1', '콩떡'), since: 0 })))).body.away).toBe(null)
  })

  test('a closed or full room turns a visit away', async () => {
    const plaza = createPlaza({ maxGuests: 1 })
    await plaza.handle(post('/v1/poll', { me: { ...host, isRoomOpen: false }, since: 0 }))
    expect((await plaza.handle(post('/v1/visit', { me: me('guest1', '콩떡'), to: 'host1' }))).status).toBe(403)
    await plaza.handle(post('/v1/poll', { me: host, since: 0 }))
    expect((await plaza.handle(post('/v1/visit', { me: me('guest1', '콩떡'), to: 'host1' }))).status).toBe(200)
    expect((await plaza.handle(post('/v1/visit', { me: me('guest2', '두부'), to: 'host1' }))).status).toBe(409)
    expect((await plaza.handle(post('/v1/visit', { me: me('guest2', '두부'), to: 'nobody' }))).status).toBe(403)
  })

  test('playing in the room reaches the other side and is remembered by the guest', async () => {
    const plaza = createPlaza()
    await plaza.handle(post('/v1/poll', { me: host, since: 0 }))
    await plaza.handle(post('/v1/visit', { me: me('guest1', '콩떡'), to: 'host1' }))
    await plaza.handle(post('/v1/room/act', { me: host, guest: 'guest1', kind: 'nap' }))
    const guest = await read(await plaza.handle(post('/v1/poll', { me: me('guest1', '콩떡'), since: 0 })))
    expect(guest.body.events.at(-1)).toMatchObject({ kind: 'room-act', act: 'nap', line: '같이 낮잠을 잤어', to: 'guest1' })
    expect(guest.body.away.notes).toEqual(['같이 낮잠을 잤어'])
    expect((await plaza.handle(post('/v1/room/act', { me: me('other1', '두부'), guest: 'guest1', kind: 'hug' }))).status).toBe(404)
    await plaza.handle(post('/v1/visit/end', { me: host, guest: 'guest1' }))
    const after = await read(await plaza.handle(post('/v1/poll', { me: me('guest1', '콩떡'), since: 0 })))
    expect(after.body.away).toBe(null)
    expect(after.body.events.at(-1)).toMatchObject({ kind: 'home', line: '말랑네 방에서 집으로 돌아왔어' })
  })

  test('stickers stay on the wall, three a day per friend, and gifts wait until they are taken', async () => {
    const storage = memoryStorage()
    const plaza = createPlaza({ storage })
    await plaza.handle(post('/v1/poll', { me: host, since: 0 }))
    for (const kind of ['heart', 'star', 'flower']) {
      expect((await plaza.handle(post('/v1/room/sticker', { me: me('guest1', '콩떡'), to: 'host1', kind }))).status).toBe(200)
    }
    expect((await plaza.handle(post('/v1/room/sticker', { me: me('guest1', '콩떡'), to: 'host1', kind: 'heart' }))).status).toBe(429)
    expect((await plaza.handle(post('/v1/gift', { me: me('guest1', '콩떡'), to: 'host1', item: 'cushion' }))).status).toBe(200)
    const again = createPlaza({ storage })
    const home = await read(await again.handle(post('/v1/poll', { me: host, since: 0 })))
    expect(home.body.stickers).toEqual(['heart', 'star', 'flower'])
    expect(home.body.gifts).toMatchObject([{ item: 'cushion', from: '콩떡' }])
    await again.handle(post('/v1/gift/take', { me: host, ids: [home.body.gifts[0].id] }))
    expect((await read(await again.handle(post('/v1/poll', { me: host, since: 0 })))).body.gifts).toEqual([])
  })

  test('what a pet is doing reaches friends but never the public page, and rude words are dropped', async () => {
    const plaza = createPlaza()
    await plaza.handle(post('/v1/poll', { me: { ...me('aaaa1', '말랑'), doing: '테스트 돌리고 있는 중...' }, since: 0 }))
    await plaza.handle(post('/v1/poll', { me: { ...me('bbbb2', '콩떡'), doing: '바보 같은 버그' }, since: 0 }))
    const friends = (await read(await plaza.handle(post('/v1/poll', { me: me('cccc3', '두부'), since: 0 })))).body.friends
    expect(friends.map((friend: { doing?: string }) => friend.doing ?? null).sort()).toEqual([null, '테스트 돌리고 있는 중...'])
    const view = await read(await plaza.handle(new Request('http://plaza.test/v1/plaza')))
    expect(view.body.pets.some((pet: { doing?: string }) => pet.doing !== undefined)).toBe(false)
  })

  const picture = { palette: ['ffffff'], rows: ['0'] }
  const tab = (tab: string, name: string, status: string) => ({ me: { ...me('pung1', name), status, tab, room: { rug: 'rug' }, roomPicture: picture }, since: 0 })

  test('the room list shows the same name as the pet on the plaza, whichever tab reported last', async () => {
    const plaza = createPlaza({ now: () => 1_000 })
    await plaza.handle(post('/v1/poll', tab('one', '풍풍이', 'working')))
    await plaza.handle(post('/v1/poll', tab('two', '녀우', 'away')))
    const view = await read(await plaza.handle(new Request('http://plaza.test/v1/plaza')))
    expect(view.body.pets.map((pet: { name: string }) => pet.name)).toEqual(['풍풍이'])
    expect(view.body.rooms.map((room: { name: string }) => room.name)).toEqual(['풍풍이'])
  })

  test('a room whose owner left the plaza stays open but is marked as out and listed last', async () => {
    let clock = 1_000
    const plaza = createPlaza({ now: () => clock })
    await plaza.handle(post('/v1/poll', { me: { ...me('gone1', '풍풍이'), room: { rug: 'rug' }, roomPicture: picture }, since: 0 }))
    clock += 120_000
    await plaza.handle(post('/v1/poll', { me: { ...me('here1', '녀우'), room: { rug: 'rug' }, roomPicture: picture }, since: 0 }))
    const view = await read(await plaza.handle(new Request('http://plaza.test/v1/plaza')))
    expect(view.body.rooms.map((room: { name: string; isOwnerOut: boolean }) => [room.name, room.isOwnerOut])).toEqual([
      ['녀우', false],
      ['풍풍이', true],
    ])
  })
})
