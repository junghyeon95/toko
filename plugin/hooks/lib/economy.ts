import type { TokoEarn, TokoWallet } from '../../types'

export const DAILY_TOKEN_CAP = 500
export const CACHE_BONUS_RATIO = 0.5
export const CACHE_BONUS = 1.2

export const HEALTH_REWARD = { breakAccepted: 15, eyeRestDone: 5, finishedOnTime: 20, breathDone: 5, plazaStretch: 10, focusDone: 10 } as const

export const SPEND = { bonk: 3, bugTicket: 10, draw: 200, dye: 10 } as const

export type TurnUsage = {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
}

export const cacheReadRatio = (usage: TurnUsage): number => {
  const total = usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens
  return total === 0 ? 0 : usage.cache_read_input_tokens / total
}

export const turnIncome = (usage: TurnUsage): number => {
  const base = 9 * Math.log2(1 + usage.output_tokens / 500)
  const bonus = cacheReadRatio(usage) >= CACHE_BONUS_RATIO ? CACHE_BONUS : 1
  return Math.round(base * bonus)
}

export const capTokenIncome = (income: number, earnedToday: number): number =>
  Math.max(0, Math.min(income, DAILY_TOKEN_CAP - earnedToday))

export const emptyEarn = (day: string): TokoEarn => ({ day, earned: 0, health: 0, spent: 0 })

export const earnBalance = (earn: TokoEarn): number => earn.earned + earn.health - earn.spent

export const isEmptyEarn = (earn: TokoEarn): boolean => earn.earned === 0 && earn.health === 0 && earn.spent === 0

export const balanceOf = (wallet: TokoWallet, earns: readonly TokoEarn[]): number =>
  wallet.coins + earns.reduce((sum, earn) => sum + earnBalance(earn), 0)

export const earnedTokenToday = (earns: readonly TokoEarn[], day: string): number =>
  earns.filter(earn => earn.day === day).reduce((sum, earn) => sum + earn.earned, 0)

export type ShopKind = 'snack' | 'hat' | 'neck' | 'face' | 'back' | 'hand' | 'room' | 'hammer' | 'pet'

export type Season = 'halloween'

export type RoomSpot = 'wall' | 'floor' | 'rug' | 'wallpaper' | 'flooring'

export type RoomSet = 'forest' | 'cafe' | 'space' | 'sea'

export type Souvenir = { stat: 'water' | 'stretch' | 'eye-rest' | 'dex' | 'badges'; need: number }

export type ShopItem = { id: string; name: string; kind: ShopKind; price: number; restores?: number; season?: Season; spot?: RoomSpot; souvenir?: Souvenir; set?: RoomSet }

export const SEASONS: Readonly<Record<Season, { from: string; to: string; item: string }>> = {
  halloween: { from: '10-24', to: '11-01', item: 'pumpkin' },
}

export const isInSeason = (season: Season, day: string): boolean => day.slice(5) >= SEASONS[season].from && day.slice(5) <= SEASONS[season].to

