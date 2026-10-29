import type { TokoBubblePart, TokoSpecies } from '../../types'

import { SPECIES_VOICE, voiceLine } from './persona'
import { HOUR, MINUTE } from './time'

export type PeerSignal = {
  kind: 'idle' | 'working' | 'done' | 'waiting'
  at: number
  label: string
  since?: number
  aliveAt?: number
  prompt?: string
  path?: string
  turnStartedAt?: number
}

export type PeerMessage = { text: string; from: string; at: number; replyTo?: string }

export type Peer = { key: string; signal: PeerSignal }

export const ALIVE_MS = 3 * MINUTE
const PROMPTS_IN_EXCERPT = 4
const PROMPT_LENGTH = 300
const ANSWER_LENGTH = 1500
const REPLY_LINES = 6
const REPLY_LENGTH = 400

const LABEL_LENGTH = 24

export const signalLabel = (prompt: string): string => [...prompt.replace(/\s+/g, ' ').trim()].slice(0, LABEL_LENGTH).join('').trim()

export const lastAiTitle = (lines: string): string => {
  for (const line of lines.split('\n').reverse()) {
    try {
      const record = JSON.parse(line) as { aiTitle?: unknown }
      if (typeof record.aiTitle === 'string' && record.aiTitle.trim() !== '') {
        return signalLabel(record.aiTitle)
      }
    } catch {}
  }
  return ''
}

export const isSignal = (value: unknown): value is PeerSignal => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const raw = value as Record<string, unknown>
  return (raw.kind === 'idle' || raw.kind === 'working' || raw.kind === 'done' || raw.kind === 'waiting') && typeof raw.at === 'number' && typeof raw.label === 'string'
}

export const isMessage = (value: unknown): value is PeerMessage => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const raw = value as Record<string, unknown>
  return typeof raw.text === 'string' && raw.text.trim() !== '' && typeof raw.from === 'string' && typeof raw.at === 'number'
}

export const isAlive = (signal: PeerSignal, now: number): boolean => now - (signal.aliveAt ?? signal.at) < ALIVE_MS

export const freshSignal = (entries: readonly { key: string; value: unknown }[], ownKey: string, seenAt: number): PeerSignal | null =>
  entries
    .filter(entry => entry.key !== ownKey)
    .map(entry => entry.value)
    .filter(isSignal)
    .filter(signal => (signal.kind === 'done' || signal.kind === 'waiting') && signal.at > seenAt)
    .reduce<PeerSignal | null>((latest, signal) => (latest === null || signal.at > latest.at ? signal : latest), null)

export const peerList = (entries: readonly { key: string; value: unknown }[], ownKey: string, now: number): readonly Peer[] =>
  entries
    .filter(entry => entry.key !== ownKey)
    .flatMap(entry => (isSignal(entry.value) && isAlive(entry.value, now) ? [{ key: entry.key, signal: entry.value }] : []))
    .sort((a, b) => (a.signal.since ?? a.signal.at) - (b.signal.since ?? b.signal.at))

const span = (ms: number): string => (ms < HOUR ? `${Math.max(1, Math.floor(ms / MINUTE))}분` : `${Math.floor(ms / HOUR)}시간`)

const labelName = (label: string): string => `「${label === '' ? '이름 없는 세션' : label}」`

export const sessionName = (signal: PeerSignal): string => labelName(signal.label)

export const sessionLine = (signal: PeerSignal, now: number): string => {
  switch (signal.kind) {
    case 'idle':
      return `${sessionName(signal)} 대기 중`
    case 'working':
      return `${sessionName(signal)} 작업 중 · ${span(now - (signal.turnStartedAt ?? signal.at))}째`
    case 'waiting':
      return `${sessionName(signal)} 허락 대기 · ${span(now - signal.at)}째`
    case 'done':
      return `${sessionName(signal)} 끝남 · ${span(now - signal.at)} 전`
  }
}

export const sessionsText = (peers: readonly Peer[], now: number): string =>
  peers.length === 0
    ? '옆 세션이 없어요.'
    : [
        `옆 세션 ${peers.length}개`,
        ...peers.flatMap(({ signal }, index) => [`${index + 1}. ${sessionLine(signal, now)}`, ...(signal.prompt === undefined || signal.prompt === '' ? [] : [`   마지막 질문: ${signal.prompt}`])]),
        '/toko sessions <이름|번호> 요약 · /toko send <이름|번호> <내용> 보내기',
      ].join('\n')

export const matchPeers = (peers: readonly Peer[], query: string): readonly Peer[] => {
  if (/^\d+$/.test(query)) {
    const peer = peers[Number(query) - 1]
    return peer === undefined ? [] : [peer]
  }
  const needle = query.toLowerCase()
  return peers.filter(({ signal }) => signal.label.toLowerCase().includes(needle))
}

const SEND_WORDS = /^(\S+?)(?:\s+세션)?(?:한테|에게|에)\s+([\s\S]+?)\s*(?:보내\s*줘|보내|전해\s*줘|전해)[\s.!~]*$/

