import type { TokoMood, TokoSpecies } from '../../types'

export type Grid = readonly string[]

export const FEET: Readonly<Record<'stand' | 'stepA' | 'stepB' | 'tuck', Grid>> = {
  stand: ['......obBo....obBo......', '.......oo......oo.......'],
  stepA: ['.....obBo.....obBo......', '......oo.......oo.......'],
  stepB: ['......obBo.....obBo.....', '.......oo.......oo......'],
  tuck: [],
}

type Point = readonly [number, number]

export type Face = { leftEye: Point; rightEye: Point; mouth: Point; leftBlush: Point; rightBlush: Point }

const FACE: Face = { leftEye: [7, 11], rightEye: [15, 11], mouth: [11, 14], leftBlush: [4, 14], rightBlush: [17, 14] }

type EyeStyle = 'round' | 'dot' | 'sparkle'

type EyeShape = 'open' | 'happy' | 'closed' | 'lidded'

export type Mark = { grid: Grid; dx: number; dy: number }

const EYE_GRIDS: Readonly<Record<EyeStyle, Grid>> = {
  round: ['we', 'ee', 'ee'],
  dot: ['..', 'ee', 'ee'],
  sparkle: ['we', 'ee', 'ew'],
}

const EYE_SHAPES: Readonly<Record<Exclude<EyeShape, 'open'>, Mark>> = {
  happy: { grid: ['.ee.', 'e..e'], dx: -1, dy: 0 },
  closed: { grid: ['e..e', '.ee.'], dx: -1, dy: 1 },
  lidded: { grid: ['oooo', '.ee.'], dx: -1, dy: 1 },
}

export const eyeMark = (eyes: EyeStyle, shape: EyeShape): Mark => (shape === 'open' ? { grid: EYE_GRIDS[eyes], dx: 0, dy: 0 } : EYE_SHAPES[shape])

export type SpeciesArt = {
  body: Grid
  eyes: EyeStyle
  face: Face
  colors: { o: string; b: string; l: string; p: string; t: string; m?: string }
  child?: Mark
  adult?: Mark
  hatDy: number
  isFloating?: boolean
}