export const SHOP: readonly ShopItem[] = [
  { id: 'cookie', name: '토큰 쿠키', kind: 'snack', price: 5, restores: 25 },
  { id: 'rice-cake', name: '꿀떡', kind: 'snack', price: 8, restores: 40 },
  { id: 'watermelon', name: '수박 한 조각', kind: 'snack', price: 10, restores: 55 },
  { id: 'beanie', name: '털모자', kind: 'hat', price: 40 },
  { id: 'ribbon', name: '리본', kind: 'hat', price: 50 },
  { id: 'crown', name: '작은 왕관', kind: 'hat', price: 80 },
  { id: 'cap', name: '야구모자', kind: 'hat', price: 70 },
  { id: 'beret', name: '베레모', kind: 'hat', price: 70 },
  { id: 'flower', name: '꽃핀', kind: 'hat', price: 50 },
  { id: 'party', name: '고깔모자', kind: 'hat', price: 60 },
  { id: 'pumpkin', name: '호박 모자', kind: 'hat', price: 70, season: 'halloween' },
  { id: 'scarf', name: '목도리', kind: 'neck', price: 60 },
  { id: 'bowtie', name: '나비넥타이', kind: 'neck', price: 60 },
  { id: 'friend-heart', name: '반쪽 하트 목걸이', kind: 'neck', price: 60 },
  { id: 'round-glasses', name: '동그란 안경', kind: 'face', price: 70 },
  { id: 'sunglasses', name: '선글라스', kind: 'face', price: 90 },
  { id: 'heart-glasses', name: '하트 안경', kind: 'face', price: 90 },
  { id: 'angel-wings', name: '천사 날개', kind: 'back', price: 90 },
  { id: 'backpack', name: '작은 가방', kind: 'back', price: 70 },
  { id: 'cape', name: '망토', kind: 'back', price: 80 },
  { id: 'balloon', name: '풍선', kind: 'hand', price: 60 },
  { id: 'bouquet', name: '꽃다발', kind: 'hand', price: 70 },
  { id: 'mug', name: '머그컵', kind: 'hand', price: 50 },
  { id: 'plant', name: '화분', kind: 'room', price: 60, spot: 'floor' },
  { id: 'lamp', name: '무드등', kind: 'room', price: 90, spot: 'floor' },
  { id: 'cushion', name: '푹신 쿠션', kind: 'room', price: 70, spot: 'floor' },
  { id: 'fishbowl', name: '어항', kind: 'room', price: 110, spot: 'floor' },
  { id: 'bookshelf', name: '책장', kind: 'room', price: 120, spot: 'floor' },
  { id: 'cat-tower', name: '캣타워', kind: 'room', price: 140, spot: 'floor' },
  { id: 'frame', name: '풍경 액자', kind: 'room', price: 60, spot: 'wall' },
  { id: 'window', name: '작은 창문', kind: 'room', price: 90, spot: 'wall' },
  { id: 'clock', name: '벽시계', kind: 'room', price: 80, spot: 'wall' },
  { id: 'rug', name: '폭신 러그', kind: 'room', price: 150, spot: 'rug' },
  { id: 'stripe-rug', name: '줄무늬 러그', kind: 'room', price: 120, spot: 'rug' },
  { id: 'flower-rug', name: '꽃 러그', kind: 'room', price: 130, spot: 'rug' },
  { id: 'cloud-rug', name: '구름 러그', kind: 'room', price: 140, spot: 'rug' },
  { id: 'wall-cream', name: '크림 벽지', kind: 'room', price: 40, spot: 'wallpaper' },
  { id: 'wall-mint', name: '민트 벽지', kind: 'room', price: 40, spot: 'wallpaper' },
  { id: 'wall-sky', name: '하늘 벽지', kind: 'room', price: 40, spot: 'wallpaper' },
  { id: 'wall-pink', name: '분홍 벽지', kind: 'room', price: 40, spot: 'wallpaper' },
  { id: 'wall-night', name: '밤하늘 벽지', kind: 'room', price: 50, spot: 'wallpaper' },
  { id: 'wall-wood', name: '나무 벽지', kind: 'room', price: 50, spot: 'wallpaper' },
  { id: 'floor-wood', name: '마루 바닥', kind: 'room', price: 40, spot: 'flooring' },
  { id: 'floor-tile', name: '타일 바닥', kind: 'room', price: 40, spot: 'flooring' },
  { id: 'floor-grass', name: '잔디 바닥', kind: 'room', price: 40, spot: 'flooring' },
  { id: 'floor-carpet', name: '카펫 바닥', kind: 'room', price: 50, spot: 'flooring' },
  { id: 'mushroom-stool', name: '버섯 의자', kind: 'room', price: 0, spot: 'floor', set: 'forest' },
  { id: 'tree-pot', name: '작은 나무', kind: 'room', price: 0, spot: 'floor', set: 'forest' },
  { id: 'bird-frame', name: '새 액자', kind: 'room', price: 0, spot: 'wall', set: 'forest' },
  { id: 'leaf-rug', name: '나뭇잎 러그', kind: 'room', price: 0, spot: 'rug', set: 'forest' },
  { id: 'coffee-table', name: '커피 테이블', kind: 'room', price: 0, spot: 'floor', set: 'cafe' },
  { id: 'cake-stand', name: '케이크 진열대', kind: 'room', price: 0, spot: 'floor', set: 'cafe' },
  { id: 'menu-board', name: '메뉴판', kind: 'room', price: 0, spot: 'wall', set: 'cafe' },
  { id: 'checker-rug', name: '체크 러그', kind: 'room', price: 0, spot: 'rug', set: 'cafe' },
  { id: 'rocket', name: '로켓 모형', kind: 'room', price: 0, spot: 'floor', set: 'space' },
  { id: 'moon-lamp', name: '달 조명', kind: 'room', price: 0, spot: 'floor', set: 'space' },
  { id: 'planet-poster', name: '행성 포스터', kind: 'room', price: 0, spot: 'wall', set: 'space' },
  { id: 'star-rug', name: '별 러그', kind: 'room', price: 0, spot: 'rug', set: 'space' },
  { id: 'shell', name: '소라 껍데기', kind: 'room', price: 0, spot: 'floor', set: 'sea' },
  { id: 'lifebuoy', name: '구명 튜브', kind: 'room', price: 0, spot: 'floor', set: 'sea' },
  { id: 'anchor-frame', name: '닻 액자', kind: 'room', price: 0, spot: 'wall', set: 'sea' },
  { id: 'wave-rug', name: '물결 러그', kind: 'room', price: 0, spot: 'rug', set: 'sea' },
  { id: 'water-bottle', name: '물병', kind: 'room', price: 0, spot: 'floor', souvenir: { stat: 'water', need: 30 } },
  { id: 'yoga-mat', name: '요가 매트', kind: 'room', price: 0, spot: 'rug', souvenir: { stat: 'stretch', need: 50 } },
  { id: 'telescope', name: '망원경', kind: 'room', price: 0, spot: 'floor', souvenir: { stat: 'eye-rest', need: 100 } },
  { id: 'encounter-frame', name: '인카운터 액자', kind: 'room', price: 0, spot: 'wall', souvenir: { stat: 'dex', need: 1 } },
  { id: 'trophy-shelf', name: '트로피 선반', kind: 'room', price: 0, spot: 'floor', souvenir: { stat: 'badges', need: 1 } },
  { id: 'duck', name: '고무 오리 망치', kind: 'hammer', price: 100 },
  { id: 'pillow', name: '베개 망치', kind: 'hammer', price: 100 },
  { id: 'leek', name: '대파 망치', kind: 'hammer', price: 100 },
  { id: 'chick', name: '병아리', kind: 'pet', price: 60 },
  { id: 'hamster', name: '햄스터', kind: 'pet', price: 90 },
  { id: 'kitten', name: '아기 고양이', kind: 'pet', price: 120 },
  { id: 'baby-bunny', name: '아기 토끼', kind: 'pet', price: 100 },
  { id: 'puppy', name: '강아지', kind: 'pet', price: 120 },
]

