// The juggling cascade: shamrocks ride a loop of cells above the mascot.
// Columns are 0..16, rows 0..4; the mascot sits on rows 5..7.
export const WIDTH = 17
export const SKY = 5
export const BALLS = 3

const PATH: ReadonlyArray<readonly [number, number]> = [
  [4, 4], [3, 3], [3, 2], [4, 1], [6, 0], [8, 0],
  [10, 0], [12, 1], [13, 2], [13, 3], [12, 4], [8, 4],
]

export type Cell = { text: string; isShamrock: boolean }

const CLAWD_UP = ['   ╲ ▐▛███▜▌ ╱   ', '    ▝▜█████▛▘    ', '      ▘▘ ▝▝      ']
const CLAWD_DOWN = ['   ─ ▐▛███▜▌ ─   ', '    ▝▜█████▛▘    ', '      ▘▘ ▝▝      ']

// The sky as rows of runs, each run plain spaces or one shamrock.
export const sky = (tick: number): Cell[][] => {
  const taken = new Set<string>()
  for (let ball = 0; ball < BALLS; ball += 1) {
    const [x, y] = PATH[(tick + ball * (PATH.length / BALLS)) % PATH.length] ?? [0, 0]
    taken.add(`${x},${y}`)
  }

  return Array.from({ length: SKY }, (_, y) => {
    const row: Cell[] = []
    let gap = ''
    for (let x = 0; x < WIDTH; x += 1) {
      if (taken.has(`${x},${y}`)) {
        if (gap) row.push({ text: gap, isShamrock: false })
        row.push({ text: '☘', isShamrock: true })
        gap = ''
      } else {
        gap += ' '
      }
    }
    if (gap) row.push({ text: gap, isShamrock: false })

    return row
  })
}

// Arms up while a shamrock is leaving a hand, down in between.
export const clawd = (tick: number): string[] => (tick % 2 === 0 ? CLAWD_UP : CLAWD_DOWN)
