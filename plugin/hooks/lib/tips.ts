export type TipDef = { id: string; line: string; fill: string; filled: string }

export const TIPS: Readonly<Record<string, TipDef>> = {
  compact: { id: 'compact', line: '컨텍스트가 80% 넘었어. /compact 로 요약해서 비울래?', fill: '/compact', filled: '입력창에 /compact 넣어 뒀어. 엔터 누르면 돼' },
  permissions: { id: 'permissions', line: '같은 확인을 세 번째 눌렀어. /permissions 에 규칙으로 넣을래?', fill: '/permissions', filled: '입력창에 /permissions 넣어 뒀어. 허용 규칙을 더하면 다시 안 물어봐' },
  rewind: { id: 'rewind', line: '되돌리고 싶으면 /rewind 로 아까 시점에 돌아갈 수 있어', fill: '/rewind', filled: '입력창에 /rewind 넣어 뒀어. 돌아갈 시점을 고르면 돼' },
  init: { id: 'init', line: '이 레포엔 CLAUDE.md가 없네. /init 으로 만들어 볼래?', fill: '/init', filled: '입력창에 /init 넣어 뒀어. Claude가 레포를 읽고 안내서를 써 줘' },
  loop: { id: 'loop', line: '같은 확인을 계속 부탁하네. /loop 로 맡겨 볼래?', fill: '/loop 5m ', filled: '/loop 5m 뒤에 맡길 확인을 써서 보내. 5분마다 대신 돌려 줘' },
  'code-review': { id: 'code-review', line: '커밋했네! 푸시 전에 /code-review 한 번 돌려 볼래?', fill: '/code-review', filled: '입력창에 /code-review 넣어 뒀어. 엔터 누르면 리뷰가 시작돼' },
}

export const KNOWN = 'known'

export const COMPACT_TIP_PERCENT = 80

export const PERMISSION_TIP_ASKS = 3

export const CHECK_TIP_PROMPTS = 3

export const CHECK_TIP_WINDOW_MS = 60 * 60_000

const CHECK = /(다시|또|한\s*번\s*더)\s*(확인|체크|봐)|상태\s*(확인|봐|어때)|끝났(어|나|니)|다\s*됐(어|나|니)|어떻게\s*됐|check\s+(again|status)|\bstatus\b/i

export const isCheckPrompt = (text: string): boolean => text.length <= 60 && CHECK.test(text)

export const permissionKey = (tool: string, input: unknown): string => {
  const command = typeof input === 'object' && input !== null ? (input as { command?: unknown }).command : undefined
  return tool === 'Bash' && typeof command === 'string' ? `Bash:${command.trim().split(/\s+/)[0] ?? ''}` : tool
}

export type Tips = Readonly<Record<string, string>>

export const asTips = (value: unknown): Tips =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => TIPS[entry[0]] !== undefined && typeof entry[1] === 'string'))
    : {}

export const isTipWanted = (tips: Tips, id: string, day: string, isUsed: boolean): boolean => TIPS[id] !== undefined && !isUsed && tips[id] !== KNOWN && tips[id] !== day
