# WaaS — Whale as a Service

## What This Is

WaaS is a static, GitHub-Pages-hosted JSON API that serves whale facts. Hobby
consumers (Discord bots, Slack `/whale` commands, classroom demos, personal
sites) hit predictable `/v1/*.json` URLs and get back JSON — no auth, no
server, no rate limit, just whale knowledge. It also doubles as a portfolio
showcase of shipping a polished tiny API end-to-end.

## Core Value

Hitting `https://<user>.github.io/WaaS/v1/random.json` returns a real, sourced
whale fact in JSON, every time, with zero ceremony.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] Source-of-truth fact catalog (50+ facts) seeded from Wikipedia / NOAA and hand-curated, each shaped as `{ id, fact, species, source_url }`
- [ ] Build pipeline that generates the static `/v1/*.json` files from the source catalog (script + GitHub Action)
- [ ] `GET /v1/random.json` — one random fact across all facts (regenerated on every build)
- [ ] `GET /v1/fact-of-day.json` — same fact for everyone all day, deterministic and rotating daily
- [ ] `GET /v1/facts.json` — full browse-all index of every fact
- [ ] `GET /v1/facts/<id>.json` — direct lookup of a single fact by ID
- [ ] `GET /v1/species/index.json` — list of species with fact counts and slugs
- [ ] `GET /v1/species/<slug>.json` — every fact for a given species
- [ ] Polished README as the front door — explains the project, lists every endpoint with copyable `curl` examples, links to the live URL
- [ ] GitHub Pages deploy live and reachable on the public web

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Swagger / OpenAPI spec — deferred; README + JSON shape is enough for v1, formal spec is a v2 polish item
- A separate landing-page / interactive playground — README is the front door for v1
- Random-by-species endpoint (`/v1/species/<slug>/random.json`) — deliberately deferred; v1 keeps random global only and species pages return the full list
- Dynamic query strings or filtering at request time — fundamentally incompatible with static hosting; everything is pre-built per URL
- Authentication, rate limiting, API keys — public static files, no server, none of this is meaningful
- A formal LICENSE file or curated CORS policy — punted: the repo being public on GitHub is the implicit signal for v1; revisit if a real consumer asks
- PR-driven community fact contributions as a primary growth model — v1 is curator-driven; PR contributions can come later if there's demand

## Context

- **Hosting model:** GitHub Pages serving pre-built static files from a repo. No backend exists or is planned. Every URL is a real file generated at build time.
- **Audience is dual:** the API itself is for hobby consumers (Discord bots, etc.), but the *project* is also a portfolio showcase — so README polish, deploy hygiene, and DX of "just hit the URL" matter as much as the fact catalog itself.
- **Fact sourcing is hybrid:** Wikipedia and NOAA-style public data is the seed, but every fact passes through the human curator before it lands in the catalog. Each fact carries a `source_url` so consumers can verify and credit.
- **Schema is intentionally small:** `{ id, fact, species, source_url }`. No tags, no difficulty levels, no media — a deliberate choice to keep maintenance light.
- **`/v1/` prefix from day one** so future breaking changes (renamed fields, new endpoints, schema growth) can ship as `/v2/` without breaking consumers.
- **`fact-of-day` must be deterministic:** the same UTC date returns the same fact for every caller — the build picks today's fact based on the date, not call time.

## Constraints

- **Tech stack**: Static JSON files only. No server runtime. Build tooling can be anything (Node script, Python, Make, GitHub Actions composite — TBD during planning), but the *output* is plain `.json` files committed/published to Pages.
- **Hosting**: GitHub Pages. URL shape is `https://<user>.github.io/WaaS/v1/...`. The build pipeline must produce a publishable static site that Pages accepts.
- **Versioning**: All public URLs prefixed with `/v1/`. Breaking changes ship as a new `/v2/` tree.
- **Schema lock for v1**: Each fact is exactly `{ id, fact, species, source_url }`. New fields wait for v2.
- **Content bar for v1**: At least 50 hand-vetted facts before calling the project "shipped."
- **Determinism**: `fact-of-day.json` must be deterministic per UTC date — same date globally yields the same fact.

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Static-only delivery via GitHub Pages | No server, no cost, no auth surface; perfect fit for a fun read-only API | — Pending |
| `/v1/` prefix from day one | Lets v2 breaking changes ship without breaking consumers | — Pending |
| Pre-build per-species files instead of query strings | Static hosting can't interpret query params — pre-built files give "just hit the URL" UX | — Pending |
| Random-by-species deferred | Keeps v1 surface small; species pages already give consumers the list | — Pending |
| Schema fixed to `{ id, fact, species, source_url }` | Smallest useful shape; resists scope creep into tags/levels/media | — Pending |
| Hybrid sourcing (seeded + hand-curated) | Wikipedia/NOAA gives content density, curation gives quality control and per-fact attribution | — Pending |
| README is the front door, no playground for v1 | Audience can read a README; playground is real engineering work that doesn't earn its keep yet | — Pending |
| License / CORS punted to "public on GitHub" | Decisions made under uncertainty are usually wrong; revisit when a real consumer asks | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-07 after initialization*
