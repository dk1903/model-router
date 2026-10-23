# Roadmap

Planned, roughly in order. Open an issue if you want something moved up.

- [ ] **Your own rules**: settings for which words count as a quick question, an edit or a build.
- [ ] **Per-project defaults**: e.g. always at least Sonnet inside a given repo.
- [ ] **Savings counter**: estimate how much usage auto-routing saved this week, shown in the band.
- [ ] **Manual override**: start a message with `!opus`, `!sonnet` or `!haiku` to force a model once.
- [ ] **Smarter context**: weigh the last few turns, not only the last reply.
- [ ] **More tests**: a larger set of real prompts with the expected model.

Done:
- [x] Auto-pick model and effort per message (v0.3)
- [x] Route a short "yes" on what Claude just proposed (v0.3)
- [x] Weekly-limit protection + usage band (v0.4)
