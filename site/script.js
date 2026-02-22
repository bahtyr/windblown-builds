// Data comes from outside (e.g., <script src="./data.js"></script> that sets window.GIFTS_DATA)
const GIFTS = window.GIFTS_DATA || [];

const WIKI_BASE = "https://windblown.wiki.gg";

// Expected existing elements in your HTML:
// <select id="entitySelect"><option value="">No filter</option></select>
// <input id="searchInput" />
// <button id="clearBtn"></button>
// <div id="count"></div>
// <main id="sections"></main>
const elSections = document.getElementById("sections");
const elEntity = document.getElementById("entitySelect");
const elSearch = document.getElementById("searchInput");
const elCount = document.getElementById("count");
const elClear = document.getElementById("clearBtn");
const elDeck = document.getElementById("deck");
const elDeckToggle = document.getElementById("deckToggle");
const elDeckPanel = document.getElementById("deckPanel");
const elDeckSlots = document.getElementById("deckSlots");
const elDeckEntities = document.getElementById("deckEntities");
const elCopyDeckLink = document.getElementById("copyDeckLink");
const elDeckStatus = document.getElementById("deckStatus");

const MAX_DECK = 20;
const DECK_PARAM = "gifts";
const DECK_STORAGE_KEY = "windblown.deck";

const giftsById = new Map();
for (const g of GIFTS) {
    const id = (g.name || "").trim();
    if (id) giftsById.set(id, g);
}

const deckState = {
    ids: [],
    open: false
};

function absUrl(u) {
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    if (u.startsWith("/")) return WIKI_BASE + u;
    return u;
}

function normalizeHref(href) {
    if (!href) return "";
    try {
        const u = new URL(href, WIKI_BASE);
        return u.pathname + (u.search || "");
    } catch {
        return String(href).trim();
    }
}

function entityId(part) {
    return normalizeHref(part?.href);
}

function entityDisplayText(part) {
    const t = (part?.text || "").trim();
    if (t) return t;

    const id = entityId(part);
    const last = id.split("/").filter(Boolean).pop() || "";
    return decodeURIComponent(last.replaceAll("_", " ")) || "(Unnamed entity)";
}

function giftEntityIds(gift) {
    const ids = [];
    for (const part of (gift.richDescription || [])) {
        if (part.key !== "entity") continue;
        const id = entityId(part);
        if (id) ids.push(id);
    }
    return ids;
}

function giftEntities(gift) {
    const items = [];
    for (const part of (gift.richDescription || [])) {
        if (part.key !== "entity") continue;
        const id = entityId(part);
        if (!id) continue;
        items.push({ id, label: entityDisplayText(part) });
    }
    return items;
}

function matchesEntity(gift, selectedEntityId) {
    if (!selectedEntityId) return true;
    return giftEntityIds(gift).includes(selectedEntityId);
}

function matchesSearch(gift, q) {
    if (!q) return true;
    q = q.toLowerCase();

    const name = (gift.name || "").toLowerCase();
    const cat = (gift.category || "").toLowerCase();
    const text = (gift.richDescription || []).map(p => (p.text || "")).join(" ").toLowerCase();

    return name.includes(q) || cat.includes(q) || text.includes(q);
}

function groupByCategory() {
    const map = new Map();
    for (const g of GIFTS) {
        const cat = (g.category && g.category.trim()) ? g.category.trim() : "Uncategorized";
        if (!map.has(cat)) map.set(cat, []);
        map.get(cat).push(g);
    }
    return [...map.entries()];
}

