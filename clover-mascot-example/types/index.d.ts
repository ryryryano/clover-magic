export type ClipKey = 'idea' | 'send'
export type Showing = ClipKey | 'both'

declare module 'claude-code' {
  interface PluginState {
    'clover-mascot-example': { showing: Showing; frame: number }
  }
}