export type GachaKind = 'fashion' | 'pet' | 'furniture'

export const GACHA: Readonly<Record<GachaKind, { name: string; price: number; kinds: readonly ShopKind[] }>> = {
  fashion: { name: '패션 뽑기', price: 50, kinds: ['hat', 'neck', 'face', 'back', 'hand'] },
  pet: { name: '애완동물 뽑기', price: 50, kinds: ['pet'] },
  furniture: { name: '가구 뽑기', price: 50, kinds: ['room'] },
}

export const STAR_PIECES_PER_PICK = 5

export const isGachaOnly = (item: ShopItem): boolean => GACHA.fashion.kinds.includes(item.kind) || item.set !== undefined

const isInGacha = (item: ShopItem, kind: GachaKind): boolean => GACHA[kind].kinds.includes(item.kind) && (kind !== 'furniture' || item.set !== undefined)

export const gachaPool = (wallet: TokoWallet, kind: GachaKind, day = ''): ShopItem[] =>
  SHOP.filter(item => isInGacha(item, kind) && !wallet.items.includes(item.id) && (item.season === undefined || isInSeason(item.season, day)))

export type GachaPull = { wallet: TokoWallet; item: ShopItem; spent: number } | { reason: string }

export const pullGacha = (wallet: TokoWallet, balance: number, kind: GachaKind, roll: number, day = ''): GachaPull => {
  const pool = gachaPool(wallet, kind, day)
  const price = GACHA[kind].price
  if (pool.length === 0) {
    return { reason: '다 모았어! 더 나올 게 없어' }
  }
  if (balance < price) {
    return { reason: `코인이 ${price - balance}개 모자라` }
  }
  const item = pool.find(entry => entry.season !== undefined) ?? pool[Math.min(pool.length - 1, Math.floor(roll * pool.length))] ?? pool[0]
  if (item === undefined) {
    return { reason: '다 모았어! 더 나올 게 없어' }
  }
  return { wallet: kind === 'furniture' ? { ...wallet, items: [...wallet.items, item.id] } : wear({ ...wallet, items: [...wallet.items, item.id] }, item.id), item, spent: price }
}

