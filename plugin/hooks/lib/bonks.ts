import { extractJson } from './persona'

export const BONK_HISTORY = 20

export const SIMILAR_OVERLAP = 0.5

export type BonkReason = { reason: string; at: number }

const isBonkReason = (value: unknown): value is BonkReason =>
  typeof value === 'object' && value !== null && typeof (value as BonkReason).reason === 'string' && typeof (value as BonkReason).at === 'number'

export const asBonks = (value: unknown): readonly BonkReason[] => (Array.isArray(value) ? value.filter(isBonkReason).slice(-BONK_HISTORY) : [])

export const addBonk = (bonks: readonly BonkReason[], reason: string, at: number): readonly BonkReason[] => [...bonks, { reason, at }].slice(-BONK_HISTORY)

const pairs = (text: string): ReadonlySet<string> => {
  const letters = [...text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')]
  return new Set(letters.slice(1).map((letter, index) => `${letters[index]}${letter}`))
}

export const isSimilarReason = (reason: string, past: readonly string[]): boolean => {
  const mine = pairs(reason)
  return (
    mine.size > 0 &&
    past.some(old => {
      const theirs = pairs(old)
      const shared = [...mine].filter(pair => theirs.has(pair)).length
      return theirs.size > 0 && shared / Math.min(mine.size, theirs.size) >= SIMILAR_OVERLAP
    })
  )
}

export const repeatSystem = 'Claude Code 사용자가 Claude에게 한 불만이 예전 불만과 같은 종류인지 판단하는 도우미다. JSON 한 줄로만 답한다.'

export const repeatPrompt = (reason: string, past: readonly string[]): string =>
  [
    '새 불만이 지난 불만 가운데 하나와 같은 종류의 잘못인지 판단한다. 같은 규칙이나 부탁을 또 어긴 경우만 같은 종류로 본다.',
    '답 형식: {"same":true} 또는 {"same":false}',
    '',
    `새 불만: ${reason}`,
    '지난 불만:',
    ...past.map((old, index) => `${index + 1}. ${old}`),
  ].join('\n')

export const parseRepeat = (text: string): boolean | null => {
  const same = extractJson(text)?.same
  return typeof same === 'boolean' ? same : null
}

export const BONK_KINDS: Readonly<Record<string, string>> = {
  unverified: '안 돌려 보고 됐다고 함',
  overreach: '시키지 않은 것까지 고침',
  repeat: '같은 실수를 또 함',
  ignored: '말한 걸 안 지킴',
  'made-up': '없는 걸 지어냄',
  'test-dodge': '테스트를 지우거나 건너뜀',
  'wrong-spot': '엉뚱한 데를 고침',
  risky: '묻지 않고 위험한 걸 함',
  wordy: '말이 너무 김',
  stuck: '같은 데서 맴돎',
  other: '그 밖의 실수',
  just: '그냥 때림',
}

export const kindSystem = 'Claude Code 사용자가 Claude를 때린 이유를 정해진 유형 하나로 고르는 도우미다. 유형 id 하나만 답한다.'

export const kindPrompt = (reason: string): string =>
  [
    '아래 이유에 가장 가까운 유형의 id 하나만 답한다.',
    'Claude의 답이나 행동에서 마음에 안 든 점을 짚는 말이면(말투 · 언어 · 이름 · 내용도 포함) 잘못 유형 가운데서 고르고, 딱 맞는 게 없으면 other.',
    'Claude가 한 일을 짚지 않는 장난 · 놀림 · 애칭 · 심심풀이 · 화풀이만 just. 예: "돼지야" → just, "왜 영어로 말해" → other',
    ...Object.entries(BONK_KINDS).map(([kind, label]) => `${kind}: ${label}`),
    '',
    `이유: ${reason}`,
  ].join('\n')

export const parseKind = (text: string): string | null => {
  const word = /[a-z][a-z-]*/.exec(text.trim().toLowerCase())?.[0] ?? ''
  return Object.hasOwn(BONK_KINDS, word) ? word : null
}

const KIND_WORDS: readonly (readonly [string, RegExp])[] = [
  ['test-dodge', /테스트.*(지우|지웠|건너|스킵|skip|주석)/i],
  ['unverified', /(안\s*돌려|돌려\s*보지|확인\s*(도\s*)?안|됐다고|된다고|검증)/],
  ['overreach', /(시키지\s*않|안\s*시킨|멋대로|마음대로|건드리지)/],
  ['made-up', /(지어|없는\s*걸|거짓|환각)/],
  ['wrong-spot', /(엉뚱|다른\s*파일|딴\s*데)/],
  ['risky', /(위험|날렸|force|강제|rm\s|묻지\s*(도\s*)?않|물어보지\s*(도\s*)?않)/i],
  ['wordy', /(길어|장황|너무\s*길|말이\s*많)/],
  ['stuck', /(맴돌|맴도|루프|빙빙)/],
  ['ignored', /(말\s*(을\s*)?안\s*들|안\s*지키|무시|하지\s*말)/],
  ['repeat', /(또|같은\s*실수|반복|몇\s*번)/],
]

const BLAME = /(왜|잘못|틀리|틀렸|실수|안\s*되|안\s*돼|못\s*하|못\s*했|버그|에러|오류|고쳐|하지\s*마|이상하|엉망|제대로)/

export const guessKind = (reason: string): string => {
  const text = reason.trim()
  return KIND_WORDS.find(([, pattern]) => pattern.test(text))?.[0] ?? (BLAME.test(text) ? 'other' : 'just')
}

export const MEMORY_ASK = '예전에도 같은 이유로 맞은 적이 있어. 앞으로도 지켜야 할 거면 auto memory에 피드백으로 남겨 줘. CLAUDE.md에는 쓰지 말고, 비슷한 메모가 이미 있으면 새로 만들지 말고 그걸 고쳐 줘.'
