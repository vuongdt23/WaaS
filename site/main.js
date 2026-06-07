const $ = (sel) => document.querySelector(sel);

let cache = [];
let speciesIndex = new Map();

function pickRandom(arr, exclude) {
  if (arr.length <= 1) return arr[0];
  let pick;
  do {
    pick = arr[Math.floor(Math.random() * arr.length)];
  } while (pick === exclude);
  return pick;
}

function speciesName(slug) {
  if (!slug) return null;
  const s = speciesIndex.get(slug);
  return s ? s.common_name : slug;
}

function renderFact(fact) {
  $("#fact-text").textContent = fact.text.trim();
  const meta = $("#fact-meta");
  meta.innerHTML = "";
  const parts = [];
  const sp = speciesName(fact.species);
  if (sp) parts.push(sp);
  if (fact.category) parts.push(fact.category);
  parts.forEach((p, i) => {
    if (i > 0) {
      const sep = document.createElement("span");
      sep.className = "sep";
      sep.textContent = "·";
      meta.appendChild(sep);
    }
    const span = document.createElement("span");
    span.textContent = p;
    meta.appendChild(span);
  });
}

function showToast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("visible");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove("visible"), 1400);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied");
  } catch {
    showToast("Copy failed");
  }
}

function originBase() {
  const path = location.pathname.replace(/index\.html$/, "");
  return location.origin + path;
}

function curlForEndpoint(endpointText) {
  const path = endpointText.replace(/^GET\s+/, "");
  return `curl ${originBase()}${path.startsWith("/") ? path.slice(1) : path}`;
}

async function load() {
  try {
    const [facts, species] = await Promise.all([
      fetch("./api/facts.json").then((r) => r.json()),
      fetch("./api/species.json").then((r) => r.json()),
    ]);
    cache = facts;
    speciesIndex = new Map(species.map((s) => [s.slug, s]));
    $("#fact-count").textContent = facts.length;
    renderFact(pickRandom(cache));
  } catch (err) {
    $("#fact-text").textContent = "Couldn't load facts. Refresh to try again.";
    console.error(err);
  }
}

function wireUp() {
  $("#reroll").addEventListener("click", () => {
    if (!cache.length) return;
    const current = $("#fact-text").textContent;
    const next = pickRandom(cache, cache.find((f) => f.text.trim() === current));
    renderFact(next);
  });

  const pill = document.querySelector(".curl-pill");
  if (pill) {
    pill.addEventListener("click", () => {
      const text = `curl ${originBase()}api/random.json`;
      $("#curl-text").textContent = text;
      copyText(text);
    });
    $("#curl-text").textContent = `curl ${originBase()}api/random.json`;
  }

  document.querySelectorAll(".endpoint[data-curl]").forEach((el) => {
    el.addEventListener("click", () => copyText(curlForEndpoint(el.textContent)));
  });
}

wireUp();
load();
