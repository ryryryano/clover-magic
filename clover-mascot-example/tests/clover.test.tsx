import { expect, mock, test } from 'claude-code/testing'

import { ALPHABET, CLIPS, PALETTE } from '../hooks/clips'
import { rows } from '../hooks/pixels'

test('every clip has whole frames drawn from the palette', async () => {
  expect(CLIPS.map(clip => clip.key)).toEqual(['idea', 'send'])
  for (const clip of CLIPS) {
    expect(clip.frames.length).toBe(16)
    for (const frame of clip.frames) {
      expect(frame.length).toBe(clip.width * clip.height)
      for (const letter of new Set(frame)) {
        const index = ALPHABET.indexOf(letter)
        expect(index).toBeGreaterThanOrEqual(0)
        expect(index).toBeLessThanOrEqual(PALETTE.length)
      }
    }
    for (let n = 0; n < clip.frames.length; n += 1) {
      const drawn = rows(clip.key, n)
      expect(drawn.length).toBe(Math.ceil(clip.height / 2))
      for (const runs of drawn) {
        expect(runs.reduce((sum, run) => sum + run.text.length, 0)).toBe(clip.width)
      }
    }
  }
})

test('/clover-mascot-example shows idea and send side by side, or one alone', async ($, on) => {
  mock.clock(on)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  on('ui.close', async () => ({ value: undefined }) as never)
  const run = (args: string) => $.command.run({ command: 'clover-mascot-example', args } as never)
  const mount = (surface: 'terminal' | 'desktop') =>
    $.ui.mount({
      plugin: 'clover-mascot-example',
      surface,
      component: 'Pane',
      requestId: 'clover-mascot-example',
      props: { title: 'Clover' } as never,
    })

  expect((await run('')).text).toContain('Idea + Send')
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mount(surface)
    const tree = JSON.stringify(await ui.drawn())
    expect(tree).toContain('clip-idea')
    expect(tree).toContain('clip-send')
    expect(tree).toContain('"row"')
    await ui.unmount()
  }

  expect((await run('send')).text).toContain('Clover mascot: Send.')
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mount(surface)
    const tree = JSON.stringify(await ui.drawn())
    expect(tree).toContain('clip-send')
    expect(tree).not.toContain('clip-idea')
    await ui.unmount()
  }

  expect((await run('idea')).text).toContain('Clover mascot: Idea.')
  expect((await run('wave')).text).toContain('Unknown animation')
  expect((await run('')).text).toContain('waved goodbye')
})
