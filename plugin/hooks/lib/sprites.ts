import type { TokoMood, TokoSpecies } from '../../types'

export type Grid = readonly string[]

export const FEET = {
  stand: '...KK......KK...',
  stepA: '..KK.......KK...',
  stepB: '...KK.......KK..',
  tuck: '................',
} as const

type Point = readonly [number, number]

export type Face = { leftEye: Point; rightEye: Point; mouth: Point; leftBlush: Point; rightBlush: Point }

const FACE: Face = { leftEye: [3, 5], rightEye: [11, 5], mouth: [7, 7], leftBlush: [2, 7], rightBlush: [13, 7] }

type EyeStyle = 'round' | 'dot' | 'sparkle' | 'solid'

type EyeShape = 'open' | 'happy' | 'closed' | 'lidded'

const EYE_GRIDS: Readonly<Record<EyeStyle, readonly [Grid, Grid]>> = {
  round: [['we', 'ee'], ['we', 'ee']],
  dot: [['.e', '.e'], ['e.', 'e.']],
  sparkle: [['we', 'ew'], ['we', 'ew']],
  solid: [['ee', 'ee'], ['ee', 'ee']],
}

const EYE_SHAPES: Readonly<Record<Exclude<EyeShape, 'open'>, Grid>> = {
  happy: ['ee', '..'],
  closed: ['..', 'ee'],
  lidded: ['oo', 'ee'],
}

export const eyeGrids = (eyes: EyeStyle, shape: EyeShape): readonly [Grid, Grid] =>
  shape === 'open' ? EYE_GRIDS[eyes] : [EYE_SHAPES[shape], EYE_SHAPES[shape]]

export type Mark = { grid: Grid; dx: number; dy: number }

export type SpeciesArt = {
  body: Grid
  eyes: EyeStyle
  face: Face
  colors: { o: string; b: string; l: string; p: string; t: string; f: string; m?: string }
  hatDy: number
  neckY: number
  armY: number
  isFloating?: boolean
  mouths?: Partial<Record<MouthShape, MouthShape>>
  aura?: { near: string; far: string }
}

