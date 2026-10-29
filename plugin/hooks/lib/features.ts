import type { TokoFeature } from '../../types'

export type FeatureDef = { id: string; name: string; how: string; hint: string }

export const FEATURES: readonly FeatureDef[] = [
  { id: 'compact', name: '대화 줄이기', how: '/compact', hint: '대화가 길어져 컨텍스트가 찼을 때 요약해서 비워요' },
  { id: 'clear', name: '새로 시작', how: '/clear', hint: '주제가 바뀌면 대화를 깨끗하게 비우고 시작해요' },
  { id: 'resume', name: '이어 하기', how: '/resume', hint: '닫았던 대화를 골라 이어서 해요. 셸에서는 claude -c' },
  { id: 'rewind', name: '되감기', how: '/rewind', hint: '코드와 대화를 아까 시점으로 되돌려요. Esc 두 번도 같아요' },
  { id: 'init', name: 'CLAUDE.md 만들기', how: '/init', hint: '레포를 읽고 Claude가 매번 읽을 안내서를 만들어요' },
  { id: 'memory', name: '메모리 보기', how: '/memory', hint: 'Claude가 기억하는 규칙과 메모를 보고 고쳐요' },
  { id: 'permissions', name: '허용 규칙', how: '/permissions', hint: '자주 허용하는 명령을 규칙으로 넣어 확인 창을 줄여요' },
  { id: 'model', name: '모델 바꾸기', how: '/model', hint: '일에 맞게 모델을 골라요' },
  { id: 'context', name: '컨텍스트 보기', how: '/context', hint: '컨텍스트를 무엇이 얼마나 차지하는지 봐요' },
  { id: 'rename', name: '세션 이름 짓기', how: '/rename', hint: '세션에 이름을 붙이면 탭과 /resume 목록에서 찾기 쉬워요' },
  { id: 'code-review', name: '코드 리뷰', how: '/code-review', hint: '푸시하기 전에 바뀐 코드를 리뷰받아요' },
  { id: 'loop', name: '되풀이 맡기기', how: '/loop', hint: '같은 확인을 몇 분마다 대신 돌려 줘요' },
  { id: 'plan', name: '계획 먼저', how: 'Shift+Tab', hint: '큰 작업은 plan mode로 계획부터 받아 보고 시작해요' },
  { id: 'background', name: '뒤에서 돌리기', how: 'Ctrl+B', hint: '오래 걸리는 명령을 뒤로 보내고 다른 일을 해요' },
  { id: 'image', name: '그림 붙여 넣기', how: 'Ctrl+V', hint: '화면 캡처를 붙여 넣어 보여 주면 설명이 짧아져요' },
  { id: 'mention', name: '파일 짚기', how: '@파일', hint: '@ 뒤에 파일 이름을 쓰면 그 파일을 바로 읽혀요' },
]

export const FEATURE_REWARD = 5

const COMMAND_FEATURE: Readonly<Record<string, string>> = Object.fromEntries(FEATURES.filter(def => def.how.startsWith('/')).map(def => [def.how.slice(1), def.id]))

export const featureOfCommand = (command: string): string | null => COMMAND_FEATURE[command] ?? null

export const featureOfTool = (tool: string, isBackground: boolean): string | null => (tool === 'ExitPlanMode' ? 'plan' : tool === 'Bash' && isBackground ? 'background' : null)

export const featureDef = (id: string): FeatureDef | undefined => FEATURES.find(def => def.id === id)

export type FeatureDex = Readonly<Record<string, number>>

export const asFeatureDex = (value: unknown): FeatureDex =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] => featureDef(entry[0]) !== undefined && typeof entry[1] === 'number'))
    : {}

export const mergeFeatureDex = (a: FeatureDex, b: FeatureDex): FeatureDex =>
  Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map(id => [id, Math.min(a[id] ?? Infinity, b[id] ?? Infinity)]))

export const featuresUsed = (dex: FeatureDex): number => FEATURES.filter(def => dex[def.id] !== undefined).length

export const featureViews = (dex: FeatureDex): readonly TokoFeature[] => FEATURES.map(def => ({ ...def, at: dex[def.id] ?? null }))

export const featureLine = (def: FeatureDef, used: number, reward: number): string => `기능 도감에 새로 올렸어: ${def.how} ${def.name} (${used}/${FEATURES.length}) +${reward} 코인`

export const featureText = (views: readonly TokoFeature[]): string =>
  [
    `기능 도감 ${views.filter(view => view.at !== null).length}/${views.length}`,
    ...views.map(view => (view.at === null ? `· ${view.how} ${view.name}: ${view.hint}` : `✓ ${view.how} ${view.name}`)),
    '처음 써 본 기능마다 5코인을 받아요.',
  ].join('\n')
