import type { TokoCounts, TokoRoom, TokoWallet } from '../../types'

import type { RoomSet, RoomSpot, ShopItem } from './economy'
import { SHOP, shopItem } from './economy'

export type RoomSlot = 'wall-left' | 'wall-right' | 'floor-1' | 'floor-2' | 'floor-3' | 'floor-4' | 'rug' | 'wallpaper' | 'flooring'

export const ROOM_SLOTS: readonly { id: RoomSlot; spot: RoomSpot; label: string }[] = [
  { id: 'wall-left', spot: 'wall', label: '왼쪽 벽' },
  { id: 'wall-right', spot: 'wall', label: '오른쪽 벽' },
  { id: 'floor-1', spot: 'floor', label: '왼쪽 구석' },
  { id: 'floor-2', spot: 'floor', label: '왼쪽 바닥' },
  { id: 'floor-3', spot: 'floor', label: '오른쪽 바닥' },
  { id: 'floor-4', spot: 'floor', label: '오른쪽 구석' },
  { id: 'rug', spot: 'rug', label: '가운데 러그' },
  { id: 'wallpaper', spot: 'wallpaper', label: '벽지' },
  { id: 'flooring', spot: 'flooring', label: '바닥재' },
]

const LEGACY_SLOTS: Readonly<Record<string, RoomSlot>> = { plant: 'floor-1', lamp: 'floor-4', rug: 'rug' }

export const isRoomSlot = (value: string): value is RoomSlot => ROOM_SLOTS.some(slot => slot.id === value)

export const slotLabel = (slot: RoomSlot): string => ROOM_SLOTS.find(entry => entry.id === slot)?.label ?? slot

const spotOf = (slot: RoomSlot): RoomSpot | undefined => ROOM_SLOTS.find(entry => entry.id === slot)?.spot

export const isRoomItem = (item: ShopItem | undefined): item is ShopItem & { spot: RoomSpot } => item?.kind === 'room' && item.spot !== undefined

const fits = (id: string, slot: RoomSlot): boolean => {
  const item = shopItem(id)
  return isRoomItem(item) && item.spot === spotOf(slot)
}

export const layoutOf = (wallet: TokoWallet): TokoRoom =>
  wallet.room ?? Object.fromEntries(Object.entries(LEGACY_SLOTS).filter(([id]) => wallet.items.includes(id)).map(([id, slot]) => [slot, id]))

const withLayout = (wallet: TokoWallet, layout: TokoRoom): TokoWallet => ({ ...wallet, room: layout })

const without = (layout: TokoRoom, id: string): TokoRoom => Object.fromEntries(Object.entries(layout).filter(([, placed]) => placed !== id))

export const ownedRoomItems = (wallet: TokoWallet): readonly ShopItem[] => SHOP.filter(item => isRoomItem(item) && wallet.items.includes(item.id))

export const storedRoomItems = (wallet: TokoWallet): readonly ShopItem[] => {
  const placed = Object.values(layoutOf(wallet))
  return ownedRoomItems(wallet).filter(item => !placed.includes(item.id))
}

export type Placement = { wallet: TokoWallet; slot: RoomSlot } | { reason: string }

export const placeItem = (wallet: TokoWallet, id: string, slot?: RoomSlot): Placement => {
  const item = shopItem(id)
  if (!isRoomItem(item)) {
    return { reason: '방에 놓는 물건이 아니야' }
  }
  if (!wallet.items.includes(id)) {
    return { reason: `${item.name}은(는) 아직 없어` }
  }
  const layout = without(layoutOf(wallet), id)
  const fitting = ROOM_SLOTS.filter(entry => entry.spot === item.spot).map(entry => entry.id)
  const target = slot ?? fitting.find(candidate => layout[candidate] === undefined) ?? fitting[0]
  if (target === undefined || !fits(id, target)) {
    return { reason: `${item.name}은(는) ${slot === undefined ? '놓을 자리가 없어' : `${slotLabel(slot)}에 안 맞아`}` }
  }
  return { wallet: withLayout(wallet, { ...layout, [target]: id }), slot: target }
}

export const autoPlace = (wallet: TokoWallet, id: string): Placement => {
  const item = shopItem(id)
  const layout = layoutOf(wallet)
  const free = ROOM_SLOTS.find(entry => isRoomItem(item) && entry.spot === item.spot && layout[entry.id] === undefined)
  return free === undefined ? { reason: '빈자리가 없어 창고에 넣었어' } : placeItem(wallet, id, free.id)
}

export const storeItem = (wallet: TokoWallet, id: string): TokoWallet => withLayout(wallet, without(layoutOf(wallet), id))

export const cycleSlot = (wallet: TokoWallet, slot: RoomSlot): { wallet: TokoWallet; placed: string | null } => {
  const candidates = ownedRoomItems(wallet)
    .filter(item => fits(item.id, slot))
    .map(item => item.id)
  const current = layoutOf(wallet)[slot]
  const next = candidates[current === undefined ? 0 : candidates.indexOf(current) + 1]
  const cleared = withLayout(wallet, Object.fromEntries(Object.entries(layoutOf(wallet)).filter(([at]) => at !== slot)))
  if (next === undefined) {
    return { wallet: cleared, placed: null }
  }
  const placed = placeItem(cleared, next, slot)
  return 'reason' in placed ? { wallet: cleared, placed: null } : { wallet: placed.wallet, placed: next }
}

export const SOUVENIRS: readonly ShopItem[] = SHOP.filter(item => item.souvenir !== undefined)

export const newSouvenirs = (counts: TokoCounts, wallet: TokoWallet): readonly ShopItem[] =>
  SOUVENIRS.filter(item => item.souvenir !== undefined && !wallet.items.includes(item.id) && (counts[item.souvenir.stat] ?? 0) >= item.souvenir.need)

export const ROOM_SETS: Readonly<Record<RoomSet, string>> = { forest: '숲', cafe: '카페', space: '우주', sea: '바다' }

const setItems = (set: RoomSet): readonly ShopItem[] => SHOP.filter(item => item.set === set)

export const completedSets = (layout: TokoRoom): readonly RoomSet[] => {
  const placed = Object.values(layout)
  return (Object.keys(ROOM_SETS) as RoomSet[]).filter(set => setItems(set).every(item => placed.includes(item.id)))
}

export const COZY_STEP = 0.05

export const cozinessOf = (layout: TokoRoom): number => Math.max(0.5, 1 - COZY_STEP * Object.keys(layout).length)

export const furnitureText = (wallet: TokoWallet): string => {
  const decor = SHOP.filter(isRoomItem)
  const owned = decor.filter(item => wallet.items.includes(item.id))
  const sets = (Object.keys(ROOM_SETS) as RoomSet[]).map(set => {
    const items = setItems(set)
    const have = items.filter(item => wallet.items.includes(item.id)).length
    return `${ROOM_SETS[set]} ${have}/${items.length}${have === items.length ? ' ✦' : ''}`
  })
  return `가구 도감 ${owned.length}/${decor.length} · ${sets.join(' · ')} · 별조각 ${wallet.stars ?? 0}개`
}
