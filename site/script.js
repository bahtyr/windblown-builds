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
    const card = document.createElement("div");
    card.className = "card" + (shouldFade ? " faded" : "");

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
            grid.appendChild(renderCard(g, filterActive && !m));
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
}

// Init
collectEntityOptions();
render();

elEntity.addEventListener("change", render);
elSearch.addEventListener("input", render);
elClear.addEventListener("click", () => {
    elEntity.value = "";
    elSearch.value = "";
    render();
});