export const SPECIES_ART: Readonly<Record<TokoSpecies, SpeciesArt>> = {
  cat: {
    body: [
      '...o........o...',
      '..obo......obo..',
      '..obboooooobbo..',
      '.obbbbbbbbbbbbo.',
      '.obbbbbbbbbbbbo.',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbllllllbbbbo',
      '.obbbllllllbbbo.',
      '.obbbbllllbbbbo.',
      '..obbbbbbbbbbo..',
      '...oooooooooo...',
    ],
    eyes: 'round',
    face: FACE,
    colors: { o: '#332233', b: '#FFDD99', l: '#FFEECC', p: '#FF9999', t: '#EEBB77', f: '#D9A35E' },
    hatDy: 0,
    neckY: 8,
    armY: 7,
  },
  bear: {
    body: [
      '.ooo........ooo.',
      'oblbo......oblbo',
      'obbboooooooobbbo',
      '.obbbbbbbbbbbbo.',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbllllllbbbbo',
      'obbbbbllllbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      '.obbbllllllbbbo.',
      '.obbbbllllbbbbo.',
      '..obbbbbbbbbbo..',
      '...oooooooooo...',
    ],
    eyes: 'dot',
    face: FACE,
    colors: { o: '#331F11', b: '#C08A5A', l: '#F0DCC0', p: '#FF9988', t: '#9A6A40', f: '#9A6A40', m: '#442211' },
    hatDy: 0,
    neckY: 8,
    armY: 7,
  },
  chick: {
    body: [
      '.......oo.......',
      '......obbo......',
      '....oooooooo....',
      '...obbbbbbbbo...',
      '..obbbbbbbbbbo..',
      '.obbbbbbbbbbbbo.',
      '.obbbbbbbbbbbbo.',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbllllbbbbbo',
      '.obbbllllllbbbo.',
      '..obbbbbbbbbbo..',
      '...oooooooooo...',
    ],
    eyes: 'dot',
    face: FACE,
    colors: { o: '#443311', b: '#FFE066', l: '#FFF4BB', p: '#FFAA88', t: '#FFCC33', f: '#FF8833', m: '#FF8833' },
    hatDy: 1,
    neckY: 8,
    armY: 7,
  },
  bunny: {
    body: [
      '..oo........oo..',
      '.oblo......olbo.',
      '.oblo......olbo.',
      '..obboooooobbo..',
      '.obbbbbbbbbbbbo.',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbllllbbbbbo',
      '.obbbllllllbbbo.',
      '.obbbbllllbbbbo.',
      '..obbbbbbbbbbo..',
      '...oooooooooo...',
    ],
    eyes: 'round',
    face: FACE,
    colors: { o: '#443344', b: '#F6F0F2', l: '#FFC8D8', p: '#FF99AA', t: '#FFFFFF', f: '#D99AAE' },
    hatDy: 0,
    neckY: 8,
    armY: 7,
  },
  frog: {
    body: [
      '..oooo....oooo..',
      '.obbbbo..obbbbo.',
      '.obbbbboobbbbbo.',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbllllllllbbbo',
      '.obbllllllllbbo.',
      '.obbbllllllbbbo.',
      '..obbbbbbbbbbo..',
      '...oooooooooo...',
    ],
    eyes: 'round',
    face: { leftEye: [3, 2], rightEye: [11, 2], mouth: [7, 6], leftBlush: [2, 5], rightBlush: [13, 5] },
    colors: { o: '#1F3322', b: '#8CD06A', l: '#E2F2B0', p: '#FF9999', t: '#5FA84A', f: '#5FA84A' },
    hatDy: -1,
    neckY: 7,
    armY: 7,
  },
  penguin: {
    body: [
      '....oooooooo....',
      '...obbbbbbbbo...',
      '..obbbbbbbbbbo..',
      '.obbbbbbbbbbbbo.',
      '.obllllbbllllbo.',
      'obllllllllllllbo',
      'obllllllllllllbo',
      'obllllllllllllbo',
      'obbllllllllllbbo',
      'obbllllllllllbbo',
      'obbbllllllllbbbo',
      '.obbllllllllbbo.',
      '.obbbllllllbbbo.',
      '..obbbbbbbbbbo..',
      '...oooooooooo...',
    ],
    eyes: 'dot',
    face: FACE,
    colors: { o: '#111A22', b: '#3A4A5C', l: '#FFFFFF', p: '#FFAABB', t: '#2A3644', f: '#FF9922', m: '#FF9922' },
    hatDy: 0,
    neckY: 8,
    armY: 7,
  },
  fox: {
    body: [
      '.oo..........oo.',
      '.olo........olo.',
      '.ollo......ollo.',
      '.obbboooooobbbo.',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'olllbbbbbbbblllo',
      'obllllllllllllbo',
      'obllllllllllllbo',
      'obbllllllllllbbo',
      '.obbbllllllbbbo.',
      '.obbbbllllbbbbo.',
      '..obbbbbbbbbbo..',
      '...oooooooooo...',
    ],
    eyes: 'sparkle',
    face: FACE,
    colors: { o: '#3A1F14', b: '#F28A3C', l: '#FFF1E2', p: '#FF7766', t: '#FFF1E2', f: '#C8692A' },
    hatDy: 0,
    neckY: 8,
    armY: 7,
  },
  dragon: {
    body: [
      '...y........y...',
      '..yyo......oyy..',
      '..obboooooobbo..',
      '.obbbbbbbbbbbbo.',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbllllllbbbbo',
      '.obbbTTTTTTbbbo.',
      '.obbbbllllbbbbo.',
      '..obbbbbbbbbbo..',
      '...oooooooooo...',
    ],
    eyes: 'sparkle',
    face: FACE,
    colors: { o: '#163330', b: '#5CC8A8', l: '#EAF8C8', p: '#FF99BB', t: '#3FA88C', f: '#3FA88C' },
    hatDy: 0,
    neckY: 8,
    armY: 7,
  },
  unicorn: {
    body: [
      '.......Y........',
      '..o....yY....o..',
      '.obo..oyyo..obo.',
      '.obboooooooobbo.',
      'okkbbbbbbbbbbbbo',
      'okbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbllllllbbbbo',
      '.obbbllllllbbbo.',
      '.obbbbllllbbbbo.',
      '..obbbbbbbbbbo..',
      '...oooooooooo...',
    ],
    eyes: 'sparkle',
    face: FACE,
    colors: { o: '#443355', b: '#FAF6FF', l: '#E8DDFF', p: '#FFAACC', t: '#CCBBFF', f: '#9A86D6' },
    hatDy: 0,
    neckY: 8,
    armY: 7,
  },
  ghost: {
    body: [
      '......ooooo.....',
      '....oobbbbboo...',
      '...obbbbbbbbbo..',
      '..obbbbbbbbbbbo.',
      '..obbbbbbbbbbbo.',
      '.obbbbbbbbbbbbbo',
      '.obbbbbbbbbbbbbo',
      '.obbbbbbbbbbbblo',
      'oobbbbbbbbbbbblo',
      'obbbbbbbbbbbbblo',
      '.obbbbbbbbbbbblo',
      '.obbbbbbbbbbbblo',
      '.obbbbbbbbbbbllo',
      '.obbbbobbbbobllo',
      '..oooo.oooo.ooo.',
    ],
    eyes: 'solid',
    face: { leftEye: [4, 6], rightEye: [10, 6], mouth: [7, 8], leftBlush: [3, 8], rightBlush: [12, 8] },
    colors: { o: '#4B3A78', b: '#FBF8FF', l: '#E6DAFF', p: '#FFB3C7', t: '#E6DAFF', f: '#8E7CC3', m: '#3D2B5E' },
    hatDy: 0,
    neckY: 9,
    armY: 7,
    isFloating: true,
    mouths: { small: 'smile' },
    aura: { near: '#FFC4DD', far: '#FFD9E8' },
  },
  phoenix: {
    body: [
      '......y.y.......',
      '.....yRyRy......',
      '....oooooooo....',
      '...obbbbbbbbo...',
      '..obbbbbbbbbbo..',
      '.obbbbbbbbbbbbo.',
      '.obbbbbbbbbbbbo.',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbllllbbbbbo',
      'obbbllllllllbbbo',
      '.obbbllllllbbbo.',
      '..obbbbbbbbbbo..',
      '...oooooooooo...',
    ],
    eyes: 'sparkle',
    face: FACE,
    colors: { o: '#441111', b: '#FF6633', l: '#FFCC55', p: '#FFDD88', t: '#FFAA22', f: '#D9541F', m: '#FFDD44' },
    hatDy: 1,
    neckY: 8,
    armY: 7,
  },
  robot: {
    body: [
      '.......R........',
      '.......a........',
      '.oooooooooooooo.',
      'obbbbbbbbbbbbbbo',
      'obllllllllllllbo',
      'obllllllllllllbo',
      'obllllllllllllbo',
      'obllllllllllllbo',
      'obllllllllllllbo',
      'obbbbbbbbbbbbbbo',
      'obbTTbbbbbbTTbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      'obbbbbbbbbbbbbbo',
      '.oooooooooooooo.',
    ],
    eyes: 'round',
    face: FACE,
    colors: { o: '#2A2F3A', b: '#AAB4C4', l: '#CCEEFF', p: '#FF99AA', t: '#FFCC44', f: '#7A8494' },
    hatDy: 1,
    neckY: 8,
    armY: 7,
  },
  axolotl: {
    body: [
      '....oooooooo....',
      'k..obbbbbbbbo..k',
      '.kobbbbbbbbbbok.',
      'kkobbbbbbbbbbokk',
      '.kobbbbbbbbbbok.',
      'k.obbbbbbbbbbo.k',
      '..obbbbbbbbbbo..',
      '..obbbbbbbbbbo..',
      '..obbbbbbbbbbo..',
      '..obbbbbbbbbbo..',
      '..obbbllllbbbo..',
      '..obbllllllbbo..',
      '..obbbllllbbbo..',
      '...obbbbbbbbo...',
      '....oooooooo....',
    ],
    eyes: 'dot',
    face: { leftEye: [3, 5], rightEye: [11, 5], mouth: [7, 7], leftBlush: [3, 7], rightBlush: [12, 7] },
    colors: { o: '#663344', b: '#FFC4D6', l: '#FFE6EE', p: '#FF88AA', t: '#FF6699', f: '#E8789A' },
    hatDy: 0,
    neckY: 8,
    armY: 7,
  },
}

