// Pixel-art juggling: sprites painted onto a canvas of pixels, then drawn
// as half blocks, so one terminal cell holds two square pixels (top, bottom).

export type Style = '8bit' | '16bit' | '32bit'

// Screen pixels, row-major: a hex color, or undefined for empty.
export type Grid = (string | undefined)[][]

// A run of cells sharing one glyph and colors: what one Text draws.
export type Run = { text: string; color?: string; backgroundColor?: string }

type Sprite = readonly string[]
type Palette = Readonly<Record<string, string>>

type Look = {
  width: number // canvas size in art pixels
  height: number
  scale: number // screen pixels per art pixel
  palette: Palette
  shamrock: Sprite
  clawd: Sprite
  clawdAt: readonly [number, number]
  arms: { up: Sprite; down: Sprite; lift: number } // lift: rows the raised arms start above the body
  steps: number // positions around the loop
  orbit: { cx: number; cy: number; rx: number; ry: number }
  ticksPerStep: number // 8-bit moves on every other tick: choppier
}

// 8-bit: four flat colors, tiny sprites shown at double size.
const EIGHT: Look = {
  width: 16,
  height: 14,
  scale: 2,
  palette: { O: '#E07040', K: '#000000', G: '#00A800', D: '#005800' },
  shamrock: ['.G.', 'GGG', '.D.'],
  clawd: [
    '.OOOOOOOO.',
    '.OOKOOKOO.',
    '.OOOOOOOO.',
    '.OOOOOOOO.',
    '.O.O..O.O.',
  ],
  clawdAt: [3, 9],
  arms: {
    up: ['O........O', 'O........O'],
    down: ['..........', '..........', 'O........O'],
    lift: 1,
  },
  steps: 12,
  orbit: { cx: 6.5, cy: 3, rx: 5.5, ry: 3 },
  ticksPerStep: 2,
}

// 16-bit: outlined, shaded sprites at full resolution, three greens.
const SIXTEEN: Look = {
  width: 32,
  height: 28,
  scale: 1,
  palette: {
    X: '#5C2A16',
    H: '#F2A584',
    O: '#D97757',
    S: '#A8543A',
    K: '#1E120C',
    W: '#FFFFFF',
    L: '#8EE07A',
    G: '#34A853',
    D: '#1E6B30',
  },
  shamrock: [
    '..L.L..',
    '..LGG..',
    'LG.G.GL',
    'GGGDGGG',
    'LG.D.GL',
    '...D...',
    '....D..',
  ],
  clawd: [
    '...XXXXXXXXXXXXXX...',
    '..XHHHHHHHHHHHHHHX..',
    '..XOOOOOOOOOOOOOOX..',
    '..XOOKWOOOOOOKWOOX..',
    '..XOOKKOOOOOOKKOOX..',
    '..XOOOOOOOOOOOOOOX..',
    '..XOOOOOOOOOOOOOOX..',
    '..XSSSSSSSSSSSSSSX..',
    '...XXXXXXXXXXXXXX...',
    '....SS.SS..SS.SS....',
    '....SS.SS..SS.SS....',
  ],
  clawdAt: [6, 17],
  arms: {
    up: [
      'O..................O',
      'O..................O',
      '.O................O.',
      '.O................O.',
      '.OO..............OO.',
    ],
    down: [
      '....................',
      '....................',
      '....................',
      '....................',
      '....................',
      'OOO..............OOO',
      'S..................S',
    ],
    lift: 0,
  },
  steps: 24,
  orbit: { cx: 12.5, cy: 5, rx: 11, ry: 5 },
  ticksPerStep: 1,
}

export const SPRITE_LOOKS = { '8bit': EIGHT, '16bit': SIXTEEN } satisfies Record<string, Look>
type SpriteStyle = keyof typeof SPRITE_LOOKS

export const BALLS = 3

type Canvas = (string | undefined)[][]

const paint = (canvas: Canvas, sprite: Sprite, left: number, top: number) => {
  sprite.forEach((line, y) => {
    ;[...line].forEach((pixel, x) => {
      const row = canvas[top + y]
      if (pixel !== '.' && row && left + x >= 0 && left + x < row.length) {
        row[left + x] = pixel
      }
    })
  })
}

// Where each shamrock's top-left corner sits at this tick.
const spritePositions = (style: SpriteStyle, tick: number): [number, number][] => {
  const look = SPRITE_LOOKS[style]
  const step = Math.floor(tick / look.ticksPerStep)
  const { cx, cy, rx, ry } = look.orbit

  return Array.from({ length: BALLS }, (_, ball) => {
    const i = (step + (ball * look.steps) / BALLS) % look.steps
    const angle = (2 * Math.PI * i) / look.steps

    return [Math.round(cx + rx * Math.cos(angle)), Math.round(cy - ry * Math.sin(angle))]
  })
}

