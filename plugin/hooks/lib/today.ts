import type { TokoTally } from '../../types'

import { countOf } from './stats'
import { weekdayOf } from './time'

const prLine = (notes: readonly string[]): string | null => {
  const latest = new Map<string, string>()
  for (const note of notes) {
    const match = /^PR (#\d+) (.+)$/.exec(note)
    if (match?.[1] !== undefined && match[2] !== undefined) {
      latest.delete(match[1])
      latest.set(match[1], match[2])
    }
  }
  return latest.size === 0 ? null : `PR ${[...latest].map(([number, action]) => `${number} ${action}`).join(', ')}`
}

const joined = (parts: readonly (string | null)[]): string | null => {
  const kept = parts.filter((part): part is string => part !== null)
  return kept.length === 0 ? null : kept.join(' · ')
}

const dateLabel = (now: number): string => {
  const date = new Date(now)
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekdayOf(now)})`
}

const times = (count: number, label: string, unit = '번'): string | null => (count > 0 ? `${label} ${count}${unit}` : null)

export const todayText = (tally: TokoTally, now: number, memos: number): string => {
  const count = (key: string): number => countOf(tally.counts, key)
  const lines = [
    joined([times(count('commit'), '커밋'), times(count('push'), '푸시'), times(count('merge'), 'PR 머지')]),
    prLine(tally.notes),
    joined([times(count('test-pass'), '테스트 통과'), times(count('test-fail'), '실패')]),
    count('added') + count('removed') > 0 ? `코드 +${count('added')} / -${count('removed')}줄` : null,
    joined([times(count('turn'), 'Claude 턴'), tally.costUsd > 0 ? `비용 $${tally.costUsd.toFixed(2)}` : null]),
    joined([times(count('break'), '휴식'), times(count('focus'), '집중')]),
    memos > 0 ? `남은 메모 ${memos}개` : null,
  ].filter((line): line is string => line !== null)
  return [`${dateLabel(now)} 토코 기록`, ...(lines.length === 0 ? ['아직 남은 기록이 없어요'] : lines).map(line => `- ${line}`)].join('\n')
}

export type WorkedTurn = { prompt: string; answer: string }

export type WorkedSession = { day: string; label: string; since: number; turns: readonly WorkedTurn[] }

const TURN_PROMPT_LENGTH = 120
const TURN_ANSWER_LENGTH = 240
const MAX_TURNS = 24

const clip = (text: string, length: number): string => [...text.replace(/\s+/g, ' ').trim()].slice(0, length).join('')

export const isWorked = (value: unknown): value is WorkedSession => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const raw = value as Record<string, unknown>
  return typeof raw.day === 'string' && typeof raw.label === 'string' && typeof raw.since === 'number' && Array.isArray(raw.turns)
}

export const addTurn = (session: WorkedSession, prompt: string, answer: string): WorkedSession => ({
  ...session,
  turns: [...session.turns, { prompt: clip(prompt, TURN_PROMPT_LENGTH), answer: clip(answer, TURN_ANSWER_LENGTH) }].slice(-MAX_TURNS),
})

const sectionOf = (line: string): 'done' | 'ongoing' | null => (line === '한 일' ? 'done' : line === '진행 중' ? 'ongoing' : null)

export const workText = (now: number, sessions: readonly WorkedSession[], reply: string | null): string => {
  const header = `${dateLabel(now)} 한 일`
  if (sessions.length === 0) {
    return `${header}\n- 아직 기록된 일이 없어요`
  }
  const picked = { done: [] as string[], ongoing: [] as string[] }
  let section: 'done' | 'ongoing' | null = null
  for (const line of (reply ?? '').split('\n').map(row => row.trim())) {
    section = sectionOf(line.replace(/^#+\s*/, '')) ?? section
    if (section !== null && line.startsWith('- ') && line.length > 2) {
      picked[section].push(line)
    }
  }
  if (picked.done.length + picked.ongoing.length === 0) {
    const fallback = sessions.map(session => `- 「${session.label || '이름 없는 세션'}」 ${session.turns.at(-1)?.prompt ?? ''}`.trim())
    return [header, ...fallback, '(작은 모델을 쓸 수 없어서 세션별 마지막 질문만 보여요)'].join('\n')
  }
  return [header, ...picked.done, ...(picked.ongoing.length === 0 ? [] : ['진행 중', ...picked.ongoing])].join('\n')
}
