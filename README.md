# 🫍 Whale as a Service

A static JSON API of hand-curated whale facts. No keys, no rate limits, no ads. Hosted on GitHub Pages.

**Live:** https://vuongdt23.github.io/WaaS/

## Quick start

```sh
curl https://vuongdt23.github.io/WaaS/api/random.json
```

```js
const fact = await fetch("https://vuongdt23.github.io/WaaS/api/random.json").then(r => r.json());
console.log(fact.text);
```

## Endpoints

All endpoints are `application/json`, GET-only.

| Endpoint | Returns |
|---|---|
| `/api/facts.json` | Array of all facts |
| `/api/facts/{id}.json` | One fact by id |
| `/api/random.json` | One fact, picked at build time (rotates each deploy) |
| `/api/fact-of-the-day/{MM-DD}.json` | One fact, deterministic per day. Compute today as `MM-DD` (UTC) on the client. |
| `/api/species.json` | Species index with fact counts |
| `/api/species/{slug}.json` | Species metadata + its facts |
| `/api/categories.json` | Category list with counts |
| `/api/index.json` | Meta: counts, generated-at, version |

## Fact shape

```json
{
  "id": "narwhal-tusk-is-a-tooth",
  "text": "A narwhal's tusk is actually a single elongated tooth…",
  "species": "narwhal",
  "category": "anatomy",
  "source": "https://ocean.si.edu/ocean-life/marine-mammals/narwhals"
}
```

`species` is optional (some facts are general). `source` is encouraged. Categories are one of `anatomy`, `behavior`, `communication`, `diet`, `habitat`, `reproduction`, `history`, `trivia`.

## Adding a fact

Facts live in `data/facts/<species>.yaml` (one file per species) plus `data/facts/common.yaml` for cross-species facts. The species comes from the filename — entries don't need a `species:` field.

1. Append to the relevant file (e.g. `data/facts/orca.yaml`) with a unique kebab-case `id`, the text, a `category`, and a `source` URL. For facts not tied to one species, use `data/facts/common.yaml`.
2. Run `npm run build` locally — the build will fail loudly if anything is off.
3. Open a PR. Once merged, the GitHub Action redeploys.

To add a new species, add an entry to `data/species.yaml` (`slug`, `common_name`, `scientific_name`) and create `data/facts/<slug>.yaml`.

## Local development

```sh
npm install
npm run build
cd dist && python3 -m http.server 4123
# open http://localhost:4123/
```

## License

- Code: [MIT](LICENSE)
- Fact data: [CC-BY-4.0](LICENSE-DATA) — credit Whale as a Service when you use it.

## Sources

Facts are sourced from NOAA Fisheries, Smithsonian Ocean, the IUCN Red List, and peer-cited Wikipedia entries. Every fact in `data/facts.yaml` carries its source URL.