// The art-pixel canvas for this tick: palette letters, undefined for empty.
export const canvas = (style: SpriteStyle, tick: number): Canvas => {
  const look = SPRITE_LOOKS[style]
  const art: Canvas = Array.from({ length: look.height }, () =>
    Array.from({ length: look.width }, () => undefined),
  )
  const [left, top] = look.clawdAt
  const isUp = Math.floor(tick / (look.ticksPerStep * 2)) % 2 === 0
  paint(art, look.clawd, left, top)
  if (isUp) paint(art, look.arms.up, left, top - look.arms.lift)
  else paint(art, look.arms.down, left, top)
  for (const [x, y] of spritePositions(style, tick)) paint(art, look.shamrock, x, y)

  return art
}

// The sprite canvas in screen pixels: letters through the palette, scaled.
const spriteGrid = (style: SpriteStyle, tick: number): Grid => {
  const look = SPRITE_LOOKS[style]
  const art = canvas(style, tick)

  return Array.from({ length: look.height * look.scale }, (_, y) =>
    Array.from({ length: look.width * look.scale }, (_, x) => {
      const letter = art[Math.floor(y / look.scale)]?.[Math.floor(x / look.scale)]

      return letter === undefined ? undefined : look.palette[letter]
    }),
  )
}

// What every style answers, in screen pixels.
export type Scene = {
  label: string
  width: number
  height: number
  ground: number // the mascot's top row: shamrocks stay above it
  draw: (tick: number) => Grid
  balls: (tick: number) => { x: number; y: number; size: number }[]
}

const spriteScene = (style: SpriteStyle, label: string): Scene => {
  const look = SPRITE_LOOKS[style]
  const size = (look.shamrock[0]?.length ?? 0) * look.scale

  return {
    label,
    width: look.width * look.scale,
    height: look.height * look.scale,
    ground: look.clawdAt[1] * look.scale,
    draw: tick => spriteGrid(style, tick),
    balls: tick =>
      spritePositions(style, tick).map(([x, y]) => ({ x: x * look.scale, y: y * look.scale, size })),
  }
}

// ---- 32-bit kawaii: drawn from shapes, every pixel its own color ----

const hex = (color: string): [number, number, number] => [
  parseInt(color.slice(1, 3), 16),
  parseInt(color.slice(3, 5), 16),
  parseInt(color.slice(5, 7), 16),
]

const mix = (a: string, b: string, t: number): string => {
  const k = Math.min(1, Math.max(0, t))
  const [ar, ag, ab] = hex(a)
  const [br, bg, bb] = hex(b)
  const part = (from: number, to: number) =>
    Math.round(from + (to - from) * k).toString(16).padStart(2, '0')

  return `#${part(ar, br)}${part(ag, bg)}${part(ab, bb)}`
}

const KW = 48
const KH = 46
const BODY = { x0: 11, x1: 36, y0: 28, y1: 42, r: 3.2 }
const EYES = [18, 29] as const
const EYE_Y = BODY.y0 + 6
const STEPS = 30
const SPIN = 0.3
const REACH = 6 // a shamrock's radius in pixels

const KAWAII = {
  skyTop: '#E9DDFF',
  skyBottom: '#FFE0EC',
  shadow: '#D2B8E6',
  star: '#FFF4B0',
  white: '#FFFFFF',
  bodyTop: '#FFC2A6',
  bodyBottom: '#D97757',
  bodySide: '#B85E40',
  outline: '#8A3E26',
  shine: '#FFE7DA',
  arm: '#F4A684',
  leg: '#B85E40',
  eye: '#2B1A33',
  eyeLow: '#5A3D7A',
  blush: '#FF8FB1',
  mouth: '#6B2A2A',
  heart: '#FF6F9C',
  heartShine: '#FFC2D6',
  leafCore: '#2E9E50',
  leafTip: '#9BEA8E',
  leafEdge: '#1E6B3A',
  leafShine: '#E6FFE0',
  stem: '#3A8F4A',
  trail: '#FFF7B8',
  trailFar: '#FFC8DD',
} as const

const STARS: ReadonlyArray<readonly [number, number]> = [
  [4, 3], [42, 4], [30, 1], [8, 19], [44, 22], [2, 34], [45, 38], [17, 9], [36, 14],
]

type Shape = (x: number, y: number) => boolean

// Fills a shape, its edge pixels (a neighbour outside it) in the outline.
const fill = (grid: Grid, inside: Shape, color: (x: number, y: number) => string, edge?: string) => {
  grid.forEach((row, y) =>
    row.forEach((_, x) => {
      if (!inside(x, y)) return
      const isEdge =
        edge !== undefined &&
        (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1))
      row[x] = isEdge ? edge : color(x, y)
    }),
  )
}