export const SPECIES_ART: Readonly<Record<TokoSpecies, SpeciesArt>> = {
  cat: {
    body: [
      '........................',
      '........................',
      '...b................b...',
      '...bb..............bb...',
      '...bpb............bpb...',
      '...bppb..........bppb...',
      '...bbbbbbbbbbbbbbbbbb...',
      '.....bbbbbbbbbbbbbb.....',
      '...bbbbbbbbbbbbbbbbbb...',
      '...bbbbbbbbbbbbbbbbbb...',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbllbbbbbbbbb..',
      '..bbbbbbllllllllbbbbbb..',
      '..bbbbbllllllllllbbbbb..',
      '..bbbbbllllllllllbbbbb..',
      '...bbbbllllllllllbbbb...',
      '...bbbbllllllllllbbbb...',
      '.....bbbllllllllbbb.....',
      '.......bbbbllbbbb.......',
      '........................',
    ],
    eyes: 'round',
    face: FACE,
    colors: { o: '#332233', b: '#FFDD99', l: '#FFEECC', p: '#FF9999', t: '#EEBB77' },
    child: { grid: ['...o................o...'], dx: 0, dy: 1 },
    adult: { grid: ['oo', 'bo', 'o.'], dx: -1, dy: 15 },
    hatDy: 0,
  },
  bear: {
    body: [
      '........................',
      '........................',
      '........................',
      '...bbbb..........bbbb...',
      '..bbbbbb........bbbbbb..',
      '..bbllbb........bbllbb..',
      '..bbllbbbbbbbbbbbbllbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '...bbbbbbbbbbbbbbbbbb...',
      '...bbbbbbbbbbbbbbbbbb...',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbllllbbbbbbbb..',
      '..bbbbbbbllllllbbbbbbb..',
      '..bbbbbbbllllllbbbbbbb..',
      '..bbbbbbbbllllbbbbbbbb..',
      '..bbbbbbbllllllbbbbbbb..',
      '...bbbbbllllllllbbbbb...',
      '...bbbbllllllllllbbbb...',
      '.....bbbllllllllbbb.....',
      '.......bbllllllbb.......',
      '........................',
    ],
    eyes: 'dot',
    face: FACE,
    colors: { o: '#331F11', b: '#C08A5A', l: '#F0DCC0', p: '#FF9988', t: '#9A6A40', m: '#442211' },
    adult: { grid: ['oo', 'bo'], dx: -1, dy: 17 },
    hatDy: 0,
  },
  chick: {
    body: [
      '........................',
      '........................',
      '...........bb...........',
      '..........b..b..........',
      '...........bb...........',
      '........................',
      '........bbbbbbbb........',
      '......bbbbbbbbbbbb......',
      '.....bbbbbbbbbbbbbb.....',
      '....bbbbbbbbbbbbbbbb....',
      '...bbbbbbbbbbbbbbbbbb...',
      '...bbbbbbbbbbbbbbbbbb...',
      '...bbbbbbbbbbbbbbbbbb...',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '...bbbbbbllllllbbbbbb...',
      '...bbbbllllllllllbbbb...',
      '...bbbbllllllllllbbbb...',
      '....bbbllllllllllbbb....',
      '.....bbllllllllllbb.....',
      '......bbbllllllbbb......',
      '........bbbbbbbb........',
      '........................',
    ],
    eyes: 'dot',
    face: FACE,
    colors: { o: '#443311', b: '#FFE066', l: '#FFF4BB', p: '#FFAA88', t: '#FFCC33', m: '#FF8833' },
    adult: { grid: ['o.', 'bo', 'o.'], dx: -1, dy: 13 },
    hatDy: 1,
  },
  bunny: {
    body: [
      '........................',
      '.....bb.........bb......',
      '....bllb.......bllb.....',
      '....bllb.......bllb.....',
      '....bllb.......bllb.....',
      '....bllb.......bllb.....',
      '....bllb.......bllb.....',
      '....bllb.......bllb.....',
      '.....bb.........bb......',
      '.....bbbbbbbbbbbbb......',
      '....bbbbbbbbbbbbbbbb....',
      '...bbbbbbbbbbbbbbbbbb...',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbllllllbbbbbbb..',
      '..bbbbbllllllllllbbbbb..',
      '..bbbbbllllllllllbbbbb..',
      '..bbbbbllllllllllbbbbb..',
      '...bbbbllllllllllbbbb...',
      '....bbbbbllllllbbbbb....',
      '......bbbbbbbbbbbb......',
      '........................',
    ],
    eyes: 'round',
    face: FACE,
    colors: { o: '#443344', b: '#F6F0F2', l: '#FFC8D8', p: '#FF99AA', t: '#FFFFFF' },
    adult: { grid: ['oo', 'Wo', 'oo'], dx: -1, dy: 15 },
    hatDy: 3,
  },
  frog: {
    body: [
      '........................',
      '........................',
      '........................',
      '....bbbb........bbbb....',
      '...bbbbbb......bbbbbb...',
      '...bbbbbb......bbbbbb...',
      '...bbbbbb......bbbbbb...',
      '...bbbbbb......bbbbbb...',
      '....bbbbbbbbbbbbbbbb....',
      '....bbbbbbbbbbbbbbbb....',
      '...bbbbbbbbbbbbbbbbbb...',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '.bbbbbbbbbbbbbbbbbbbbbb.',
      '.bbbbbbbbbllllbbbbbbbbb.',
      '.bbbbbbllllllllllbbbbbb.',
      '.bbbbbllllllllllllbbbbb.',
      '..bbbllllllllllllllbbb..',
      '..bbbllllllllllllllbbb..',
      '...bbbllllllllllllbbb...',
      '....bbbllllllllllbbb....',
      '......bbbbllllbbbb......',
      '........................',
    ],
    eyes: 'round',
    face: { leftEye: [4, 4], rightEye: [18, 4], mouth: [11, 12], leftBlush: [4, 12], rightBlush: [17, 12] },
    colors: { o: '#1F3322', b: '#8CD06A', l: '#E2F2B0', p: '#FF9999', t: '#5FA84A' },
    hatDy: 1,
  },
  penguin: {
    body: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '.........bbbbbb.........',
      '......bbbbbbbbbbbb......',
      '.....bbbbbbbbbbbbbb.....',
      '....bbbllllbbllllbbb....',
      '...bbbllllllllllllbbb...',
      '...blbllllllllllllbbb...',
      '..bbbllllllllllllllbbb..',
      '..bbbllllllllllllllbbb..',
      '..bbbllllllllllllllbbb..',
      '..bbbllllllllllllllbbb..',
      '..bbbbllllllllllllbbbb..',
      '...bbbllllllllllllbbb...',
      '...bbbllllllllllllbbb...',
      '....bbllllllllllllbb....',
      '.....bllllllllllllb.....',
      '......bllllllllllb......',
      '.........llllll.........',
      '........................',
    ],
    eyes: 'dot',
    face: { ...FACE, leftBlush: [5, 14], rightBlush: [16, 14] },
    colors: { o: '#111A22', b: '#3A4A5C', l: '#FFFFFF', p: '#FFAABB', t: '#2A3644', m: '#FF9922' },
    hatDy: -1,
  },
  fox: {
    body: [
      '........................',
      '........................',
      '..b..................b..',
      '..bb................bb..',
      '..blb..............blb..',
      '..bllb............bllb..',
      '..blllb..........blllb..',
      '..bbbbbb........bbbbbb..',
      '.......bbbbbbbbbb.......',
      '....bbbbbbbbbbbbbbbb....',
      '...bbbbbbbbbbbbbbbbbb...',
      '...bbbbbbbbbbbbbbbbbb...',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bllllbbbbbbbbbbllllb..',
      '..llllllbbbbbbbbllllll..',
      '..lllllllbbbbbblllllll..',
      '..llllllbllllllbllllll..',
      '..bllllbllllllllbllllb..',
      '...bbbbllllllllllbbbb...',
      '...bbbbllllllllllbbbb...',
      '....bbbbllllllllbbbb....',
      '.......bbllllllbb.......',
      '........................',
    ],
    eyes: 'sparkle',
    face: FACE,
    colors: { o: '#3A1F14', b: '#F28A3C', l: '#FFF1E2', p: '#FF7766', t: '#FFF1E2' },
    adult: { grid: ['.oo', 'obb', 'obl', '.oo'], dx: -2, dy: 12 },
    hatDy: 1,
  },
  dragon: {
    body: [
      '........................',
      '........................',
      '....y..............y....',
      '....yy............yy....',
      '.....yy..........yy.....',
      '......yy........yy......',
      '.......bbbbbbbbbb.......',
      '.....bbbbbbbbbbbbbb.....',
      '...bbbbbbbbbbbbbbbbbb...',
      '...bbbbbbbbbbbbbbbbbb...',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbllllbbbbbbbb..',
      '..bbbbbbllllllllbbbbbb..',
      '..bbbbbTTTTTTTTTTbbbbb..',
      '..bbbbbllllllllllbbbbb..',
      '...bbbbTTTTTTTTTTbbbb...',
      '...bbbbllllllllllbbbb...',
      '.....bbbTTTTTTTTbbb.....',
      '.......bbbllllbbb.......',
      '........................',
    ],
    eyes: 'sparkle',
    face: FACE,
    colors: { o: '#163330', b: '#5CC8A8', l: '#EAF8C8', p: '#FF99BB', t: '#3FA88C' },
    adult: { grid: ['oy', 'bo', 'o.'], dx: -1, dy: 15 },
    hatDy: 1,
  },
  unicorn: {
    body: [
      '........................',
      '...........Y............',
      '...........yY...........',
      '...b.......Yy.......b...',
      '...bb......yY......bb...',
      '...bpb.....YY.....bpb...',
      '..kkbbbbbbbbbbbbbbbbb...',
      '.....kbbbbbbbbbbbbb.....',
      '...kbbbbbbbbbbbbbbbbb...',
      '...bbbbbbbbbbbbbbbbbb...',
      '..kbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbllbbbbbbbbb..',
      '..bbbbbbllllllllbbbbbb..',
      '..bbbbbllllllllllbbbbb..',
      '..bbbbbllllllllllbbbbb..',
      '...bbbbllllllllllbbbb...',
      '...bbbbllllllllllbbbb...',
      '.....bbbllllllllbbb.....',
      '.......bbbbllbbbb.......',
      '........................',
    ],
    eyes: 'sparkle',
    face: FACE,
    colors: { o: '#443355', b: '#FAF6FF', l: '#E8DDFF', p: '#FFAACC', t: '#CCBBFF' },
    adult: { grid: ['ok', 'kq', 'o.'], dx: -1, dy: 15 },
    hatDy: 0,
  },
  ghost: {
    body: [
      '........................',
      '........................',
      '........................',
      '........................',
      '.........bbbbbb.........',
      '.......bbbbbbbbbb.......',
      '......bbbbbbbbbbbb......',
      '.....bbbbbbbbbbbbbb.....',
      '....bbbbbbbbbbbbbbbb....',
      '....bbbbbbbbbbbbbbbb....',
      '...bbbbbbbbbbbbbbbbbb...',
      '...bbbbbbbbbbbbbbbbbb...',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbb.bbbb.bbbb.bbbb...',
      '...bb...bb...bb...bb....',
      '........................',
    ],
    eyes: 'round',
    face: { leftEye: [7, 10], rightEye: [15, 10], mouth: [11, 13], leftBlush: [4, 13], rightBlush: [17, 13] },
    colors: { o: '#555577', b: '#F4F6FF', l: '#FFFFFF', p: '#FFBBDD', t: '#DDE2F5' },
    hatDy: -2,
    isFloating: true,
  },
  phoenix: {
    body: [
      '........................',
      '..........y..y..........',
      '.........yRy.Ry.........',
      '.........yRRyRy.........',
      '..........yRRy..........',
      '...........yy...........',
      '...........bb...........',
      '........bbbbbbbb........',
      '......bbbbbbbbbbbb......',
      '....bbbbbbbbbbbbbbbb....',
      '....bbbbbbbbbbbbbbbb....',
      '...bbbbbbbbbbbbbbbbbb...',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '.RbbbbbbbbbbbbbbbbbbbbR.',
      '.yRbbbbbbbbbbbbbbbbbbRy.',
      '..bbbbbbllllllllbbbbbb..',
      '..bbbbbllllllllllbbbbb..',
      '...bbbbllllllllllbbbb...',
      '....bbbllllllllllbbb....',
      '....bbbllllllllllbbb....',
      '......bbllllllllbb......',
      '........bbbbbbbb........',
      '........................',
    ],
    eyes: 'sparkle',
    face: FACE,
    colors: { o: '#441111', b: '#FF6633', l: '#FFCC55', p: '#FFDD88', t: '#FFAA22', m: '#FFDD44' },
    adult: { grid: ['.y', 'Ro', 'yo', 'R.'], dx: -1, dy: 12 },
    hatDy: 2,
  },
  robot: {
    body: [
      '........................',
      '...........RR...........',
      '...........RR...........',
      '............a...........',
      '............a...........',
      '............a...........',
      '...bbbbbbbbbbbbbbbbbb...',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbbllllllllllllbbbb..',
      '..bbbllllllllllllllbbb..',
      'a.bbbllllllllllllllbbb.a',
      'a.bbbllllllllllllllbbb.a',
      'a.bbbllllllllllllllbbb.a',
      '..bbbllllllllllllllbbb..',
      '..bbbllllllllllllllbbb..',
      '..bbbbllllllllllllbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '..bbbTTbbbbbbbbbbTTbbb..',
      '..bbbbbbbaaaaaabbbbbbb..',
      '..bbbbbbbbbbbbbbbbbbbb..',
      '...bbbbbbbbbbbbbbbbbb...',
      '........................',
    ],
    eyes: 'round',
    face: { ...FACE, leftBlush: [6, 14], rightBlush: [15, 14] },
    colors: { o: '#2A2F3A', b: '#AAB4C4', l: '#CCEEFF', p: '#FF99AA', t: '#FFCC44' },
    hatDy: 0,
  },
  axolotl: {
    body: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........bbbbbbbb........',
      'kkk...bbbbbbbbbbbb...kkk',
      '.kk..bbbbbbbbbbbbbb..kk.',
      '....bbbbbbbbbbbbbbbb....',
      'kkk.bbbbbbbbbbbbbbbb.kkk',
      '.kk.bbbbbbbbbbbbbbbb.kk.',
      '...bbbbbbbbbbbbbbbbbb...',
      'kkkbbbbbbbbbbbbbbbbbbkkk',
      '.kkbbbbbbbllllbbbbbbbkk.',
      '....bbbbbllllllbbbbb....',
      '....bbbbllllllllbbbb....',
      '....bbbbllllllllbbbb....',
      '.....bbbbllllllbbbb.....',
      '......bbbbllllbbbb......',
      '........bbbbbbbb........',
      '........................',
    ],
    eyes: 'dot',
    face: { leftEye: [7, 12], rightEye: [15, 12], mouth: [11, 15], leftBlush: [5, 15], rightBlush: [16, 15] },
    colors: { o: '#663344', b: '#FFC4D6', l: '#FFE6EE', p: '#FF88AA', t: '#FF6699' },
    adult: { grid: ['oo', 'bo'], dx: 1, dy: 17 },
    hatDy: 2,
  },
}

