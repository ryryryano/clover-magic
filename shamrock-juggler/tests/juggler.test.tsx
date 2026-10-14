import { expect, mock, test } from 'claude-code/testing'

import { BALLS, clawd, sky } from '../hooks/frames'
import { SCENES, rows } from '../hooks/pixels'

const count = (tick: number) =>
  sky(tick).flat().filter(cell => cell.isShamrock).length

test('three shamrocks are always in the air, never stacked', async () => {
  for (let tick = 0; tick < 24; tick += 1) {
    expect(count(tick)).toBe(BALLS)
  }
})

test('the mascot flaps its arms between frames', async () => {
  expect(clawd(0)[0]).not.toBe(clawd(1)[0])
})

test('pixel styles keep three shamrocks apart and inside the sky', async () => {
  for (const style of ['8bit', '16bit', '32bit'] as const) {
    const scene = SCENES[style]
    for (let tick = 0; tick < 60; tick += 1) {
      const balls = scene.balls(tick)
      expect(balls.length).toBe(BALLS)
      for (const ball of balls) {
        expect(ball.x).toBeGreaterThanOrEqual(0)
        expect(ball.y).toBeGreaterThanOrEqual(0)
        expect(ball.x + ball.size).toBeLessThanOrEqual(scene.width)
        expect(ball.y + ball.size).toBeLessThanOrEqual(scene.ground)
      }
      expect(new Set(balls.map(b => `${b.x},${b.y}`)).size).toBe(BALLS)
    }
    const drawn = rows(style, 0)
    expect(drawn.length).toBe(Math.ceil(scene.height / 2))
    for (const runs of drawn) {
      expect(runs.reduce((sum, run) => sum + run.text.length, 0)).toBe(scene.width)
    }
  }
})

test('/shamrocks draws each style in the pane and toggles off', async ($, on) => {
  mock.clock(on)
  on('ui.open', async () => ({ value: { isPlaced: true } }) as never)
  on('ui.close', async () => ({ value: undefined }) as never)
  const run = (args: string) => $.command.run({ command: 'shamrocks', args } as never)

  for (const [args, style, mark] of [
    ['kawaii', '32bit', /32-bit/],
    ['8bit', '8bit', /8-bit/],
    ['16', '16bit', /16-bit/],
    ['ascii', 'ascii', /▐▛███▜▌/],
  ] as const) {
    expect((await run(args)).text).toContain(`(${style})`)
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({
        plugin: 'shamrock-juggler',
        surface,
        component: 'Pane',
        requestId: 'shamrock-juggler',
        props: { title: 'Shamrocks' } as never,
      })
      expect(await ui.find({ type: 'Text', text: mark })).toBeDefined()
      expect(await ui.find({ type: 'Text', text: /Claude loves Clover Security/ })).toBeDefined()
      await ui.unmount()
    }
  }

  expect((await run('64bit')).text).toContain('Unknown style')
  expect((await run('')).text).toContain('caught')
})