// --- UI: build entity dropdown (value = href ID) ---
function collectEntityOptions() {
    // clear, keep first option
    while (elEntity.options.length > 1) elEntity.remove(1);

    const map = new Map(); // id -> label
    for (const g of GIFTS) {
        for (const p of (g.richDescription || [])) {
            if (p.key !== "entity") continue;
            const id = entityId(p);
            if (!id) continue;
            if (!map.has(id)) map.set(id, entityDisplayText(p));
        }
    }

    const options = [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    for (const [id, label] of options) {
        const opt = document.createElement("option");
        opt.value = id;           // FILTER KEY (href)
        opt.textContent = label;  // DISPLAY
        elEntity.appendChild(opt);
    }
}

// --- Rendering helpers ---
function richPartToNode(part) {
    if (part.key === "text") {
        const span = document.createElement("span");
        span.className = "t";
        span.textContent = part.text ?? "";
        if (part.color) span.style.color = part.color;
        if (part.bold) span.style.fontWeight = "700";
        return span;
    }

    if (part.key === "entity") {
        const id = entityId(part);
        const label = entityDisplayText(part);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "entity-btn";
        btn.title = `Filter by: ${label}`;

        // Click applies href-based filter (toggle off if same)
        btn.addEventListener("click", () => {
            elEntity.value = (elEntity.value === id) ? "" : id;
            render();
        });

        if (part.icon) {
            const img = document.createElement("img");
            img.src = absUrl(part.icon);
            img.alt = label;
            btn.appendChild(img);
        }

        const text = document.createElement("span");
        text.textContent = label;
        if (part.color) text.style.color = part.color;
        if (part.bold) text.style.fontWeight = "700";
        btn.appendChild(text);

        return btn;
    }

    const fallback = document.createElement("span");
    fallback.className = "t";
    fallback.textContent = String(part?.text ?? "");
    return fallback;
}

function renderCard(gift, shouldFade) {
    const options = arguments.length > 2 ? arguments[2] : {};
    const card = document.createElement("div");
    card.className = "card" + (shouldFade ? " faded" : "");
    if (options.compact) card.classList.add("card--compact");
    if (options.mode === "deck") card.classList.add("card--deck");
    const giftId = (gift.name || "").trim();
    if (giftId) card.dataset.giftId = giftId;

    const top = document.createElement("div");
    top.className = "top";

    const img = document.createElement("img");
    img.className = "gift-icon";
    img.src = absUrl(gift.imageUrl);
    img.alt = gift.name || gift.category || "gift";
    top.appendChild(img);

    const meta = document.createElement("div");
    meta.className = "meta";

    const title = document.createElement("div");
    title.className = "title";

    const mainName = (gift.name && gift.name.trim()) ? gift.name.trim() : "(Unnamed gift)";
    const nameEl = document.createElement("span");
    nameEl.textContent = mainName;
    title.appendChild(nameEl);

    if (gift.category) {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.style = "display: none";
        badge.textContent = gift.category;
        title.appendChild(badge);
    }

    meta.appendChild(title);

    const desc = document.createElement("div");
    desc.className = "desc";

    const rich = document.createElement("div");
    rich.className = "rich";
    for (const part of (gift.richDescription || [])) {
        rich.appendChild(richPartToNode(part));
    }

    desc.appendChild(rich);
    meta.appendChild(desc);

    top.appendChild(meta);
    card.appendChild(top);

    if (options.showAdd) {
        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "add-btn";
        addBtn.textContent = "Add";
        addBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            options.onAdd?.(gift);
        });
        card.appendChild(addBtn);
    }

    if (options.showRemove) {
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "deck-remove";
        removeBtn.textContent = "×";
        removeBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            options.onRemove?.(gift);
        });
        card.appendChild(removeBtn);
    }

    return card;
}

// --- Sections ---
function createSectionSkeleton(category) {
    const section = document.createElement("section");
    section.className = "section";
    section.dataset.category = category;

    const head = document.createElement("div");
    head.className = "section-head";

    const title = document.createElement("h2");
    title.className = "section-title";
    title.textContent = category;

    const sub = document.createElement("div");
    sub.className = "section-sub";
    sub.textContent = "";

    head.appendChild(title);
    head.appendChild(sub);
    section.appendChild(head);

    const grid = document.createElement("div");
    grid.className = "grid";
    section.appendChild(grid);

    return section;
}

function ensureSection(category) {
    let section = elSections.querySelector(`.section[data-category="${CSS.escape(category)}"]`);
    if (!section) {
        section = createSectionSkeleton(category);
        elSections.appendChild(section);
    }
    return section;
}

// --- Scroll indicators ---
const scrollUI = createScrollIndicators();