export const MOUTHS = {
  small: [[-1, 0, 'm'], [2, 0, 'm'], [0, 1, 'm'], [1, 1, 'm']],
  open: [[0, 0, 'm'], [1, 0, 'm'], [-1, 1, 'm'], [0, 1, 'q'], [1, 1, 'q'], [2, 1, 'm'], [0, 2, 'm'], [1, 2, 'm']],
  flat: [[0, 1, 'm'], [1, 1, 'm']],
  wavy: [[-1, 1, 'm'], [0, 0, 'm'], [1, 1, 'm'], [2, 0, 'm']],
  pout: [[0, 0, 'm'], [1, 0, 'm'], [0, 1, 'm'], [1, 1, 'm']],
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
  '................',
  '......oooo......',
  '....ooEEEEoo....',
  '...oEEEEEEEEo...',
  '...oEEEEEEEEo...',
  '..oEEEWEEEEEco..',
  '.oEEEWEEEEsscco.',
  '.oEEWEWEEEEccco.',
  '.oEEEEEEEEEccco.',
  '.oEEEEEEEEEccco.',
  '.oEEEEEEEEEccco.',
  '.oEEEssEEccccco.',
  '.oEEEEEEEccccco.',
  '.oEEEEEEEccccco.',
  '..oEEEEEEsccco..',
  '..occcccccccco..',
  '...occcccccco...',
  '....ooccccoo....',
  '......oooo......',
]