const dot = (grid: Grid, x: number, y: number, color: string) => {
  const row = grid[y]
  if (row && x >= 0 && x < row.length) row[x] = color
}

const disc = (cx: number, cy: number, rx: number, ry: number): Shape => (x, y) =>
  ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1

const inBody: Shape = (x, y) => {
  const { x0, x1, y0, y1, r } = BODY
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  const dx = x < x0 + r ? x0 + r - x : x > x1 - r ? x - (x1 - r) : 0
  const dy = y < y0 + r ? y0 + r - y : y > y1 - r ? y - (y1 - r) : 0

  return dx * dx + dy * dy <= r * r + 0.5
}

const orbit = (step: number) => {
  const angle = (2 * Math.PI * (((step % STEPS) + STEPS) % STEPS)) / STEPS

  return { cx: Math.round(24 + 17 * Math.cos(angle)), cy: Math.round(13 - 7.5 * Math.sin(angle)) }
}

const ballSteps = (tick: number) =>
  Array.from({ length: BALLS }, (_, ball) => tick + (ball * STEPS) / BALLS)

// Three heart leaves around a centre, turned by `spin`, and a stem.
const shamrock = (cx: number, cy: number, spin: number) => {
  const local = (x: number, y: number, angle: number) => {
    const dx = x - cx
    const dy = y - cy

    return {
      u: dx * Math.cos(angle) + dy * Math.sin(angle),
      v: -dx * Math.sin(angle) + dy * Math.cos(angle),
    }
  }
  const leaves = [0, 1, 2].map(k => spin - Math.PI / 2 + (k * 2 * Math.PI) / 3)
  const leafAt = (x: number, y: number) =>
    leaves.find(angle => {
      const { u, v } = local(x, y, angle)
      const lobe = (u - 3.3) ** 2 + (Math.abs(v) - 1.25) ** 2 <= 1.9 ** 2
      const wedge = u >= 0 && u <= 3.6 && Math.abs(v) <= u * 0.8 + 0.3

      return lobe || wedge
    })
  const isStem = (x: number, y: number) => {
    const { u, v } = local(x, y, spin + Math.PI / 2)

    return u >= 0 && u <= 5 && Math.abs(v - u * u * 0.04) <= 0.55
  }
  const inside: Shape = (x, y) => leafAt(x, y) !== undefined || isStem(x, y)
  const color = (x: number, y: number) => {
    const angle = leafAt(x, y)
    if (angle === undefined) return KAWAII.stem
    const { u, v } = local(x, y, angle)
    if (Math.abs(u - 3.4) < 0.6 && Math.abs(v + 1.2) < 0.6) return KAWAII.leafShine

    return mix(KAWAII.leafCore, KAWAII.leafTip, u / 4.5)
  }

  return { inside, color }
}

const sparkle = (grid: Grid, x: number, y: number, isBig: boolean) => {
  dot(grid, x, y, KAWAII.white)
  if (!isBig) return
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) dot(grid, x + dx, y + dy, KAWAII.star)
}

