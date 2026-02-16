// ---- YOUR DATA HERE ----
const GIFTS = window.GIFTS_DATA || [];

const WIKI_BASE = "https://windblown.wiki.gg";

const elSections = document.getElementById("sections");
const elEntity = document.getElementById("entitySelect");
const elSearch = document.getElementById("searchInput");
const elCount = document.getElementById("count");
const elClear = document.getElementById("clearBtn");

// --- href-based entity identity ---
function normalizeHref(href){
    if(!href) return "";
    try{
        const u = new URL(href, WIKI_BASE);
        // Use pathname (+search if present) as the stable ID
        return u.pathname + (u.search || "");
    } catch {
        return String(href).trim();
    }
}
function entityId(part){
    return normalizeHref(part.href);
}
function entityDisplayText(part){
    const t = (part.text || "").trim();
    if (t) return t;

    const id = entityId(part);
    const last = id.split("/").filter(Boolean).pop() || "";
    return decodeURIComponent(last.replaceAll("_"," "));
}
function absUrl(u){
    if(!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    if (u.startsWith("/")) return WIKI_BASE + u;
    return u;
}

function giftEntityIds(gift){
    const ids = [];
    for (const part of (gift.richDescription || [])) {
        if (part.key !== "entity") continue;
        const id = entityId(part);
        if (id) ids.push(id);
    }
    return ids;
}

function collectEntityOptions(){
    // id -> label (first seen)
    const map = new Map();
    for (const g of GIFTS){
        for (const p of (g.richDescription || [])){
            if (p.key !== "entity") continue;
            const id = entityId(p);
            if (!id) continue;
            if (!map.has(id)) map.set(id, entityDisplayText(p));
        }
    }
    const options = [...map.entries()].sort((a,b)=>a[1].localeCompare(b[1]));
    for (const [id,label] of options){
        const opt = document.createElement("option");
        opt.value = id;          // FILTER KEY (href)
        opt.textContent = label; // DISPLAY
        elEntity.appendChild(opt);
    }
}

function richPartToNode(part){
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
        btn.title = `Filter by: ${label} (${id})`;

        // Clicking applies filter by href ID
        btn.addEventListener("click", () => {
            // toggle behavior: click again to clear
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

function renderCard(gift, isFaded){
    const card = document.createElement("div");
    card.className = "card" + (isFaded ? " faded" : "");

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
        // const badge = document.createElement("span");
        // badge.className = "badge";
        // badge.textContent = gift.category;
        // title.appendChild(badge);
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

function matchesSearch(gift, q){
    if (!q) return true;
    q = q.toLowerCase();
    const name = (gift.name || "").toLowerCase();
    const cat = (gift.category || "").toLowerCase();
    const text = (gift.richDescription || []).map(p => (p.text || "")).join(" ").toLowerCase();
    return name.includes(q) || cat.includes(q) || text.includes(q);
}

// MATCHES BY href ID (stable), not text
function matchesEntity(gift, selectedEntityId){
    if (!selectedEntityId) return true;
    return giftEntityIds(gift).includes(selectedEntityId);
}

function groupByCategory(){
    const map = new Map();
    for (const g of GIFTS){
        const cat = (g.category && g.category.trim()) ? g.category.trim() : "Uncategorized";
        if (!map.has(cat)) map.set(cat, []);
        map.get(cat).push(g);
    }
    return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
}

function render(){
    const selectedEntityId = elEntity.value;   // <-- href-based
    const q = elSearch.value.trim();

    elSections.innerHTML = "";
    let matchedCount = 0;

    for (const [cat, gifts] of groupByCategory()){
        const section = document.createElement("section");
        section.className = "section";

        const head = document.createElement("div");
        head.className = "section-head";

        const title = document.createElement("h2");
        title.className = "section-title";
        title.textContent = cat;

        const sub = document.createElement("div");
        sub.className = "section-sub";

        head.appendChild(title);
        head.appendChild(sub);
        section.appendChild(head);

        const grid = document.createElement("div");
        grid.className = "grid";

        let sectionMatched = 0;

        for (const g of gifts){
            const m = matchesEntity(g, selectedEntityId) && matchesSearch(g, q);
            if (m) { matchedCount++; sectionMatched++; }
            grid.appendChild(renderCard(g, !m && (selectedEntityId || q)));
        }

        sub.textContent = `${sectionMatched} / ${gifts.length} match`;
        section.appendChild(grid);
        elSections.appendChild(section);
    }

    const total = GIFTS.length;
    const showingMatched = (selectedEntityId || q) ? matchedCount : total;
    elCount.textContent = `${showingMatched} / ${total} match`;
}

collectEntityOptions();
render();

elEntity.addEventListener("change", render);
elSearch.addEventListener("input", render);
elClear.addEventListener("click", () => {
    elEntity.value = "";
    elSearch.value = "";
    render();
});