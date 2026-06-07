import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "data");
const DIST = path.join(ROOT, "dist");
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

const CATEGORIES = [
  "anatomy", "behavior", "communication",
  "diet", "habitat", "reproduction",
  "history", "trivia",
];

const Species = z.object({
  slug: z.string().regex(/^[a-z-]+$/),
  common_name: z.string().min(1),
  scientific_name: z.string().min(1),
});

const Fact = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  text: z.string().min(20).max(400),
  species: z.string().optional(),
  category: z.enum(CATEGORIES),
  source: z.string().url().optional(),
});

function readYaml(file) {
  return yaml.load(fs.readFileSync(path.join(DATA, file), "utf8"));
}

function validateAll(species, facts) {
  const errors = [];
  const speciesSlugs = new Set();

  species.forEach((s, i) => {
    const r = Species.safeParse(s);
    if (!r.success) errors.push(`species[${i}]: ${r.error.issues.map(x => x.message).join("; ")}`);
    else if (speciesSlugs.has(s.slug)) errors.push(`species[${i}]: duplicate slug "${s.slug}"`);
    else speciesSlugs.add(s.slug);
  });

  const factIds = new Set();
  facts.forEach((f, i) => {
    const r = Fact.safeParse(f);
    if (!r.success) {
      errors.push(`fact[${i}] (${f.id ?? "?"}): ${r.error.issues.map(x => x.message).join("; ")}`);
      return;
    }
    if (factIds.has(f.id)) errors.push(`fact[${i}]: duplicate id "${f.id}"`);
    factIds.add(f.id);
    if (f.species && !speciesSlugs.has(f.species)) {
      errors.push(`fact[${i}] (${f.id}): unknown species "${f.species}"`);
    }
  });

  return errors;
}

function writeJson(relPath, data) {
  const full = path.join(DIST, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(data, null, 2) + "\n");
}

function factsForSpecies(slug, facts) {
  return facts.filter((f) => f.species === slug);
}

function pickByIndex(facts, idx) {
  return facts[((idx % facts.length) + facts.length) % facts.length];
}

function dayKey(month, day) {
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function main() {
  const species = readYaml("species.yaml");
  const facts = readYaml("facts.yaml");

  const errors = validateAll(species, facts);
  if (errors.length) {
    console.error("Build failed with validation errors:");
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  writeJson("api/facts.json", facts);

  for (const fact of facts) {
    writeJson(`api/facts/${fact.id}.json`, fact);
  }

  const speciesIndex = species.map((s) => ({
    ...s,
    count: factsForSpecies(s.slug, facts).length,
  }));
  writeJson("api/species.json", speciesIndex);

  for (const s of species) {
    writeJson(`api/species/${s.slug}.json`, {
      ...s,
      facts: factsForSpecies(s.slug, facts),
    });
  }

  const categoryIndex = CATEGORIES.map((cat) => ({
    category: cat,
    count: facts.filter((f) => f.category === cat).length,
  })).filter((c) => c.count > 0);
  writeJson("api/categories.json", categoryIndex);

  const randomFact = facts[Math.floor(Math.random() * facts.length)];
  writeJson("api/random.json", randomFact);

  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let dayOfYear = 0;
  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= daysInMonth[m - 1]; d++) {
      const key = dayKey(m, d);
      writeJson(`api/fact-of-the-day/${key}.json`, pickByIndex(facts, dayOfYear));
      dayOfYear++;
    }
  }

  writeJson("api/index.json", {
    total_facts: facts.length,
    total_species: species.length,
    generated_at: new Date().toISOString(),
    version: PKG.version,
  });

  fs.writeFileSync(path.join(DIST, ".nojekyll"), "");

  const SITE = path.join(ROOT, "site");
  if (fs.existsSync(SITE)) {
    for (const entry of fs.readdirSync(SITE)) {
      fs.copyFileSync(path.join(SITE, entry), path.join(DIST, entry));
    }
  }

  console.log(`Built ${facts.length} facts, ${species.length} species → ${DIST}`);
}

main();