const drawKawaii = (tick: number): Grid => {
  const grid: Grid = Array.from({ length: KH }, (_, y) =>
    Array.from({ length: KW }, () => mix(KAWAII.skyTop, KAWAII.skyBottom, y / (KH - 1))),
  )

  STARS.forEach(([x, y], i) => {
    const phase = (tick + i * 3) % 12
    if (phase < 8) sparkle(grid, x, y, phase >= 2 && phase < 6)
  })

  // A heart floats up from Claude's head.
  const rise = tick % 30
  if (rise < 20) {
    const hx = 22 + Math.round(Math.sin(rise * 0.5) * 2)
    const hy = Math.round(BODY.y0 - 3 - rise * 0.6)
    ;['.X.X.', 'XXXXX', '.XXX.', '..X..'].forEach((line, dy) =>
      [...line].forEach((pixel, dx) => {
        if (pixel === 'X') dot(grid, hx + dx, hy + dy, KAWAII.heart)
      }),
    )
    dot(grid, hx + 1, hy + 1, KAWAII.heartShine)
  }

  // Shadow, arms, body, legs.
  fill(grid, disc(23.5, BODY.y1 + 3, 13, 1.2), (x, y) => mix(grid[y]?.[x] ?? KAWAII.skyBottom, KAWAII.shadow, 0.6))
  const isUp = Math.floor(tick / 4) % 2 === 0
  for (const side of [-1, 1] as const) {
    const edge = side < 0 ? BODY.x0 : BODY.x1
    const arm = isUp
      ? (x: number, y: number) =>
          disc(edge + side * 1.5, BODY.y0 + 4, 1.6, 2)(x, y) || disc(edge + side * 2.5, BODY.y0 + 1, 1.5, 1.5)(x, y)
      : disc(edge + side * 2, BODY.y0 + 9, 2.2, 1.6)
    fill(grid, arm, () => KAWAII.arm, KAWAII.outline)
  }
  fill(
    grid,
    inBody,
    (x, y) => {
      const base = mix(KAWAII.bodyTop, KAWAII.bodyBottom, (y - BODY.y0) / (BODY.y1 - BODY.y0))

      return x > BODY.x1 - 3 ? mix(base, KAWAII.bodySide, 0.4) : base
    },
    KAWAII.outline,
  )
  for (const [x, y] of [[BODY.x0 + 3, BODY.y0 + 2], [BODY.x0 + 4, BODY.y0 + 2], [BODY.x0 + 5, BODY.y0 + 2], [BODY.x0 + 3, BODY.y0 + 3]] as const) {
    dot(grid, x, y, KAWAII.shine)
  }
  for (const x of [13, 18, 28, 33]) {
    for (const dx of [0, 1]) {
      dot(grid, x + dx, BODY.y1 + 1, KAWAII.leg)
      dot(grid, x + dx, BODY.y1 + 2, KAWAII.outline)
    }
  }

  // Face: big sparkly eyes (happy ^ ^ when blinking), blush, ω mouth.
  const isBlink = tick % 50 < 3
  for (const ex of EYES) {
    fill(grid, disc(ex + (ex < 24 ? -4 : 4), EYE_Y + 3, 2, 1), (x, y) => mix(grid[y]?.[x] ?? KAWAII.bodyTop, KAWAII.blush, 0.7))
    if (isBlink) {
      for (const [dx, dy] of [[-2, 1], [-1, 0], [0, -1], [1, 0], [2, 1]] as const) dot(grid, ex + dx, EYE_Y + dy, KAWAII.eye)
      continue
    }
    fill(grid, disc(ex, EYE_Y, 2.3, 2.9), (_, y) => (y > EYE_Y + 1 ? KAWAII.eyeLow : KAWAII.eye))
    for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0]] as const) dot(grid, ex + dx, EYE_Y + dy, KAWAII.white)
    dot(grid, ex + 1, EYE_Y + 1, KAWAII.white)
  }
  for (const [x, y] of [[21, BODY.y0 + 10], [23, BODY.y0 + 10], [25, BODY.y0 + 10], [22, BODY.y0 + 11], [24, BODY.y0 + 11]] as const) dot(grid, x, y, KAWAII.mouth)

  // Sparkle trails, then the spinning shamrocks.
  for (const step of ballSteps(tick)) {
    const near = orbit(step - 2)
    const far = orbit(step - 4)
    sparkle(grid, near.cx, near.cy, tick % 2 === 0)
    dot(grid, far.cx, far.cy, KAWAII.trailFar)
  }
  ballSteps(tick).forEach((step, ball) => {
    const { cx, cy } = orbit(step)
    const leaf = shamrock(cx, cy, tick * SPIN + ball * 2)
    fill(grid, leaf.inside, leaf.color, KAWAII.leafEdge)
  })

  return grid
}

const kawaiiScene: Scene = {
  label: '32-bit kawaii',
  width: KW,
  height: KH,
  ground: BODY.y0,
  draw: drawKawaii,
  balls: tick =>
    ballSteps(tick).map(step => {
      const { cx, cy } = orbit(step)

      return { x: cx - REACH, y: cy - REACH, size: REACH * 2 + 1 }
    }),
}

export const SCENES: Readonly<Record<Style, Scene>> = {
  '8bit': spriteScene('8bit', '8-bit'),
  '16bit': spriteScene('16bit', '16-bit'),
  '32bit': kawaiiScene,
}

// A screen-pixel grid as rows of half-block runs: one cell, two pixels.
export const rows = (style: Style, tick: number): Run[][] => {
  const grid = SCENES[style].draw(tick)
  const out: Run[][] = []
  for (let y = 0; y < grid.length; y += 2) {
    const runs: Run[] = []
    const top = grid[y] ?? []
    const bottom = grid[y + 1] ?? []
    for (let x = 0; x < top.length; x += 1) {
      const up = top[x]
      const down = bottom[x]
      const cell: Run =
        up && down
          ? { text: '▀', color: up, backgroundColor: down }
          : up
            ? { text: '▀', color: up }
            : down
              ? { text: '▄', color: down }
              : { text: ' ' }
      const last = runs[runs.length - 1]
      if (last && last.color === cell.color && last.backgroundColor === cell.backgroundColor && last.text[0] === cell.text) {
        last.text += cell.text
      } else {
        runs.push(cell)
      }
    }
    out.push(runs)
  }

  return out
}
