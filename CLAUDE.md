<!-- GSD:project-start source:PROJECT.md -->

## Project

**WaaS — Whale as a Service**

WaaS is a static, GitHub-Pages-hosted JSON API that serves whale facts. Hobby
consumers (Discord bots, Slack `/whale` commands, classroom demos, personal
sites) hit predictable `/v1/*.json` URLs and get back JSON — no auth, no
server, no rate limit, just whale knowledge. It also doubles as a portfolio
showcase of shipping a polished tiny API end-to-end.

**Core Value:** Hitting `https://<user>.github.io/WaaS/v1/random.json` returns a real, sourced
whale fact in JSON, every time, with zero ceremony.

### Constraints

- **Tech stack**: Static JSON files only. No server runtime. Build tooling can be anything (Node script, Python, Make, GitHub Actions composite — TBD during planning), but the *output* is plain `.json` files committed/published to Pages.
- **Hosting**: GitHub Pages. URL shape is `https://<user>.github.io/WaaS/v1/...`. The build pipeline must produce a publishable static site that Pages accepts.
- **Versioning**: All public URLs prefixed with `/v1/`. Breaking changes ship as a new `/v2/` tree.
- **Schema lock for v1**: Each fact is exactly `{ id, fact, species, source_url }`. New fields wait for v2.
- **Content bar for v1**: At least 50 hand-vetted facts before calling the project "shipped."
- **Determinism**: `fact-of-day.json` must be deterministic per UTC date — same date globally yields the same fact.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## TL;DR (the prescriptive answer)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 24.16.0 ("Krypton" LTS) | Runtime for the build script | Active LTS as of June 2026; ships with stable ESM, native `node:test`, `node --watch`, `fs/promises`, `crypto.subtle`. Zero need for ts-node, esbuild, or babel for a script this small. |
| YAML (as source format) | YAML 1.2 (via `js-yaml@4.2.0`) | Authoring format for `data/facts.yml` | Multi-line whale facts read horribly in JSON (`\n` everywhere, no comments). YAML lets the curator write block-scalar paragraphs and leave inline `# source notes`. The build still emits pure JSON. |
| `js-yaml` | 4.2.0 | YAML 1.2 parser | De facto standard YAML parser for Node (~50M weekly downloads), tiny dep tree, safe-load by default in v4. Fast enough that 50 or 50,000 facts is irrelevant. |
| `ajv` | 8.20.0 | JSON Schema validator | Fastest JSON Schema validator in JS (compile-to-code), supports JSON Schema draft 2020-12. Ships in `node_modules` and lives in CI; never reaches end users. |
| `ajv-formats` | 3.0.1 | URL/format validators for Ajv 8 | `format: "uri"` for `source_url` is the single most useful extra check — Ajv 8 split formats out into this package, so you need both. |
| `actions/checkout` | v6 | Clone repo in CI | Required first step. v6 is current per GitHub's own docs examples in 2026. |
| `actions/setup-node` | v4 | Install Node + cache npm | Pin `node-version: '24'` and `cache: 'npm'`. Stable, no surprises. |
| `actions/configure-pages` | v6.0.0 | Configure repo for Pages-from-Actions | Required to flip Pages into "GitHub Actions" source mode and to compute the deploy URL. |
| `actions/upload-pages-artifact` | v5.0.0 | Package `dist/` as a Pages-shaped artifact | Wraps the build output with the metadata `deploy-pages` expects. Pinned-pair with v5 of deploy-pages. |
| `actions/deploy-pages` | v5.0.0 | Deploy artifact to Pages | The official, supported path. v5 is the current major as of June 2026. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `slugify` | latest 1.x | Build URL-safe `species/<slug>.json` filenames from species names | Use the moment a species name has spaces, accents, or punctuation ("Sperm Whale" → `sperm-whale`). Don't hand-roll this — Unicode edge cases will bite. |
| `prettier` | latest 3.x | Format JSON output | Optional but cheap — formats `dist/v1/*.json` with stable 2-space indent so consumers `curl` -ing the URL see something readable. Configure with `printWidth: 100`. |
| `vitest` | latest 3.x | Test the build script | Use it to assert: (a) build is deterministic for a fixed UTC date, (b) every fact in the catalog appears in `facts.json`, (c) species index counts match per-species files. Fast enough that the CI test job adds <10s. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `npm` 11 (bundled with Node 24) | Package manager | `npm ci` in CI, `npm install` locally. No need for pnpm/yarn at this size. |
| `node --test` (or `vitest`) | Test runner | Node 24's built-in test runner is fine; pick `vitest` only if you want watch-mode UX during catalog edits. |
| Local preview | Serve `dist/` for local testing | `npx serve dist` or `python3 -m http.server -d dist 8000`. Don't add a dev-server dep to `package.json`. |
| GitHub Pages settings | Repo → Settings → Pages → Source: **GitHub Actions** | One-time click. Without it, the workflow's deploy step will fail with a clear error. |

