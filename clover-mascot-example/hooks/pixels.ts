import { ALPHABET, CLIPS, PALETTE } from './clips'
import type { Clip } from './clips'

// A run of cells sharing one glyph and colors: what one Text draws.
export type Run = { text: string; color?: string; backgroundColor?: string }

const color = (letter: string | undefined): string | undefined =>
  letter === undefined || letter === '.' ? undefined : PALETTE[ALPHABET.indexOf(letter) - 1]

// One frame as rows of half blocks: each cell shows two pixels, top and bottom.
const decode = (clip: Clip, frame: string): Run[][] => {
  const out: Run[][] = []
  for (let y = 0; y < clip.height; y += 2) {
    const runs: Run[] = []
    for (let x = 0; x < clip.width; x += 1) {
      const up = color(frame[y * clip.width + x])
      const down = y + 1 < clip.height ? color(frame[(y + 1) * clip.width + x]) : undefined
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

const cache = new Map<string, Run[][]>()

export const clipOf = (key: string): Clip => CLIPS.find(clip => clip.key === key) ?? CLIPS[0]!

export const rows = (key: string, frame: number): Run[][] => {
  const clip = clipOf(key)
  const index = ((frame % clip.frames.length) + clip.frames.length) % clip.frames.length
  const id = `${clip.key}:${index}`
  const hit = cache.get(id)
  if (hit) return hit
  const drawn = decode(clip, clip.frames[index] ?? '')
  cache.set(id, drawn)

  return drawn
}
