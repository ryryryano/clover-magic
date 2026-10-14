import { atom, read, update } from 'claude-code'
import type { Register, Timer } from 'claude-code'

import type { JuggleStyle } from '../types'
import { clawd, sky } from './frames'
import { rows } from './pixels'

const PANE = 'shamrock-juggler'
const TITLE = 'Shamrocks'
const CLAUDE_ORANGE = '#D97757'
const SHAMROCK_GREEN = '#3BB143'
const FRAME_MS = 120
const STYLES: readonly JuggleStyle[] = ['32bit', '16bit', '8bit', 'ascii']
const KAWAII_PINK = '#FF6F9C'

const bits = (look: JuggleStyle): string => look.replace('bit', '-bit')

const tick = atom({ plugin: 'shamrock-juggler', key: 'tick' } as const, 0)
const style = atom({ plugin: 'shamrock-juggler', key: 'style' } as const, '32bit' as JuggleStyle)

const asStyle = (args: string): JuggleStyle | undefined => {
  const word = args.trim().toLowerCase().replace(/[\s-]/g, '')
  if (word === '8' || word === '8bit') return '8bit'
  if (word === '16' || word === '16bit') return '16bit'
  if (word === '32' || word === '32bit' || word === 'kawaii') return '32bit'
  if (word === 'ascii' || word === 'text') return 'ascii'

  return undefined
}

export const register: Register = on => {
  let timer: Timer | undefined

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'shamrocks',
      description: 'Toggle Claude juggling shamrocks in a pane',
      argumentHint: '[32bit | 16bit | 8bit | ascii]',
    })

    return next(e)
  })

  on('command.run', { command: 'shamrocks' }, async ($, e) => {
    const picked = asStyle(e.args)
    if (e.args.trim() && !picked) {
      return { text: `Unknown style "${e.args.trim()}". Try one of: ${STYLES.join(', ')}.` }
    }

    if (timer && !picked) {
      timer.cancel()
      timer = undefined
      await $.ui.close({ id: PANE })

      return { text: 'Claude caught all the shamrocks. ☘' }
    }

    if (picked) await update($, style, () => picked)
    await $.ui.open({ id: PANE, title: TITLE })
    timer ??= $.clock.every(FRAME_MS, () => {
      void update($, tick, n => (n + 1) % 2400)
    })

    return {
      text: `Claude is juggling shamrocks (${await read($, style)}). Run /shamrocks again to stop.`,
    }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const n = await read($, tick)
    const look = await read($, style)

    if (look === 'ascii') {
      return (
        <Box flexDirection="column" alignItems="center">
          {sky(n).map((row, y) => (
            <Text key={`sky-${y}`}>
              {row.map((cell, i) =>
                cell.isShamrock ? (
                  <Text key={`c-${i}`} color={SHAMROCK_GREEN}>
                    {cell.text}
                  </Text>
                ) : (
                  cell.text
                ),
              )}
            </Text>
          ))}
          {clawd(n).map((line, y) => (
            <Text key={`clawd-${y}`} color={CLAUDE_ORANGE}>
              {line}
            </Text>
          ))}
          <Text dimColor>Claude loves Clover Security</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column" alignItems="center">
        {rows(look, n).map((runs, y) => (
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
        {look === '32bit' ? (
          <Text color={KAWAII_PINK}>Claude loves Clover Security · {bits(look)}</Text>
        ) : (
          <Text dimColor>Claude loves Clover Security · {bits(look)}</Text>
        )}
      </Box>
    )
  })
}