## Installation

# Project init

# Core

# Dev dependencies

## Workflow Skeleton (the deploy bit)

## Deterministic `fact-of-day.json` — the prescriptive recipe

- **Pure function of UTC date** → identical output for everyone hitting Pages on the same calendar day.
- **No call-time randomness** → matches static-hosting reality (the file is built once and cached at the CDN).
- **Hash, not modulo-on-day-of-year** → daily picks don't walk the catalog in id order, so consecutive days feel fresh.
- **Daily cron rebuild** → the file actually changes; without the schedule, a build on Monday would still serve Monday's fact on Wednesday.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Plain Node script (`scripts/build.mjs`) | **Eleventy 3.1.6** | If you also want a real HTML landing page / docs site at the same domain. Eleventy can emit JSON via "permalink" + `eleventyComputed`, and its `_data/` directory model fits a fact catalog cleanly. But it's overkill for v1, where the README is explicitly the front door. |
| Plain Node script | **Jekyll** (Pages' built-in) | Almost never. Jekyll's "build-from-`/docs`" flow is the legacy default for Pages and still works, but Liquid is a worse fit for emitting structured JSON than JS, and Ruby-on-runner setup adds friction over a Node script. Skip. |
| Plain Node script | **Python `build.py` + PyYAML + `jsonschema`** | If the curator is Python-fluent and Node-averse. The shape is identical (read YAML → validate → write JSON), GitHub Actions has `setup-python@v5`, and PyYAML/`jsonschema` are stable. Pick on author preference, not technical merit. |
| YAML for source-of-truth | **JSON for source-of-truth** | If you're allergic to YAML's whitespace gotchas, JSON works. You lose multi-line ergonomics and comments. Acceptable; v1 facts are short. |
| YAML | **TOML** | Don't bother — TOML's array-of-tables for 50+ items is uglier than YAML, and tooling support is thinner. |
| YAML | **Markdown front-matter (one file per fact)** | If you anticipate community PR contributions where each fact gets a discussion thread. For a curator-driven v1, a single `facts.yml` is faster to edit and review. Reconsider in v2 if PR contributions become a goal. |
| Ajv | **Zod 4.4.3** | If you also need TypeScript types for the build script. Zod gives you `z.infer<typeof FactSchema>` for free. Trade-off: it's a JS-DSL, not a portable JSON Schema file, so consumers can't reuse it. For WaaS (no TS, schema is also documentation), Ajv + a real `schemas/fact.schema.json` wins. |
| Ajv | **`jsonschema` (stand-alone CLI), `check-jsonschema`** | If you want validation as a `pre-commit` hook independent of the build script. Composable with Ajv, not a replacement. |
| GitHub Actions deploy | **`peaceiris/actions-gh-pages` to a `gh-pages` branch** | Only if your org locks down the `pages: write` permission or your repo is on an older Pages plan. Otherwise the official Actions path is strictly better — no committed build artifacts polluting git history, faster deploys, official support. |
| GitHub Actions deploy | **Pages "Deploy from a branch" (`/docs` folder)** | Only viable if you commit `dist/` to `main`. Don't. Generated files in version control is a known anti-pattern; PR diffs become unreviewable. |
| GitHub Pages hosting | **Cloudflare Pages / Netlify** | If you outgrow Pages limits (1GB site, 100GB/mo bandwidth, 10 builds/hr). For a JSON catalog, you won't. Cloudflare Pages does give you `_headers` for fine-grained CORS — punt until a real consumer asks. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Next.js / Astro / Nuxt | Heavy SSR/RSC frameworks for what is a 6-file JSON emit. Build times balloon, deploy artifacts become huge, and you'll fight the framework's routing to produce raw `.json` files at `/v1/foo.json`. | Plain Node script. |
| TypeScript + tsc/esbuild/SWC build pipeline | Adds a compile step, source maps, `tsconfig.json`, and a debugging surface for ~150 lines of code. ESM Node 24 + JSDoc comments give you 90% of the safety with 0% of the toolchain. | Plain `.mjs` files with JSDoc; let Ajv enforce data shape at runtime. |
| Committing `dist/` to `main` | Pollutes diffs, defeats the point of a build step, and creates a class of "I forgot to rebuild" PR review bugs. | Keep `dist/` in `.gitignore`; build in CI; deploy via Actions. |
| `gh-pages` npm package (push-from-local) | Encourages "deploy from my laptop" — non-reproducible, wrong-author commits, easy to ship un-validated facts. | The CI workflow is the only deploy path. |
| Jekyll / Liquid for emitting JSON | Liquid wasn't designed for structured data; you'll hit weird coercion bugs (numbers as strings, etc.) and be debugging Ruby errors. | Plain Node script — JS speaks JSON natively. |
| `Math.random()` in `fact-of-day.json` | Static hosting + randomness = "same fact for hours, then suddenly changes" depending on which CI run hit the CDN. Breaks the determinism contract in PROJECT.md. | UTC-date-hashed pick (see recipe above). |
| `new Date()` with local time anywhere | UTC-vs-local boundaries silently shift "today's fact" depending on runner timezone. | Always `.toISOString().slice(0,10)` for the date key. |
| Ajv 6 / Ajv 7 | EOL'd; missing JSON Schema 2019-09/2020-12 keywords. | Ajv 8.x. |
| Zod 3 | Superseded by Zod 4 in 2024-2025; v4 has materially better perf and cleaner errors. If you choose Zod at all, choose Zod 4. | Zod 4.4.x — but prefer Ajv for this project. |
| `js-yaml`'s deprecated `load()` semantics from v3 | The "unsafe load executes arbitrary types" foot-gun is a v3 thing. v4 made `load()` the safe one. | `js-yaml@4.x`'s `load()` is what you want; don't reach for `loadAll` unless you're parsing multi-doc streams. |

## Stack Patterns by Variant

- Use a one-fact-per-Markdown-file layout under `data/facts/*.md` with front-matter (`gray-matter@4.x` parses it).
- Build script globs the directory; fact `id` is the filename.
- Slightly more files, slightly nicer Git diffs, slightly worse for bulk edits.
- Drop Ajv, use Zod 4 + `zod-to-json-schema` to *generate* `fact.schema.json` for documentation.
- Convert `build.mjs` → `build.ts`, run with `tsx` or Node 24's experimental `--experimental-strip-types`.
- Cost: an extra dependency layer. Benefit: `z.infer` types throughout the script.
- Split into `data/facts/<species-slug>.yml` and concat in the build script.
- Same schema, same output. Don't reach for SQLite/Datasette unless you actually need queries.
- *Then* Eleventy 3.1.6 earns its keep — it can co-emit the static site and the JSON endpoints from the same `_data/facts.yml`. Until then, plain Node is correct.

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `ajv@8.x` | `ajv-formats@3.x` | Ajv 8 + ajv-formats 3 is the matched pair. Don't mix `ajv@8` with `ajv-formats@2` (peer-dep range allows it but errors on `addFormats`). |
| `ajv@8.x` | Node ≥ 14 | Way under our floor — fine on Node 24. |
| `js-yaml@4.x` | Node ≥ 12 | Fine on Node 24. v4 changed `safeLoad` → `load`-is-safe semantics from v3; if you find a Stack Overflow answer using `safeLoad`, it's stale. |
| `actions/deploy-pages@v5` | `actions/upload-pages-artifact@v5` | Pinned pair. v4 of either is the prior major and works, but stay on v5/v5 — they were released together. |
| `actions/configure-pages@v6` | `actions/deploy-pages@v5` | Currently compatible; configure-pages v6 was released after deploy-pages v5. |
| `actions/setup-node@v4` | `node-version: '24'` | v4 fully supports Node 24 LTS. |
| Pages source must be "GitHub Actions" | All `actions/*-pages*` actions | If the repo's Pages source is set to "Deploy from a branch", `deploy-pages` fails. One-time toggle in repo Settings → Pages. |

## How `fact-of-day` rotation interacts with caching (read this once)

## Sources

- npm registry (`registry.npmjs.org`) — verified live versions of `js-yaml@4.2.0`, `ajv@8.20.0` (also via GitHub releases), `ajv-formats@3.0.1`, `zod@4.4.3` on 2026-06-07. **HIGH** confidence.
- GitHub Releases API (`api.github.com/repos/<org>/<repo>/releases/latest`) — verified `actions/deploy-pages@v5.0.0`, `actions/configure-pages@v6.0.0`, `actions/upload-pages-artifact@v5.0.0`, `11ty/eleventy@v3.1.6` on 2026-06-07. **HIGH** confidence.
- Node.js distribution index (`nodejs.org/dist/index.json`) — confirmed Node 24.16.0 is current Active LTS ("Krypton") on 2026-06-07. **HIGH** confidence.
- Context7: `/websites/github_en_actions` — verified `actions/checkout@v6`, `actions/setup-node@v4`, `actions/upload-artifact@v4` are the current shapes in official GitHub Actions docs examples. **HIGH** confidence.
- Context7: `/ajv-validator/ajv` — verified Ajv 8 API, JSON Schema usage, and `format: "uri"` requiring `ajv-formats`. **HIGH** confidence.
- Context7: `/websites/11ty_dev` — confirmed Eleventy 3.x `_data/` and `Fetch` APIs as of 2026; supports the "Eleventy is overkill but viable" alternative analysis. **HIGH** confidence.
- GitHub Pages caching behavior (Fastly ~10min TTL): widely documented on Stack Overflow / GitHub Community Forum; **MEDIUM** confidence on exact TTL number, **HIGH** on "non-zero TTL exists and is not user-configurable on free Pages." Worth a quick verification pass during the implementation phase that builds the `fact-of-day` endpoint.

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