export const EGG_CRACK: Grid = [
  '................',
  '......oooo......',
  '....ooEEEEoo....',
  '...oEEEEEEEEo...',
  '...oEEEEEEEEo...',
  '..oEEEWEEEEEco..',
  '.oEEEWEEEEsscco.',
  '.oEEWEWEEEEccco.',
  '.oEEoEEEoEEcoco.',
  '.oEoEoEoEoEocco.',
  '.oEEEEoEEEoccco.',
  '.oEEEssEEccccco.',
  '.oEEEEEEEccccco.',
  '.oEEEEEEEccccco.',
  '..oEEEEEEsccco..',
  '..occcccccccco..',
  '...occcccccco...',
  '....ooccccoo....',
  '......oooo......',
]

export const EGG_SHELL: Grid = ['oEEo..oEEo', 'oEEEooEEEo', '.oooooooo.']

export const HAMMER_UP: Grid = ['rRRRr', 'RRRRR', 'rRRRr', '..h..', '..h..', '..h..']
export const HAMMER_DOWN: Grid = ['..h..', '..h..', '..h..', 'rRRRr', 'RRRRR', 'rRRRr']
export const HAMMER_SIDE: Grid = ['.rRr...', 'RRRRhhh', '.rRr...']

export const DOLL: Grid = ['.oooooo.', 'oWWWWWWo', 'oWDWDWDo', 'oWWWWWWo', '.ooooWWo', '.....oo.']
export const DOLL_SQUASHED: Grid = ['........', '........', '.oooooo.', 'oWDWDWDo', 'ooooooWo', '.....oo.']

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

