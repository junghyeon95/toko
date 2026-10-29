import type { TokoBoss } from '../../types'

import { hashText } from './random'

export const BOSS_STREAK = 3

export const BOSS_REWARD = 20

export const BOSS_LIFE_MS = 60 * 60_000

const BOSS_NAMES = ['버그 대왕', '빨간불 골렘', '실패 슬라임', '에러 드래곤', '널 포인터 유령']

const COUNTS: readonly RegExp[] = [
  /test result: FAILED\.\s+\d+ passed;\s+(\d+) failed/i,
  /(\d+)\s+failed\b/i,
  /(\d+)\s+failing\b/i,
  /(\d+)\s+failures?\b/i,
]

export const failedCount = (text: string): number | null => {
  for (const pattern of COUNTS) {
    const matches = [...text.matchAll(new RegExp(pattern.source, `${pattern.flags}g`))]
    const count = Number(matches.at(-1)?.[1])
    if (Number.isInteger(count) && count > 0) {
      return count
    }
  }
  const goFails = text.split('\n').filter(line => line.trim().startsWith('--- FAIL:')).length
  return goFails > 0 ? goFails : null
}

export const bossName = (key: string): string => BOSS_NAMES[hashText(key) % BOSS_NAMES.length] ?? '버그 대왕'

export const meetBoss = (boss: TokoBoss | null, key: string, failed: number | null, now: number): TokoBoss => {
  if (boss === null || boss.key !== key) {
    return { key, name: bossName(key), hp: failed, maxHp: failed, at: now }
  }
  return { ...boss, hp: failed, maxHp: failed === null ? boss.maxHp : Math.max(boss.maxHp ?? failed, failed) }
}

export const hpBar = (boss: TokoBoss): string => {
  if (boss.hp === null || boss.maxHp === null) {
    return '■■■■■'
  }
  const filled = Math.max(1, Math.round((boss.hp / Math.max(1, boss.maxHp)) * 5))
  return `${'■'.repeat(filled)}${'□'.repeat(5 - filled)} ${boss.hp}/${boss.maxHp}`
}

export const bossStatus = (boss: TokoBoss): string => `보스 ${boss.name} ${hpBar(boss)}`
