import type { TokoBubblePart, TokoSpecies } from '../../types'

import { SPECIES_VOICE, voiceLine } from './persona'

export type PeerSignal = { kind: 'done' | 'waiting'; at: number; label: string }

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
  return (raw.kind === 'done' || raw.kind === 'waiting') && typeof raw.at === 'number' && typeof raw.label === 'string'
}

export const freshSignal = (entries: readonly { key: string; value: unknown }[], ownKey: string, seenAt: number): PeerSignal | null =>
  entries
    .filter(entry => entry.key !== ownKey)
    .map(entry => entry.value)
    .filter(isSignal)
    .filter(signal => signal.at > seenAt)
    .reduce<PeerSignal | null>((latest, signal) => (latest === null || signal.at > latest.at ? signal : latest), null)

export const signalParts = (signal: PeerSignal, species: TokoSpecies): readonly TokoBubblePart[] => {
  const voice = SPECIES_VOICE[species]
  const isHead = voice.place === 'head'
  const said = signal.kind === 'done' ? '끝났어' : '확인을 기다려'
  const text = isHead ? said : voiceLine(species, said)
  const verb: TokoBubblePart = signal.kind === 'done' ? { text } : { text, color: 'warning' }
  const subject: readonly TokoBubblePart[] = signal.label === '' ? [{ text: '다른 세션이 ' }] : [{ text: '「' }, { text: signal.label, color: 'suggestion' }, { text: '」 ' }]
  return isHead ? [{ text: `${voice.sound} ` }, ...subject, verb] : [...subject, verb]
}