export const MOUTHS = {
  small: [[0, 0, 'm'], [1, 0, 'm']],
  open: [[0, 0, 'm'], [1, 0, 'm'], [0, 1, 'm'], [1, 1, 'm']],
  flat: [[0, 0, 'o'], [1, 0, 'o']],
  wavy: [[-1, 1, 'm'], [0, 0, 'm'], [1, 0, 'm'], [2, 1, 'm']],
  pout: [[1, 0, 'm'], [1, 1, 'm']],
  smile: [[0, 0, 'm'], [2, 0, 'm'], [1, 1, 'm']],
} as const

export type MouthShape = keyof typeof MOUTHS

export const MOOD_FACE: Readonly<Record<TokoMood, { eyes: EyeShape; mouth: MouthShape; hasBrows: boolean }>> = {
  excited: { eyes: 'happy', mouth: 'open', hasBrows: false },
  calm: { eyes: 'open', mouth: 'small', hasBrows: false },
  sleepy: { eyes: 'lidded', mouth: 'flat', hasBrows: false },
  worried: { eyes: 'open', mouth: 'wavy', hasBrows: true },
  sulky: { eyes: 'lidded', mouth: 'pout', hasBrows: false },
}

export const EGG: Grid = [
  '...oooo...',
  '..oEEEEo..',
  '.oEEsEEEo.',
  '.oEEEEEEo.',
  'oEEEEEEsEo',
  'oEsEEEEEEo',
  'oEEEEEEEEo',
  'oEEEEsEEEo',
  '.oEEEEEEo.',
  '..oooooo..',
]