function createScrollIndicators() {
    const up = document.createElement("button");
    up.type = "button";
    up.className = "scroll-indicator scroll-indicator--up";
    up.setAttribute("aria-label", "Scroll to previous match");
    up.innerHTML = `
    <span class="badge"></span>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 5l-7 7M12 5l7 7"></path>
      <path d="M12 5v14"></path>
    </svg>
  `;

    const down = document.createElement("button");
    down.type = "button";
    down.className = "scroll-indicator scroll-indicator--down";
    down.setAttribute("aria-label", "Scroll to next match");
    down.innerHTML = `
    <span class="badge"></span>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 19l7-7M12 19l-7-7"></path>
      <path d="M12 5v14"></path>
    </svg>
  `;

    document.body.appendChild(up);
    document.body.appendChild(down);

    up.addEventListener("click", () => scrollToNearestUnfaded("up"));
    down.addEventListener("click", () => scrollToNearestUnfaded("down"));

    // Update on scroll/resize
    const onMove = throttle(updateScrollIndicators, 100);
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove);

    return { up, down };
}

function getUnfadedCards() {
    // unfaded = .card that does NOT have .faded and is in the DOM (and visible)
    return [...document.querySelectorAll(".card:not(.faded)")].filter(el => {
        const section = el.closest(".section");
        if (!section) return true;
        // if you ever hide empty sections, cards won't exist anyway
        return true;
    });
}

function updateScrollIndicators() {
    const cards = getUnfadedCards();

    // If no filter is active, we generally don't need indicators.
    // BUT you asked "when there are unfaded cards outside view" — that would always be true on long pages.
    // So: show indicators ONLY when filter is active (some are faded).
    const filterActive = Boolean(elEntity.value || elSearch.value.trim());
    if (!filterActive || cards.length === 0) {
        scrollUI.up.classList.remove("show", "show-badge");
        scrollUI.down.classList.remove("show", "show-badge");
        return;
    }

    const topY = 0;
    const bottomY = window.innerHeight;

    let above = 0;
    let below = 0;

    for (const c of cards) {
        const r = c.getBoundingClientRect();
        if (r.bottom < topY) above++;
        else if (r.top > bottomY) below++;
    }

    setIndicator(scrollUI.up, above);
    setIndicator(scrollUI.down, below);
}

function setIndicator(el, count) {
    const badge = el.querySelector(".badge");
    if (count > 0) {
        el.classList.add("show");
        // show badge only for small-ish counts (optional)
        if (count <= 99) {
            el.classList.add("show-badge");
            badge.textContent = String(count);
        } else {
            el.classList.remove("show-badge");
            badge.textContent = "";
        }
    } else {
        el.classList.remove("show", "show-badge");
        badge.textContent = "";
    }
}

function scrollToNearestUnfaded(direction) {
    const cards = getUnfadedCards();
    if (cards.length === 0) return;

    const center = window.innerHeight / 2;

    // Find candidates outside view in the target direction
    const candidates = [];
    for (const c of cards) {
        const r = c.getBoundingClientRect();
        if (direction === "up") {
            if (r.bottom < 0) candidates.push({ el: c, dist: Math.abs(r.bottom) });
        } else {
            if (r.top > window.innerHeight) candidates.push({ el: c, dist: r.top - window.innerHeight });
        }
    }
    if (candidates.length === 0) return;

    // nearest one
    candidates.sort((a, b) => a.dist - b.dist);
    const target = candidates[0].el;

    target.scrollIntoView({ behavior: "smooth", block: "center" });

    // After scroll animation starts, update indicators soon
    setTimeout(updateScrollIndicators, 180);
}

function throttle(fn, wait) {
    let last = 0;
    let t = null;
    return function (...args) {
        const now = Date.now();
        const remaining = wait - (now - last);
        if (remaining <= 0) {
            last = now;
            fn.apply(this, args);
        } else if (!t) {
            t = setTimeout(() => {
                t = null;
                last = Date.now();
                fn.apply(this, args);
            }, remaining);
        }
    };
}

