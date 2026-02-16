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
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
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
// NOTE: expects your CSS to have: .card, .card.faded, .entity-btn, etc.

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

// --- Sections: keep headings always; clear section contents if no results in that section ---
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
    sub.textContent = ""; // updated in render()

    head.appendChild(title);
    head.appendChild(sub);
    section.appendChild(head);

    // content container (grid)
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

function render() {
    const selectedEntityId = elEntity.value;     // href-based filter key
    const q = elSearch.value.trim();
    const filterActive = Boolean(selectedEntityId || q);

    let totalMatched = 0;

    // Ensure all sections exist (headings always visible)
    const grouped = groupByCategory();
    const existingCats = new Set(grouped.map(([cat]) => cat));

    // Optionally remove sections that no longer exist in data:
    for (const sec of [...elSections.querySelectorAll(".section")]) {
        if (!existingCats.has(sec.dataset.category)) sec.remove();
    }

    // Render each section
    for (const [cat, gifts] of grouped) {
        const section = ensureSection(cat);
        const sub = section.querySelector(".section-sub");
        const grid = section.querySelector(".grid");

        // Determine "results" for this section:
        // "results" means any gift matches current filter (entity+search). If no filter active, results = all gifts.
        let sectionMatches = 0;
        for (const g of gifts) {
            const m = matchesEntity(g, selectedEntityId) && matchesSearch(g, q);
            if (m) sectionMatches++;
        }

        // If there are no results for this section under the current filter:
        // clear contents, keep heading
        if (filterActive && sectionMatches === 0) {
            grid.innerHTML = "";
            sub.textContent = `0 / ${gifts.length} match`;
            continue;
        }

        // Otherwise: keep items (render all), fade unmatched
        grid.innerHTML = "";
        for (const g of gifts) {
            const m = matchesEntity(g, selectedEntityId) && matchesSearch(g, q);
            if (m) { sectionMatches++; totalMatched++; }
            grid.appendChild(renderCard(g, filterActive && !m));
        }

        // Important: when filterActive=false, sectionMatches should show all
        if (!filterActive) {
            sub.textContent = `${gifts.length} / ${gifts.length} match`;
            totalMatched += gifts.length;
        } else {
            // We double-counted sectionMatches above if filterActive; fix: recompute for display
            // (cheap + clear)
            let displayMatches = 0;
            for (const g of gifts) {
                if (matchesEntity(g, selectedEntityId) && matchesSearch(g, q)) displayMatches++;
            }
            sub.textContent = `${displayMatches} / ${gifts.length} match`;
        }
    }

    const total = GIFTS.length;
    elCount.textContent = filterActive ? `${totalMatched} / ${total} match` : `${total} / ${total} match`;
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
