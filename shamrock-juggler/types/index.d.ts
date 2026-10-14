export type Tick = number
export type JuggleStyle = 'ascii' | '8bit' | '16bit' | '32bit'

declare module 'claude-code' {
  interface PluginState {
    'shamrock-juggler': { tick: Tick; style: JuggleStyle }
  }
}
