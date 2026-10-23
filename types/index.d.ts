export type Tier = 'haiku' | 'sonnet' | 'opus'
export type Effort = 'low' | 'medium' | 'high' | 'xhigh'
export type Pick = { tier: Tier; effort: Effort; reason: string; switched: boolean }
export type Usage = { kind: string; left: number; resetsAt?: string }[]

declare module 'claude-code' {
  interface PluginState {
    'model-router': { last: Pick | null; auto: boolean; usage: Usage; today: number | null }
  }
}