export const parseSendWords = (words: string): { query: string; text: string } | null => {
  const match = SEND_WORDS.exec(words.trim())
  const query = match?.[1]
  const text = match?.[2]?.replace(/(줘|요|해|다|까|자)\s*이?라고$/, '$1').trim() ?? ''
  return query === undefined || text === '' ? null : { query, text }
}

export const sendTarget = (peers: readonly Peer[], peer: Peer): string =>
  peer.signal.label
    .split(/\s+/)
    .filter(word => word !== '')
    .find(word => {
      const matches = matchPeers(peers, word)
      return matches.length === 1 && matches[0]?.key === peer.key
    }) ?? String(peers.findIndex(candidate => candidate.key === peer.key) + 1)

export const missText = (matches: readonly Peer[]): string =>
  matches.length === 0
    ? '그런 옆 세션이 없어요. /toko sessions 로 이름과 번호를 확인해 주세요.'
    : `${matches.map(({ signal }) => sessionName(signal)).join(', ')} 중 어느 세션인지 모르겠어요. 이름을 더 쓰거나 번호로 골라 주세요.`

const clip = (text: string, length: number): string => [...text.trim()].slice(0, length).join('')

export const replyLines = (from: string, answer: string): string[] => {
  const whole = answer.trim()
  const lines = whole.split('\n').filter(line => line.trim() !== '')
  const head = clip(lines.slice(0, REPLY_LINES).join('\n'), REPLY_LENGTH)
  const isCut = head !== lines.join('\n')
  return [`${labelName(from)} 답`, ...head.split('\n'), ...(isCut ? [`…(${[...whole].length.toLocaleString('en-US')}자 중 앞부분 · 전체는 그 세션에서)`] : [])]
}

const recordOf = (line: string): Record<string, unknown> | null => {
  try {
    const record: unknown = JSON.parse(line)
    return typeof record === 'object' && record !== null && !Array.isArray(record) ? (record as Record<string, unknown>) : null
  } catch {
    return null
  }
}

const promptOf = (record: Record<string, unknown>): string | null => {
  const content = (record.message as { content?: unknown } | undefined)?.content
  return record.type === 'user' && record.isMeta !== true && typeof content === 'string' && !content.startsWith('<') && content.trim() !== '' ? content : null
}

const answerOf = (record: Record<string, unknown>): string | null => {
  const content = (record.message as { content?: unknown } | undefined)?.content
  if (record.type !== 'assistant' || !Array.isArray(content)) {
    return null
  }
  const text = content
    .flatMap(part => ((part as { type?: unknown }).type === 'text' && typeof (part as { text?: unknown }).text === 'string' ? [(part as { text: string }).text] : []))
    .join('\n')
    .trim()
  return text === '' ? null : text
}

export const transcriptExcerpt = (tail: string): string => {
  const records = tail.split('\n').flatMap(line => {
    const record = recordOf(line)
    return record === null ? [] : [record]
  })
  const prompts = records.flatMap(record => {
    const prompt = promptOf(record)
    return prompt === null ? [] : [clip(prompt, PROMPT_LENGTH)]
  })
  const answer = records.map(answerOf).filter(text => text !== null).at(-1)
  if (prompts.length === 0 && answer === undefined) {
    return ''
  }
  return [
    '[사용자 질문]',
    ...prompts.slice(-PROMPTS_IN_EXCERPT).map(prompt => `- ${prompt}`),
    ...(answer === undefined ? [] : ['[Claude 마지막 답]', clip(answer, ANSWER_LENGTH)]),
  ].join('\n')
}

const subjectParts = (label: string, fallback: string, particle: string): readonly TokoBubblePart[] =>
  label === '' ? [{ text: fallback }] : [{ text: '「' }, { text: label, color: 'suggestion' }, { text: `」${particle}` }]

const voiced = (species: TokoSpecies, subject: readonly TokoBubblePart[], said: string, color?: string): readonly TokoBubblePart[] => {
  const voice = SPECIES_VOICE[species]
  const isHead = voice.place === 'head'
  const text = isHead ? said : voiceLine(species, said)
  const verb: TokoBubblePart = color === undefined ? { text } : { text, color }
  return isHead ? [{ text: `${voice.sound} ` }, ...subject, verb] : [...subject, verb]
}

export const signalParts = (signal: PeerSignal, species: TokoSpecies): readonly TokoBubblePart[] =>
  signal.kind === 'waiting'
    ? voiced(species, subjectParts(signal.label, '다른 세션이 ', ' '), '확인을 기다려', 'warning')
    : voiced(species, subjectParts(signal.label, '다른 세션이 ', ' '), '끝났어')

export const inboxParts = (from: string, species: TokoSpecies): readonly TokoBubblePart[] =>
  voiced(species, [...subjectParts(from, '옆 세션', ''), { text: '에서 할 일이 왔어. ' }], '바로 보냈어')