export const EGG_CRACK: Grid = [
  '...oooo...',
  '..oEEEEo..',
  '.oEEsEEEo.',
  '.oEoEoEEo.',
  'oEo.o.oEEo',
  'oEsEEEEoEo',
  'oEEEEEEEEo',
  'oEEEEsEEEo',
  '.oEEEEEEo.',
  '..oooooo..',
]

export const HAMMER_UP: Grid = ['rRRRr', 'RRRRR', 'rRRRr', '..h..', '..h..', '..h..']
export const HAMMER_DOWN: Grid = ['..h..', '..h..', '..h..', 'rRRRr', 'RRRRR', 'rRRRr']
export const HAMMER_SIDE: Grid = ['.rRr...', 'RRRRhhh', '.rRr...']

export const CLAWD: Grid = ['.OOOOOOOOOO.', '.OOeOOOOeOO.', '.OOeOOOOeOO.', 'OOOOOOOOOOOO', '.OOOOOOOOOO.', '..O.O..O.O..']
export const CLAWD_SQUASHED: Grid = ['............', '............', '.OOOOOOOOOO.', 'OOeeOOOOeeOO', 'OOOOOOOOOOOO', 'O.O......O.O']

export const STAR: Grid = ['.y.', 'yYy', '.y.']
export const HEART: Grid = ['k.k', 'kkk', '.k.']
export const COIN: Grid = ['.gg.', 'gGgg', 'gGgg', '.gg.']
export const ZZZ: Grid = ['zzz', '.z.', 'zzz']
export const SPARKLE: Grid = ['.Y.', 'Y.Y', '.Y.']
export const NOTE: Grid = ['.kk', '.k.', 'kk.']

export const BUTTERFLY: readonly Grid[] = [
  ['qq.qq', 'qqaqq', '.q.q.'],
  ['.q.q.', '..a..', '.q.q.'],
]
export const LEAF: readonly Grid[] = [['nN', 'N.'], ['Nn', '.N']]
export const CRUMB: Grid = ['g']
export const BUBBLE: Grid = ['.u.', 'u.u', '.u.']
export const FIREFLY: readonly Grid[] = [['f'], ['F']]
export const SHOOTING_STAR: Grid = ['Y...', '.y..', '..y.', '...a']
export const CLOUD: Grid = ['..aaa..', '.aAAAa.', 'aAAAAAa', '.aaaaa.']
export const DROP: Grid = ['d']
export const UMBRELLA: Grid = ['..UUU..', '.UUUUU.', 'UUuUuUU', '...h...', '...h...']
export const SPROUT: readonly Grid[] = [
  ['.....', '.....', '..n..', '.ttt.', '.ttt.'],
  ['.....', 'n.n..', '.nn..', '.ttt.', '.ttt.'],
  ['nn.nn', '.nNn.', '..n..', '.ttt.', '.ttt.'],
]
export const WATERING_CAN: Grid = ['..UUU.', 'uUUUUU', '.UUUU.']
export const GIFT: Grid = ['..yy..', 'RRyyRR', 'RRyyRR', 'RRyyRR']
export const GIFT_OPEN: Grid = ['.yy.yy', '......', 'RRyyRR', 'RRyyRR']
export const CUP: Grid = ['uuuu', 'cUUc', 'cUUc', '.cc.']
export const BUG: readonly Grid[] = [['.v.', 'vVv', 'v.v'], ['.v.', 'vVv', '.v.']]
export const PUMPKIN: readonly Grid[] = [
  ['...N...', '.jjNjj.', 'jJyjyJj', 'jjjjjjj', 'jJyyyJj', '.jjjjj.'],
  ['...N...', '.jjNjj.', 'jJYjYJj', 'jjjjjjj', 'jJYYYJj', '.jjjjj.'],
]
export const BOSS: readonly Grid[] = [
  ['..y.y.y..', '..yyyyy..', '.RRRRRRR.', 'RRwRRRwRR', 'RReRRReRR', 'RRRRRRRRR', 'RrRrRrRrR', '.RRRRRRR.'],
  ['.........', '..y.y.y..', '..yyyyy..', '.RRRRRRR.', 'RRwRRRwRR', 'RReRRReRR', 'RrRrRrRrR', 'RRRRRRRRR'],
]
export const BAT: readonly Grid[] = [
  ['V.....V', 'VV.v.VV', '.VVvVV.'],
  ['.......', 'VVVvVVV', '..VvV..'],
]