// --- render() ---
function render() {
    const selectedEntityId = elEntity.value;
    const q = elSearch.value.trim();
    const filterActive = Boolean(selectedEntityId || q);

    let totalMatched = 0;

    const grouped = groupByCategory();
    const existingCats = new Set(grouped.map(([cat]) => cat));

    // Remove sections that no longer exist in data
    for (const sec of [...elSections.querySelectorAll(".section")]) {
        if (!existingCats.has(sec.dataset.category)) sec.remove();
    }

    for (const [cat, gifts] of grouped) {
        const section = ensureSection(cat);
        const title = section.querySelector(".section-title");
        const sub = section.querySelector(".section-sub");
        const grid = section.querySelector(".grid");

        // Determine if this section has any matches
        let displayMatches = 0;
        for (const g of gifts) {
            if (matchesEntity(g, selectedEntityId) && matchesSearch(g, q)) displayMatches++;
        }

        // Hide section with no gifts (your reverted behavior)
        // If you want "hide only when filter active and no matches", change condition accordingly.
        // Based on your note: "hide sections without gifts" (so if empty after rendering, hide).
        // Here: if filter active and displayMatches === 0 => hide section (no grid)
        // If filter not active => always show (since all gifts are visible).
        // if (filterActive && displayMatches === 0) {
        //     section.style.display = "none";
        //     continue;
        // } else {
        //     section.style.display = "";
        // }
        title.classList.remove("faded");
        if (filterActive && displayMatches === 0) {
            title.classList.add("faded");
        }

        // Render all gifts; fade unmatched when filter active
        grid.innerHTML = "";
        for (const g of gifts) {
            const m = matchesEntity(g, selectedEntityId) && matchesSearch(g, q);
            if (!filterActive || m) totalMatched += 1;
            grid.appendChild(renderCard(g, filterActive && !m, {
                showAdd: true,
                onAdd: addGiftToDeck
            }));
        }

        if (!filterActive) {
            sub.textContent = `${gifts.length} gifts`;
        } else {
            sub.textContent = `${displayMatches} gifts`;
            if (displayMatches === 0) sub.textContent = "";
        }

        title.classList.toggle("faded", filterActive && displayMatches === 0);
    }

    const total = GIFTS.length;
    elCount.textContent = filterActive ? `${totalMatched} / ${total} match` : `${total} / ${total} match`;

    // Update scroll indicators after DOM changes
    updateScrollIndicators();
    updateAddButtonStates();
}

// Init
collectEntityOptions();
render();
initDeck();

elEntity.addEventListener("change", render);
elSearch.addEventListener("input", render);
elClear.addEventListener("click", () => {
    elEntity.value = "";
    elSearch.value = "";
    render();
});

// --- Deck builder ---
function setDeckOpen(isOpen) {
    deckState.open = isOpen;
    elDeck.classList.toggle("is-open", isOpen);
    elDeckToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function updateDeckHeader() {
    elDeckToggle.textContent = `Deck (${deckState.ids.length}/${MAX_DECK})`;
}

function updateAddButtonStates() {
    const inDeck = new Set(deckState.ids);
    for (const btn of document.querySelectorAll(".add-btn")) {
        const card = btn.closest(".card");
        const id = card?.dataset?.giftId;
        const isInDeck = id && inDeck.has(id);
        btn.classList.toggle("add-btn--disabled", Boolean(isInDeck));
        btn.textContent = isInDeck ? "Added" : "Add";
    }
}

function renderDeckSlots() {
    elDeckSlots.innerHTML = "";
    for (let i = 0; i < MAX_DECK; i++) {
        const slot = document.createElement("div");
        slot.className = "deck-slot" + (i < 8 ? " deck-slot--priority" : "");
        const giftId = deckState.ids[i];
        if (giftId && giftsById.has(giftId)) {
            const gift = giftsById.get(giftId);
            slot.appendChild(renderCard(gift, false, {
                mode: "deck",
                compact: true,
                showRemove: true,
                onRemove: () => removeGiftAtIndex(i)
            }));
        } else {
            const placeholder = document.createElement("div");
            placeholder.className = "deck-placeholder";
            slot.appendChild(placeholder);
        }
        elDeckSlots.appendChild(slot);
    }
}

function renderDeckEntities() {
    const map = new Map();
    for (const id of deckState.ids) {
        const gift = giftsById.get(id);
        if (!gift) continue;
        for (const ent of giftEntities(gift)) {
            if (!map.has(ent.id)) map.set(ent.id, { label: ent.label, count: 0 });
            map.get(ent.id).count += 1;
        }
    }

    elDeckEntities.innerHTML = "";
    const entries = [...map.entries()].sort((a, b) => a[1].label.localeCompare(b[1].label));
    if (entries.length === 0) {
        const empty = document.createElement("div");
        empty.className = "deck-status";
        empty.textContent = "No entities yet.";
        elDeckEntities.appendChild(empty);
        return;
    }

    for (const [id, data] of entries) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "deck-entity-btn";
        btn.innerHTML = `<span>${data.label}</span><span class="count">${data.count}</span>`;
        btn.addEventListener("click", () => {
            elEntity.value = id;
            render();
        });
        elDeckEntities.appendChild(btn);
    }
}

