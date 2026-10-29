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

export const MEMORY_ASK = '예전에도 같은 이유로 맞은 적이 있어. 앞으로도 지켜야 할 거면 auto memory에 피드백으로 남겨 줘. CLAUDE.md에는 쓰지 말고, 비슷한 메모가 이미 있으면 새로 만들지 말고 그걸 고쳐 줘.'
