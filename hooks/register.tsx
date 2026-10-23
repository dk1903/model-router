import { atom, read, update } from 'claude-code'
import type { Register, SessionRateLimit } from 'claude-code'
import type { Effort, Pick, Tier, Usage } from '../types'

const last = atom({ plugin: 'model-router', key: 'last' } as const, null)
const auto = atom({ plugin: 'model-router', key: 'auto' } as const, true)
const usage = atom({ plugin: 'model-router', key: 'usage' } as const, [])


const NAME: Record<Tier, string> = { haiku: 'Haiku', sonnet: 'Sonnet', opus: 'Opus' }
const COLOR: Record<Tier, string> = { haiku: '#7FB77E', sonnet: '#6FA8DC', opus: '#C9A0DC' }

// Free, local routing: no model call, so picking a model never spends usage.
const OPUS = /\b(build|design|architect\w*|refactor|strateg\w*|plan|research|analy[sz]e|develop|implement|migrate|debug|investigate|from scratch|end.to.end|entire|everything|optimi[sz]e|mod|plugin|system|pipeline|automat\w*)\b/i
const SONNET = /\b(fix|edit|update|change|write|draft|rewrite|add|remove|create|make|script|code|function|caption|email|summari[sz]e|convert|post|schedule)\b/i
const DEEP = /\b(debug|investigate|architect\w*|refactor|migrate|from scratch|end.to.end|entire|everything|why (is|does|did)|root cause)\b/i
const QUICK = /^(hi|hey|yo|ok|okay|thanks|thx|ty|yes|no|nah|yep|sure|cool|nice|lol)\b|^(what|when|where|who|which|is|are|did|does|do|can|how much|how many)\b/i

const DOWN: Record<Effort, Effort> = { xhigh: 'high', high: 'medium', medium: 'low', low: 'low' }

export function route(text: string, weekUsed: number | null): { tier: Tier; effort: Effort; reason: string } {
  const t = text.trim(), len = t.length
  const bullets = (t.match(/^\s*([-*•]|\d+[.)])\s+/gm) || []).length
  let tier: Tier, effort: Effort, reason: string
  if (len > 900 || bullets >= 4 || (OPUS.test(t) && len > 60)) {
    tier = 'opus'; reason = len > 900 ? 'long, multi-part ask' : bullets >= 4 ? `${bullets}-item task list` : 'build / plan / research'
    effort = len > 900 || bullets >= 4 || DEEP.test(t) ? 'xhigh' : 'high'
  } else if (len < 140 && !OPUS.test(t) && (QUICK.test(t) || !SONNET.test(t))) {
    tier = 'haiku'; effort = 'low'; reason = 'quick question'
  } else {
    tier = 'sonnet'; effort = DEEP.test(t) ? 'high' : 'medium'; reason = OPUS.test(t) ? 'short build ask' : 'edit / write task'
  }
  // Protect the weekly limit: step down (model and effort) when it is nearly gone.
  if (weekUsed != null && weekUsed >= 95 && tier !== 'haiku') return { tier: 'haiku', effort: 'low', reason: `${reason} · week almost gone` }
  if (weekUsed != null && weekUsed >= 85 && tier === 'opus') return { tier: 'sonnet', effort: DOWN[effort], reason: `${reason} · saving the week` }
  return { tier, effort, reason }
}

