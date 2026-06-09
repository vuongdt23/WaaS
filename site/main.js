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

function todayMMDD() {
  const now = new Date();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

function randomFactId() {
  if (!cache.length) return "";
  return cache[Math.floor(Math.random() * cache.length)].id;
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
  const path = li.dataset.path;
  const ep = endpointFor(path);
  if (!ep) return;

  body.replaceChildren();

  let paramsRow = null;
  if (ep.params.length) {
    paramsRow = document.createElement("div");
    paramsRow.className = "ep-params";
    for (const p of ep.params) {
      paramsRow.append(...renderParamControl(p));
    }
    body.appendChild(paramsRow);
  }

  const runRow = document.createElement("div");
  runRow.className = "ep-run-row";

  const tryBtn = document.createElement("button");
  tryBtn.type = "button";
  tryBtn.className = "ep-try";
  tryBtn.textContent = "Try";

  const urlSpan = document.createElement("span");
  urlSpan.className = "ep-url";

  runRow.append(tryBtn, urlSpan);
  body.appendChild(runRow);

  const pre = document.createElement("pre");
  pre.className = "ep-response is-empty";
  pre.textContent = "Click Try to fetch.";
  body.appendChild(pre);

  const actions = document.createElement("div");
  actions.className = "ep-actions";
  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.textContent = "Copy curl";
  copyBtn.disabled = true;
  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.textContent = "Open in new tab";
  openBtn.disabled = true;
  actions.append(copyBtn, openBtn);
  body.appendChild(actions);

  const updateUrl = () => {
    const url = resolveUrl(ep.path, paramsRow);
    urlSpan.textContent = `GET ${url}`;
    return url;
  };
  updateUrl();

  if (paramsRow) {
    paramsRow.addEventListener("input", updateUrl);
    paramsRow.addEventListener("change", updateUrl);
  }

  let lastUrl = null;
  tryBtn.addEventListener("click", async () => {
    const url = updateUrl();
    lastUrl = url;
    tryBtn.disabled = true;
    copyBtn.disabled = true;
    openBtn.disabled = true;
    pre.classList.remove("is-error", "is-empty");
    pre.textContent = "…";
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        pre.classList.add("is-error");
        pre.textContent = `HTTP ${res.status} ${res.statusText}\n\n${text}`;
      } else {
        const data = await res.json();
        pre.textContent = JSON.stringify(data, null, 2);
        copyBtn.disabled = false;
        openBtn.disabled = false;
      }
    } catch (err) {
      pre.classList.add("is-error");
      pre.textContent = String(err);
    } finally {
      tryBtn.disabled = false;
    }
  });

  copyBtn.addEventListener("click", () => {
    if (lastUrl) copyText(`curl ${lastUrl}`);
  });
  openBtn.addEventListener("click", () => {
    if (lastUrl) window.open(lastUrl, "_blank", "noopener");
  });
}

function resolveUrl(template, paramsRow) {
  let resolved = template;
  if (paramsRow) {
    paramsRow.querySelectorAll("[data-param-name]").forEach((el) => {
      const name = el.dataset.paramName;
      const value = encodeURIComponent(el.value || "");
      resolved = resolved.replace(`{${name}}`, value);
    });
  }
  const base = originBase();
  const rel = resolved.startsWith("/") ? resolved.slice(1) : resolved;
  return `${base}${rel}`;
}

function renderParamControl(param) {
  const label = document.createElement("label");
  label.textContent = `${param.name}:`;
  label.htmlFor = `ep-input-${param.name}-${Math.random().toString(36).slice(2, 8)}`;

  if (param.type === "slug") {
    const select = document.createElement("select");
    select.id = label.htmlFor;
    select.dataset.paramName = param.name;
    const slugs = [...speciesIndex.keys()].sort();
    for (const slug of slugs) {
      const opt = document.createElement("option");
      opt.value = slug;
      opt.textContent = slug;
      select.appendChild(opt);
    }
    return [label, select];
  }

  if (param.type === "id") {
    const input = document.createElement("input");
    input.type = "text";
    input.id = label.htmlFor;
    input.dataset.paramName = param.name;
    input.value = randomFactId();
    input.size = 28;

    const reroll = document.createElement("button");
    reroll.type = "button";
    reroll.className = "ep-reroll";
    reroll.title = "Random fact id";
    reroll.textContent = "↻";
    reroll.addEventListener("click", () => {
      input.value = randomFactId();
    });

    return [label, input, reroll];
  }

  if (param.type === "date") {
    const input = document.createElement("input");
    input.type = "text";
    input.id = label.htmlFor;
    input.dataset.paramName = param.name;
    input.value = todayMMDD();
    input.pattern = "\\d{2}-\\d{2}";
    input.placeholder = "MM-DD";
    input.size = 8;
    return [label, input];
  }

  return [];
}

wireUp();
load();