export const HATS: Readonly<Record<string, { grid: Grid; dx: number; dy: number }>> = {
  beanie: { grid: ['......ii......', '...iiiiiiii...', '..iIiIiIiIii..'], dx: 5, dy: 3 },
  ribbon: { grid: ['kk.kk', '.kkk.', 'kk.kk'], dx: 15, dy: 4 },
  crown: { grid: ['y.y.y', 'yYyYy', 'yyyyy'], dx: 9, dy: 3 },
}

export const NECKS: Readonly<Record<string, { grid: Grid; dx: number; dy: number }>> = {
  scarf: { grid: ['.RRRRRRRRRRRRRRRRR.', '..RRrr.........RRR.', '...............RR..'], dx: 2, dy: 19 },
}

export const CRITTERS: Readonly<Record<string, { stand: Grid; step: Grid; fur: string }>> = {
  chick: {
    stand: ['...o...', '..oLo..', '.oLLLo.', 'oLeLeLo', 'oLLGLLo', 'gLLLLLg', '.oLLLo.', '..ooo..', '.G...G.'],
    step: ['...o...', '..oLo..', '.oLLLo.', 'oLeLeLo', 'oLLGLLo', 'gLLLLLg', '.oLLLo.', '..ooo..', '..G.G..'],
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
}

export const ROOM_PROPS: Readonly<Record<string, Grid>> = {
  plant: ['.nn.n', 'n.Nnn', '.nNn.', '.ttt.', '.ttt.'],
  lamp: ['.yyy.', 'yYYYy', '.yyy.', '..h..', '..h..', '.hhh.'],
  rug: ['.ssssssssssssssss.', 'sSsSsSsSsSsSsSsSss', '.ssssssssssssssss.'],
}

const SOLID: ReadonlySet<string> = new Set(['b', 'l'])

const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const

const isFilled = (mask: Grid, x: number, y: number): boolean => {
  const char = mask[y]?.[x]
  return char !== undefined && char !== '.' && char !== 'o'
}

type Center = { x: number; y: number }

const centerOf = (mask: Grid): Center => {
  const cells = mask.flatMap((row, y) => [...row].flatMap((char, x) => (SOLID.has(char) ? [[x, y] as const] : [])))
  const xs = cells.map(([x]) => x)
  const ys = cells.map(([, y]) => y)
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

const shadeBody = (mask: Grid, x: number, y: number, center: Center): string => {
  const isRightEdge = !isFilled(mask, x + 1, y)
  const isBottomEdge = !isFilled(mask, x, y + 1)
  if (isRightEdge || isBottomEdge) {
    return (isRightEdge && y >= center.y - 1) || (isBottomEdge && x >= center.x) ? 'K' : 'B'
  }
  if (!isFilled(mask, x + 2, y) || (!isFilled(mask, x, y + 2) && x >= center.x)) {
    return 'B'
  }
  return (!isFilled(mask, x - 1, y) || !isFilled(mask, x, y - 1)) && x < center.x && y < center.y ? 'H' : 'b'
}

const shadeCell = (mask: Grid, x: number, y: number, center: Center): string => {
  const char = mask[y]?.[x] ?? '.'
  if (char === '.') {
    return SIDES.some(([dx, dy]) => isFilled(mask, x + dx, y + dy)) ? 'o' : '.'
  }
  if (char === 'l') {
    return (mask[y]?.[x + 1] !== 'l' || mask[y + 1]?.[x] !== 'l') && x >= center.x - 1 ? 'J' : 'l'
  }
  return char === 'b' ? shadeBody(mask, x, y, center) : char
}

export const shade = (mask: Grid): Grid => {
  const center = centerOf(mask)
  return mask.map((row, y) => [...row].map((_, x) => shadeCell(mask, x, y, center)).join(''))
}

const widen = (row: string): string => {
  const left = row.search(/[^.]/)
  const right = row.length - 1 - [...row].reverse().join('').search(/[^.]/)
  if (left < 2 || right > row.length - 3) {
    return row
  }
  return `${row.slice(1, left)}${row[left]}${row.slice(left, right + 1)}${row[right]}${row.slice(right + 1, -1)}`
}

export const breathe = (mask: Grid): Grid => {
  const top = mask.findIndex(row => row.replaceAll('.', '').length >= 12)
  if (top < 0) {
    return mask
  }
  const squeezed = ['.'.repeat(mask[0]?.length ?? 0), ...mask.slice(0, top + 1), ...mask.slice(top + 2)]
  return squeezed.map((row, y) => (y > top + 1 ? widen(row) : row))
}

const bodies = new Map<string, Grid>()

export const bodyOf = (species: TokoSpecies, isBreathing = false): Grid => {
  const key = `${species}:${isBreathing}`
  const cached = bodies.get(key)
  if (cached !== undefined) {
    return cached
  }
  const mask = SPECIES_ART[species].body
  const body = shade(isBreathing ? breathe(mask) : mask)
  bodies.set(key, body)
  return body
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
  D: '#888899',
  f: '#DDFF66',
  F: '#889944',
  i: '#5577CC',
  I: '#334499',
  v: '#663355',
  V: '#AA4477',
  x: '#888899',
}

const toHsl = (value: string): readonly [number, number, number] => {
  const parsed = Number.parseInt(value.replace('#', ''), 16)
  const [r, g, b] = [(parsed >> 16) & 0xff, (parsed >> 8) & 0xff, parsed & 0xff].map(channel => channel / 255) as [number, number, number]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const light = (max + min) / 2
  const delta = max - min
  if (delta === 0) {
    return [0, 0, light]
  }
  const saturation = delta / (1 - Math.abs(2 * light - 1))
  const hue = max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
  return [hue / 6, saturation, light]
}

const fromHsl = (hue: number, saturation: number, light: number): string => {
  const chroma = (1 - Math.abs(2 * light - 1)) * saturation
  const sector = hue * 6
  const second = chroma * (1 - Math.abs((sector % 2) - 1))
  const [r, g, b] = [
    [chroma, second, 0],
    [second, chroma, 0],
    [0, chroma, second],
    [0, second, chroma],
    [second, 0, chroma],
    [chroma, 0, second],
  ][Math.floor(sector) % 6] ?? [0, 0, 0]
  const lift = light - chroma / 2
  return `#${[r, g, b].map(channel => Math.round((channel + lift) * 255).toString(16).padStart(2, '0')).join('')}`
}

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value))

export const shiftColor = (value: string, light: number, saturation: number, hue: number): string => {
  const [h, s, l] = toHsl(value)
  return fromHsl((h + hue + 1) % 1, clampUnit(s + saturation), clampUnit(l + light))
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
    ['H', shiftColor(body.b, 0.1, 0, 0.01)],
    ['B', shiftColor(body.b, -0.12, 0.08, -0.02)],
    ['K', shiftColor(body.b, -0.24, 0.08, -0.04)],
    ['J', shiftColor(body.l, -0.08, 0.05, -0.02)],
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
