import type { TokoNews, TokoNewsPick } from '../../types'

import { extractJson } from './persona'

export const CHANGELOG_URL = 'https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md'

export const FIRST_LOOKBACK = 5

export const MAX_ADDITIONS = 30

export const NEWS_HISTORY = 10

export const NEWS_LATER_MS = 30 * 60_000

export const EMPTY_NEWS: TokoNews = { seen: '', pick: null, shownAt: 0, notBefore: 0, picks: [] }

export type Release = { version: string; added: readonly string[] }

export type Addition = { version: string; text: string }

const HEADING = /^##\s+v?(\d+(?:\.\d+)+)\s*$/

const ADDED = /^-\s+Added\b/

const SETUP_ONLY = /OpenTelemetry|^-\s+Added `(CLAUDE_CODE|ANTHROPIC|OTEL)_/

const COMMAND = /^\/[a-z][\w:-]*$/i

export const compareVersions = (a: string, b: string): number => {
  const left = a.split('.').map(Number)
  const right = b.split('.').map(Number)
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0)
    if (diff !== 0) {
      return Math.sign(diff)
    }
  }
  return 0
}

export const parseChangelog = (text: string): readonly Release[] =>
  text.split('\n').reduce<Release[]>((releases, line) => {
    const heading = HEADING.exec(line.trim())
    if (heading?.[1] !== undefined) {
      return [...releases, { version: heading[1], added: [] }]
    }
    const last = releases.at(-1)
    if (last === undefined || !ADDED.test(line) || SETUP_ONLY.test(line)) {
      return releases
    }
    return [...releases.slice(0, -1), { ...last, added: [...last.added, line.replace(/^-\s+/, '').trim()] }]
  }, [])

export const freshAdditions = (releases: readonly Release[], seen: string, current: string): readonly Addition[] => {
  const known = releases.filter(release => compareVersions(release.version, current) <= 0)
  const fresh = seen === '' ? known.slice(0, FIRST_LOOKBACK) : known.filter(release => compareVersions(release.version, seen) > 0)
  return fresh.flatMap(release => release.added.map(text => ({ version: release.version, text }))).slice(0, MAX_ADDITIONS)
}

export const newsSystem = 'Claude Code의 새 기능을 쉬운 한국어로 골라 소개하는 도우미다. JSON 한 줄로만 답한다.'

export const newsPrompt = (additions: readonly Addition[]): string =>
  [
    'Claude Code가 업데이트되며 새로 생긴 기능 목록이다. 줄마다 "번호. [버전] 영어 원문"이다.',
    '터미널에서 Claude Code로 코딩하는 개발자 누구에게나 쓸모 있는 기능을 하나만 고른다.',
    '클라우드 세션, 회사·관리자 설정, 텔레메트리, SDK나 -p 실행, 플러그인·모드 개발, 특정 클라우드 업체 전용 기능은 고르지 않는다. 고를 게 없으면 pick을 -1로 한다.',
    '고른 기능은 친구에게 알려 주듯 쉬운 한국어 반말로 풀어 쓴다. 영어 용어는 꼭 필요한 것만 남기고 뜻을 풀어 쓴다.',
    '답 형식: {"pick":번호,"title":"명령이 있으면 그 명령만(예: /compact), 없으면 짧은 기능 이름(20자 이내)","what":"무엇을 해 주는지 한 문장(70자 이내)","when":"이럴 때 써 보라는 한 문장(50자 이내)","try":"바로 해 볼 슬래시 명령. 없으면 빈 문자열"}',
    '',
    ...additions.map((addition, index) => `${index}. [${addition.version}] ${addition.text}`),
  ].join('\n')

const clean = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') {
    return null
  }
  const text = value.replace(/\s+/g, ' ').trim()
  return text.length === 0 ? null : [...text].slice(0, max).join('')
}

export const parseNews = (text: string, additions: readonly Addition[]): TokoNewsPick | 'none' | null => {
  const json = extractJson(text)
  if (json === null || typeof json.pick !== 'number') {
    return null
  }
  if (json.pick < 0) {
    return 'none'
  }
  const addition = additions[Math.floor(json.pick)]
  const title = clean(json.title, 30)
  const what = clean(json.what, 100)
  if (addition === undefined || title === null || what === null) {
    return null
  }
  const tryIt = clean(json.try, 40) ?? ''
  return { version: addition.version, title, what, when: clean(json.when, 80) ?? '', tryIt: COMMAND.test(tryIt) ? tryIt : '', source: addition.text }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const isPick = (value: unknown): value is TokoNewsPick =>
  isRecord(value) && typeof value.version === 'string' && typeof value.title === 'string' && typeof value.what === 'string' && typeof value.when === 'string' && typeof value.tryIt === 'string' && typeof value.source === 'string'

const time = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0)

export const asNews = (value: unknown): TokoNews =>
  isRecord(value)
    ? {
        seen: typeof value.seen === 'string' ? value.seen : '',
        pick: isPick(value.pick) ? value.pick : null,
        shownAt: time(value.shownAt),
        notBefore: time(value.notBefore),
        picks: Array.isArray(value.picks) ? value.picks.filter(isPick).slice(-NEWS_HISTORY) : [],
      }
    : EMPTY_NEWS

export const withPick = (news: TokoNews, seen: string, pick: TokoNewsPick | null): TokoNews => ({
  seen,
  pick,
  shownAt: 0,
  notBefore: 0,
  picks: pick === null ? news.picks : [...news.picks.filter(old => old.version !== pick.version || old.title !== pick.title), pick].slice(-NEWS_HISTORY),
})

export const isNewsDue = (news: TokoNews, now: number): boolean => news.pick !== null && news.shownAt === 0 && now >= news.notBefore

export const newsLine = (pick: TokoNewsPick): string => `Claude Code ${pick.version}에 새 기능이 생겼어: ${pick.title}. 들어 볼래?`

export const newsDetail = (pick: TokoNewsPick): readonly string[] => [
  `Claude Code ${pick.version} 새 기능 · ${pick.title}`,
  pick.what,
  ...(pick.when === '' ? [] : [`이럴 때: ${pick.when}`]),
  ...(pick.tryIt === '' ? [] : [`해 보기: ${pick.tryIt}`]),
  `원문: ${pick.source}`,
]

export const newsText = (news: TokoNews): string =>
  news.picks.length === 0
    ? '아직 소개한 새 기능이 없어요. Claude Code가 업데이트되면 새로 생긴 기능을 하나씩 알려 줄게요.'
    : [
        'Claude Code 새 기능 소개 (최근 순)',
        ...[...news.picks].reverse().map(pick => `· ${pick.version} ${pick.title}: ${pick.what}${pick.tryIt === '' ? '' : ` (해 보기: ${pick.tryIt})`}`),
      ].join('\n')