export type Exchange = { wallet: TokoWallet; item: ShopItem } | { reason: string }

export const exchangeStars = (wallet: TokoWallet, id: string): Exchange => {
  const item = shopItem(id)
  if (item === undefined || !isGachaOnly(item) || item.season !== undefined) {
    return { reason: '별조각으로는 뽑기에서 나오는 아이템만 고를 수 있어' }
  }
  if (wallet.items.includes(id)) {
    return { reason: '이미 갖고 있어' }
  }
  const stars = wallet.stars ?? 0
  if (stars < STAR_PIECES_PER_PICK) {
    return { reason: `별조각이 ${STAR_PIECES_PER_PICK - stars}개 모자라` }
  }
  return { wallet: { ...wallet, stars: stars - STAR_PIECES_PER_PICK, items: [...wallet.items, id] }, item }
}

export const DYES = ['기본', '바다색', '숲색'] as const

export const dyeOf = (wallet: TokoWallet, id: string): number => wallet.dyes?.[id] ?? 0

export const shopItem = (id: string): ShopItem | undefined => SHOP.find(item => item.id === id)

export type Purchase = { wallet: TokoWallet; spent: number } | { reason: string }

export const buy = (wallet: TokoWallet, balance: number, id: string): Purchase => {
  const item = shopItem(id)
  if (item === undefined) {
    return { reason: '그런 물건은 없어' }
  }
  if (isGachaOnly(item)) {
    return { reason: '패션 아이템은 뽑기로만 나와' }
  }
  if (item.souvenir !== undefined) {
    return { reason: '쉬다 보면 생기는 기념품이라 살 수는 없어' }
  }
  if (item.kind !== 'snack' && wallet.items.includes(id)) {
    return { reason: '이미 갖고 있어' }
  }
  if (balance < item.price) {
    return { reason: `코인이 ${item.price - balance}개 모자라` }
  }
  return { wallet: { ...wallet, items: [...wallet.items, id] }, spent: item.price }
}

export const wear = (wallet: TokoWallet, id: string): TokoWallet => {
  const item = shopItem(id)
  if (item === undefined || item.kind === 'snack' || item.kind === 'room' || !wallet.items.includes(id)) {
    return wallet
  }
  if (wallet.worn.includes(id)) {
    return { ...wallet, worn: wallet.worn.filter(worn => worn !== id) }
  }
  const others = wallet.worn.filter(worn => shopItem(worn)?.kind !== item.kind)
  return { ...wallet, worn: [...others, id] }
}

export const takeSnack = (wallet: TokoWallet): { wallet: TokoWallet; snack: ShopItem } | null => {
  const snackId = wallet.items.find(id => shopItem(id)?.kind === 'snack')
  const snack = snackId === undefined ? undefined : shopItem(snackId)
  if (snackId === undefined || snack === undefined) {
    return null
  }
  const index = wallet.items.indexOf(snackId)
  return { wallet: { ...wallet, items: wallet.items.filter((_, at) => at !== index) }, snack }
}

export const wornOf = (wallet: TokoWallet, kind: ShopKind): string | undefined =>
  wallet.worn.find(id => shopItem(id)?.kind === kind)