// "yes" after my offer to build something is a build, not a quick question. A short reply is
// routed on what Claude just proposed (the end of its last message) plus what the person typed.
const AFFIRM = /^(y|yes+|yeah|yep|yup|ya|sure|ok(ay)?|k|go|go ahead|go for it|do it|do that|lets? go|let's do it|continue|proceed|start|ship it|send it|approved?|perfect|all good|sounds good|👍|✅)\b/i
const SMALLTALK = /^(thanks|thank you|thx|ty|lol|haha|cool|nice|good night|gn|bye)\b/i
export function routeWithContext(text: string, prev: string, weekUsed: number | null): { tier: Tier; effort: Effort; reason: string } {
  const t = text.trim(), tail = prev.trim().slice(-600)
  const own = route(t, weekUsed)
  if (!tail || t.length >= 160 || SMALLTALK.test(t) || own.tier === 'opus') return own
  const ctx = route(tail, weekUsed)
  if (AFFIRM.test(t)) return ctx.tier === 'haiku' ? own : { ...ctx, reason: `${ctx.reason} · you said “${t.slice(0, 24)}” to my plan` }
  // short follow-up in the middle of a bigger task: at least Sonnet
  if (own.tier === 'haiku' && ctx.tier !== 'haiku' && !/\?\s*$/.test(t)) return { tier: 'sonnet', effort: 'medium', reason: 'short reply inside a bigger task' }
  return own
}

const toUsage = (r: readonly SessionRateLimit[]): Usage =>
  r.map(x => ({ kind: x.kind, left: Math.max(0, Math.round((100 - x.percentUsed) * 10) / 10), resetsAt: x.resetsAt }))
const tierOf = (id: string): Tier | null => (/haiku/i.test(id) ? 'haiku' : /sonnet/i.test(id) ? 'sonnet' : /opus/i.test(id) ? 'opus' : null)
const label = (k: string) => (k === 'five_hour' ? '5h' : k === 'seven_day' ? 'Week' : k === 'spend_limit' ? 'Spend' : k)
const bar = (left: number) => { const n = Math.round(left / 10); return '█'.repeat(n) + '░'.repeat(10 - n) }
const tone = (left: number) => (left > 50 ? '#7FB77E' : left > 20 ? '#E5C07B' : '#E06C75')
const resets = (iso?: string) => {
  if (!iso) return ''
  const ms = new Date(iso).getTime() - Date.now(); if (!(ms > 0)) return ''
  const h = Math.floor(ms / 36e5); return h >= 24 ? ` · ${Math.floor(h / 24)}d ${h % 24}h` : ` · ${h}h ${Math.floor((ms % 36e5) / 6e4)}m`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const u = await $.session.usage().catch(() => null)
    if (u) { const v = toUsage(u.rateLimits); await update($, usage, () => v) }
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) { const v = toUsage(e.rateLimits); await update($, usage, () => v) }
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    const text = e.text.trim()
    if (!text || text.startsWith('/') || e.origin.kind === 'plugin' || !(await read($, auto))) return next(e)
    const week = (await read($, usage)).find(x => x.kind === 'seven_day')
    const msgs = await $.session.messages().catch(() => [] as any[])
    const prev = (msgs as any[]).filter(m => m.role === 'assistant' && typeof m.text === 'string' && m.text.trim()).at(-1)?.text || ''
    const { tier, effort, reason } = routeWithContext(text, prev, week ? 100 - week.left : null)
    const now = tierOf(await $.session.model().catch(() => ''))
    let switched = false
    if (now !== tier) {
      const r = await $.command.run({ command: 'model', args: tier }).catch(() => null)
      switched = !!r
    }
    const pick: Pick = { tier, effort, reason, switched }
    await update($, last, () => pick)
    return next(e)
  })

  // Effort rides on each model request of the turn (main thread only; subagents keep theirs).
  // A model without effort support has no e.effort, so nothing is sent for it.
  on('turn.step', async function* ($, e, next) {
    const pick = await read($, last)
    if (e.agentId !== undefined || e.effort === undefined || !pick?.effort || !(await read($, auto))) return yield* next(e)
    return yield* next({ ...e, effort: pick.effort })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Other mods' bands (autopilot-live) stay: draw them first, ours under.
    const rest: any = await next(e)
    if (e.props.hasSurvey) return rest
    const { Box, Text, Button } = $.ui.resolve(e)
    const pick = await read($, last), on_ = await read($, auto), u = await read($, usage)
    const wins = u.filter(x => x.kind === 'five_hour' || x.kind === 'seven_day' || x.kind === 'spend_limit')
    const mine = (
      <Box flexDirection="column">
        <Box>
          <Text bold color={pick ? COLOR[pick.tier] : undefined}>◆ {on_ ? 'Auto model' : 'Auto model off'}</Text>
          {on_ && pick ? <Text> → <Text bold color={COLOR[pick.tier]}>{NAME[pick.tier]}</Text>{pick.effort ? <Text color={COLOR[pick.tier]}> · {pick.effort}</Text> : null}<Text dimColor> · {pick.reason}{pick.switched ? '' : ' (already on it)'}</Text></Text> : null}
          {on_ && !pick ? <Text dimColor> · picks Haiku / Sonnet / Opus when you send</Text> : null}
          <Text> </Text>
          <Button key="toggle" label={on_ ? 'Pause' : 'Resume'} onPress={() => update($, auto, v => !v)} />
        </Box>
        {wins.length
          ? <Box>{wins.map(w => <Text key={w.kind}><Text dimColor>{label(w.kind)} </Text><Text color={tone(w.left)}>{bar(w.left)} {w.left}% left</Text><Text dimColor>{resets(w.resetsAt)}   </Text></Text>)}</Box>
          : <Text dimColor>Usage: shows after your first reply</Text>}
      </Box>
    )
    return rest && rest.type !== 'engine' ? <Box flexDirection="column">{rest}{mine}</Box> : mine
  })
}