export const HATS: Readonly<Record<string, { grid: Grid; dx: number; dy: number }>> = {
  beanie: { grid: ['.....ii.....', '...iiiiii...', '..iIiIiIii..'], dx: 2, dy: 0 },
  ribbon: { grid: ['kk.kk', '.kkk.', 'kk.kk'], dx: 10, dy: 0 },
  crown: { grid: ['y.y.y', 'yYyYy', 'yyyyy'], dx: 5, dy: -1 },
  cap: { grid: ['....RRRR....', '...RRRRRR...', '...RRRRRRrrr'], dx: 2, dy: 0 },
  beret: { grid: ['......V.....', '...vvvvvv...', '..vvvvvvvv..'], dx: 2, dy: 0 },
  flower: { grid: ['.k.', 'kyk', '.k.'], dx: 11, dy: 1 },
  party: { grid: ['..Y..', '..k..', '.kyk.', 'kykyk'], dx: 5, dy: -1 },
  pumpkin: { grid: ['...NN...', '.jjJjjj.', 'jJjjjjJj', '.jjjjjj.'], dx: 4, dy: -1 },
}

export const NECKS: Readonly<Record<string, { grid: Grid; dx: number; dy: number }>> = {
  scarf: { grid: ['.RRRRRRRRRRRR.', '..RRrr....RRR.', '..........RR..'], dx: 1, dy: 0 },
  bowtie: { grid: ['RR..RR', 'RRrrRR', 'RR..RR'], dx: 5, dy: 0 },
}

export type Glasses = { lens: Grid; bridge: string }

export const GLASSES: Readonly<Record<string, Glasses>> = {
  'round-glasses': { lens: ['.II.', 'I..I', 'I..I', '.II.'], bridge: 'I' },
  sunglasses: { lens: ['IIII', 'IweI', 'IeeI', '.II.'], bridge: 'I' },
  'heart-glasses': { lens: ['k..k', 'kqqk', 'kqqk', '.kk.'], bridge: 'k' },
}

export const CRITTERS: Readonly<Record<string, { stand: Grid; step: Grid; fur: string }>> = {
  chick: {
    stand: ['...oo...', '..oLLo..', '.oLLLLo.', 'oLeLLeLo', 'oLLGGLLo', 'gLLLLLLg', '.oLLLLo.', '..oooo..', '.G....G.'],
    step: ['...oo...', '..oLLo..', '.oLLLLo.', 'oLeLLeLo', 'oLLGGLLo', 'gLLLLLLg', '.oLLLLo.', '..oooo..', '..G..G..'],
    fur: 'L',
  },
  hamster: {
    stand: ['.q....q.', '.oGGGGo.', 'oGeGGeGo', 'osskksso', 'osssssso', '.oooooo.', '..k..k..'],
    step: ['.q....q.', '.oGGGGo.', 'oGeGGeGo', 'osskksso', 'osssssso', '.oooooo.', '.k....k.'],
    fur: 'G',
  },
  kitten: {
    stand: ['oo...oo.', 'oqoooqo.', 'oAaAaAo.', 'oAeAeAo.', 'oAckcAoa', '.oAAAo.a', '..ooo.a.', '.a...a..'],
    step: ['oo...oo.', 'oqoooqo.', 'oAaAaAo.', 'oAeAeAo.', 'oAckcAoa', '.oAAAo.a', '..ooo.a.', '..a.a...'],
    fur: 'A',
  },
  'baby-bunny': {
    stand: ['.o...o.', 'oqo.oqo', 'oqoooqo', 'oWWWWWo', 'oWeWeWo', 'oWWkWWo', '.oWWWo.', '..ooo..', '.W...W.'],
    step: ['.o...o.', 'oqo.oqo', 'oqoooqo', 'oWWWWWo', 'oWeWeWo', 'oWWkWWo', '.oWWWo.', '..ooo..', '..W.W..'],
    fur: 'W',
  },
  puppy: {
    stand: ['.ooooo.', 'SsssssS', 'SsesesS', '.ssess.', '.oskso.', '..ooo..', '.s...s.'],
    step: ['.ooooo.', 'SsssssS', 'SsesesS', '.ssess.', '.oskso.', '..ooo..', '..s.s..'],
    fur: 's',
  },
}

