const $ = (sel) => document.querySelector(sel);

let cache = [];
let speciesIndex = new Map();

const ENDPOINTS = [
  { path: "/api/facts.json",                   params: [] },
  { path: "/api/facts/{id}.json",              params: [{ name: "id",    type: "id"   }] },
  { path: "/api/random.json",                  params: [] },
  { path: "/api/fact-of-the-day/{MM-DD}.json", params: [{ name: "MM-DD", type: "date" }] },
  { path: "/api/species.json",                 params: [] },
  { path: "/api/species/{slug}.json",          params: [{ name: "slug",  type: "slug" }] },
  { path: "/api/categories.json",              params: [] },
  { path: "/api/index.json",                   params: [] },
];

function endpointFor(path) {
  return ENDPOINTS.find((e) => e.path === path);
}

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

  document.querySelectorAll(".ep").forEach((li) => {
    const head = li.querySelector(".ep-head");
    head.addEventListener("click", () => toggleEndpoint(li));
  });
}

function toggleEndpoint(li) {
  const head = li.querySelector(".ep-head");
  const body = li.querySelector(".ep-body");
  const isOpen = head.getAttribute("aria-expanded") === "true";
  if (isOpen) {
    head.setAttribute("aria-expanded", "false");
    body.hidden = true;
    return;
  }
  if (!body.dataset.rendered) {
    renderEndpointBody(li, body);
    body.dataset.rendered = "1";
  }
  head.setAttribute("aria-expanded", "true");
  body.hidden = false;
}

function renderEndpointBody(li, body) {
  body.textContent = "(body content comes in Task 5/6)";
}

wireUp();
load();