function buildShareUrl() {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    params.delete(DECK_PARAM);
    const base = `${url.origin}${url.pathname}`;
    const encoded = deckState.ids.map(id => encodeURIComponent(id)).join(",");
    const qs = params.toString();
    if (deckState.ids.length === 0) return qs ? `${base}?${qs}` : base;
    return qs ? `${base}?${qs}&${DECK_PARAM}=${encoded}` : `${base}?${DECK_PARAM}=${encoded}`;
}

function updateDeckUrl() {
    const url = buildShareUrl();
    history.replaceState({}, "", url);
}

function parseDeckFromUrl() {
    let raw = getRawQueryParam(DECK_PARAM);
    if (!raw && window.location.hash) {
        const hash = window.location.hash.replace(/^#/, "");
        if (hash.startsWith(`${DECK_PARAM}=`)) raw = hash.slice(DECK_PARAM.length + 1);
    }
    if (!raw) return [];
    return raw.split(",").map(x => decodeURIComponent(x)).map(s => s.trim()).filter(Boolean);
}

function getRawQueryParam(name) {
    const q = window.location.search.replace(/^\?/, "");
    if (!q) return "";
    const parts = q.split("&");
    for (const part of parts) {
        const [k, v] = part.split("=");
        if (k === name) return v || "";
    }
    return "";
}

function saveDeckToStorage() {
    try {
        localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(deckState.ids));
    } catch {
    }
}

function loadDeckFromStorage() {
    try {
        const raw = localStorage.getItem(DECK_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(String).map(s => s.trim()).filter(Boolean);
    } catch {
        return [];
    }
}

function setDeck(ids) {
    const next = [];
    const seen = new Set();
    for (const id of ids) {
        if (!id || seen.has(id) || !giftsById.has(id)) continue;
        next.push(id);
        seen.add(id);
        if (next.length >= MAX_DECK) break;
    }
    deckState.ids = next;
    renderDeckSlots();
    renderDeckEntities();
    updateDeckHeader();
    updateDeckUrl();
    saveDeckToStorage();
    updateAddButtonStates();
}

function addGiftToDeck(gift) {
    const id = (gift.name || "").trim();
    if (!id) return;
    if (deckState.ids.includes(id)) {
        showToast("Already in deck.");
        return;
    }
    if (deckState.ids.length >= MAX_DECK) {
        showToast("Deck is full (20). Remove a gift to add another.");
        return;
    }
    deckState.ids.push(id);
    renderDeckSlots();
    renderDeckEntities();
    updateDeckHeader();
    updateDeckUrl();
    saveDeckToStorage();
    updateAddButtonStates();
}

function removeGiftAtIndex(index) {
    if (index < 0 || index >= deckState.ids.length) return;
    deckState.ids.splice(index, 1);
    renderDeckSlots();
    renderDeckEntities();
    updateDeckHeader();
    updateDeckUrl();
    saveDeckToStorage();
    updateAddButtonStates();
}

function showToast(text) {
    let toast = document.querySelector(".toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "toast";
        document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 1800);
}

async function copyShareLink() {
    const url = buildShareUrl();
    try {
        await navigator.clipboard.writeText(url);
        showToast("Share link copied.");
    } catch {
        const fallback = window.prompt("Copy share link:", url);
        if (fallback !== null) showToast("Share link ready.");
    }
}

function initDeck() {
    updateDeckHeader();
    renderDeckSlots();
    renderDeckEntities();
    setDeckOpen(false);

    const fromUrl = parseDeckFromUrl();
    if (fromUrl.length > 0) {
        setDeck(fromUrl);
    } else {
        const stored = loadDeckFromStorage();
        if (stored.length > 0) setDeck(stored);
    }

    elDeckToggle.addEventListener("click", () => setDeckOpen(!deckState.open));
    elCopyDeckLink.addEventListener("click", copyShareLink);
    updateAddButtonStates();
}
