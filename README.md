# model-router

A Claude Code mod that picks the model **before** each message is sent, so you stop burning Opus on "ok thanks" and stop sending real builds to Haiku.

- **Auto model + effort per message**: Haiku for quick questions and small talk, Sonnet for edits and writing, Opus for builds, debugging, refactors and plans. It also reads the last assistant message, so a short "yes" to "want me to build X?" counts as a build.
- **Protects your limits**: steps down (model and effort) when your weekly limit runs low, and keeps one day from eating more than your daily budget.
- **Usage at a glance**: a small band above the prompt shows 5-hour and weekly usage left, when each resets, and today's share of the week.
- **Free and local**: routing is a few regexes on your machine. Picking a model never spends usage.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install model-router --marketplace dk1903/model-router
```

Answer `y` to add the marketplace, then pick a scope (user scope = every session).

From a shell:

```
claude plugin install model-router --marketplace dk1903/model-router
```

In the desktop app: click **+** next to the prompt box → **Plugins** → **Add marketplace** with `dk1903/model-router` → **Add plugin**.

## Settings

| Setting | Default | What it does |
|---|---|---|
| `dailyCap` | `14` | % of your weekly limit one day may use before the router steps down. `0` = no daily budget. |

Turn auto-routing off or on any time from the band above the prompt.

## How it decides

| Message looks like | Model | Effort |
|---|---|---|
| greetings, yes/no, quick what/when/how-much questions | Haiku | low |
| fix, edit, write, draft, summarize, convert, add/remove | Sonnet | medium |
| build, design, debug, refactor, migrate, research, "from scratch" | Opus | high |
| weekly limit nearly used / today over budget | one step down | one step down |

## License

MIT