export const ROOM_PROPS: Readonly<Record<string, Grid>> = {
  plant: ['.nn.n', 'n.Nnn', '.nNn.', '.ttt.', '.ttt.'],
  lamp: ['.yyy.', 'yYYYy', '.yyy.', '..h..', '..h..', '.hhh.'],
  rug: ['.ssssssssssssssss.', 'sSsSsSsSsSsSsSsSss', '.ssssssssssssssss.'],
}

const CHANNEL = 0x11

export const hex = (value: string): number => {
  const parsed = Number.parseInt(value.replace('#', ''), 16)
  const r = Math.round(((parsed >> 16) & 0xff) / CHANNEL) * CHANNEL
  const g = Math.round(((parsed >> 8) & 0xff) / CHANNEL) * CHANNEL
  const b = Math.round((parsed & 0xff) / CHANNEL) * CHANNEL
  return (r << 16) | (g << 8) | b
}

const SHARED: Readonly<Record<string, string>> = {
  e: '#221122',
  w: '#FFFFFF',
  m: '#883344',
  R: '#EE3344',
  r: '#AA2233',
  h: '#AA7744',
  Y: '#FFFFAA',
  y: '#FFDD44',
  L: '#FFEE88',
  k: '#FF6699',
  g: '#FFCC22',
  G: '#CC8811',
  z: '#99AADD',
  q: '#FFAACC',
  a: '#777788',
  A: '#BBBBCC',
  u: '#BBDDFF',
  U: '#66AADD',
  c: '#DDDDEE',
  d: '#5599DD',
  E: '#FFFFEE',
  s: '#DDCC99',
  S: '#CCAA88',
  n: '#77CC66',
  N: '#449944',
  t: '#AA6644',
  W: '#FFFFFF',
  O: '#D97757',
  D: '#888899',
  f: '#DDFF66',
  F: '#889944',
  i: '#5577CC',
  I: '#334499',
  v: '#663355',
  V: '#AA4477',
  x: '#888899',
  j: '#FF8822',
  J: '#CC5511',
}

export type Palette = ReadonlyMap<string, number>

export const paletteOf = (species: TokoSpecies): Palette => {
  const { m, ...body } = SPECIES_ART[species].colors
  const entries: [string, string][] = [
    ...Object.entries(SHARED),
    ['o', body.o],
    ['b', body.b],
    ['l', body.l],
    ['p', body.p],
    ['T', body.t],
    ['K', body.f],
    ...(m === undefined ? [] : [['m', m] as [string, string]]),
  ]
  return new Map(entries.map(([key, value]) => [key, hex(value)]))
}

export const HAMMER_SKINS: Readonly<Record<string, { R: string; r: string }>> = {
  toy: { R: '#EE3344', r: '#AA2233' },
  duck: { R: '#FFDD33', r: '#EE9922' },
  pillow: { R: '#FFFFFF', r: '#CCCCDD' },
  leek: { R: '#88DD66', r: '#EEFFEE' },
}

export const KAOMOJI: Readonly<Record<TokoMood, string>> = {
  excited: '(ﾉ◕ヮ◕)ﾉ',
  calm: '(•ᴗ•)',
  sleepy: '(－_－) zZ',
  worried: '(・_・;)',
  sulky: '(¬_¬)',
}
