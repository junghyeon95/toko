import { describe, expect, test } from 'bun:test'

import { claudeCodeGenerator, createPlaza, dllmGenerator, pickGenerator, sanitizeLine } from './plaza'

const me = (id: string, name: string) => ({ id, name, color: 'mint', mood: 'calm', status: 'working' })

const post = (path: string, body: unknown) =>
  new Request(`http://plaza.test${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

const read = async (response: Response) => ({ status: response.status, body: (await response.json()) as Record<string, any> })

describe('plaza', () => {
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
    await plaza.handle(post('/v1/poll', { me: { ...me('aaaa1', '말랑'), tab: 'one', status: 'working', sprite: hat }, since: 0 }))
    clock += 5_000
    await plaza.handle(post('/v1/poll', { me: { ...me('aaaa1', '말랑'), tab: 'two', status: 'away', sprite: bare }, since: 0 }))
    expect([(await view()).status, (await view()).sprite.rows]).toEqual(['working', hat.rows])
    expect(plaza.members.size).toBe(1)
    clock += 50_000
    await plaza.handle(post('/v1/poll', { me: { ...me('aaaa1', '말랑'), tab: 'two', status: 'away', sprite: bare }, since: 0 }))
    expect([(await view()).status, (await view()).sprite.rows]).toEqual(['away', bare.rows])
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
    expect(seen.body.friends.map((friend: { name: string; species?: string }) => [friend.name, friend.species ?? null])).toEqual([
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
