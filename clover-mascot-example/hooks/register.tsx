import { atom, read, update } from 'claude-code'
import type { Register, Timer } from 'claude-code'

import type { Showing } from '../types'
import { CLIPS } from './clips'
import { rows } from './pixels'

const PANE = 'clover-mascot-example'
const FRAME_MS = CLIPS[0]?.frameMs ?? 150

const showing = atom({ plugin: 'clover-mascot-example', key: 'showing' } as const, 'both' as Showing)
const frame = atom({ plugin: 'clover-mascot-example', key: 'frame' } as const, 0)

const asShowing = (args: string): Showing | undefined => {
  const word = args.trim().toLowerCase()
  if (word === '' || word === 'both' || word === 'all') return 'both'
  if (word === 'idea') return 'idea'
  if (word === 'send') return 'send'

  return undefined
}

export const register: Register = on => {
  let timer: Timer | undefined

  const stop = () => {
    timer?.cancel()
    timer = undefined
  }

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'clover-mascot-example',
      description: 'Toggle the animated clover mascots, side by side',
      argumentHint: '[idea | send]',
    })

    return next(e)
  })

  on('command.run', { command: 'clover-mascot-example' }, async ($, e) => {
    const picked = asShowing(e.args)
    if (!picked) {
      return { text: `Unknown animation "${e.args.trim()}". Try: idea, send, or nothing for both.` }
    }

    if (timer && !e.args.trim()) {
      await $.ui.close({ id: PANE })
      stop()

      return { text: 'The clover mascots waved goodbye. ☘' }
    }

    await update($, showing, () => picked)
    await $.ui.open({ id: PANE, title: 'Clover' })
    timer ??= $.clock.every(FRAME_MS, () => {
      void update($, frame, n => (n + 1) % 4800)
    })
    const names = CLIPS.filter(clip => picked === 'both' || clip.key === picked).map(clip => clip.title)

    return { text: `Clover mascot: ${names.join(' + ')}. Run /clover-mascot-example again to close.` }
  })

  // The person closing the pane stops the animation too.
  on('ui.close', async ($, e, next) => {
    if (e.id === PANE) stop()

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const shown = await read($, showing)
    const n = await read($, frame)
    const clips = CLIPS.filter(clip => shown === 'both' || clip.key === shown)

    // Side by side, feet on one line; a pane too narrow for both wraps them.
    return (
      <Box flexDirection="row" flexWrap="wrap" alignItems="flex-end" justifyContent="center" columnGap={4}>
        {clips.map(clip => (
          <Box key={`clip-${clip.key}`} flexDirection="column" alignItems="center">
            {rows(clip.key, n).map((runs, y) => (
              <Text key={`px-${y}`}>
                {runs.map((run, i) =>
                  run.color ? (
                    <Text key={`r-${i}`} color={run.color} backgroundColor={run.backgroundColor}>
                      {run.text}
                    </Text>
                  ) : (
                    run.text
                  ),
                )}
              </Text>
            ))}
            <Text key="title" dimColor>
              {clip.title}
            </Text>
          </Box>
        ))}
      </Box>
    )
  })
}
