// ===== NAPEIZ STOREFRONT =====
// The catalogue is fetched once (lightweight columns only). Filtering, sorting and
// search all run in memory, and the grid renders in pages, so the UI stays instant.

const WHATSAPP = "254708521714";
const PAGE_SIZE = 20;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
    catalog: [],
    categories: new Map(),
    brands: new Map(),
    filter: { category: "all", brand: "all", sort: "newest", q: "" },
    results: [],
    page: 1,
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

document.addEventListener("DOMContentLoaded", () => {
    $("#year").textContent = new Date().getFullYear();
    initTheme();
    initHeader();
    initReveal();
    initHeroMedia();
    initCountdown();
    initSearch();
    initEvents();
    renderCartBadge();
    loadStore();
});

// ===== DATA =====
async function loadStore() {
    renderSkeletonGrid();
    try {
        const connected = await DB.init();
        if (!connected) throw new Error("offline");

        const [catalog, categories, brands] = await Promise.all([DB.getCatalog(), DB.getCategories(), DB.getBrands()]);
        state.catalog = catalog;
        categories.forEach((c) => state.categories.set(c.id, c));
        brands.forEach((b) => state.brands.set(b.id, b));

        renderCategoryChips();
        renderBrandFilter();
        renderBrandMarquee();
        renderFooterCategories();
        renderSpotlight();
        renderDeals();
        applyFilters();
        setStats();
    } catch (err) {
        console.error("Store failed to load:", err);
        $("#productGrid").innerHTML = `
            <div class="empty">
                <i class="fas fa-wifi"></i>
                <h3>We couldn't load the products</h3>
                <p>Check your connection and try again.</p>
                <button class="btn btn-primary" onclick="location.reload()">Retry</button>
            </div>`;
        $("#dealsCarousel").innerHTML = "";
        $("#spotStage").innerHTML = "";
    }
}

const catOf = (p) => state.categories.get(p.category_id);
const brandOf = (p) => state.brands.get(p.brand_id);
const discountOf = (p) => (p.old_price && p.old_price > p.price ? Math.round((1 - p.price / p.old_price) * 100) : 0);
const countBy = (key) => state.catalog.reduce((m, p) => m.set(p[key], (m.get(p[key]) || 0) + 1), new Map());

// ===== FILTER + RENDER GRID =====
function applyFilters({ scroll = false } = {}) {
    const { category, brand, sort, q } = state.filter;
    const needle = q.trim().toLowerCase();

    let list = state.catalog.filter((p) => {
        if (category !== "all" && catOf(p)?.slug !== category) return false;
        if (brand !== "all" && String(p.brand_id) !== String(brand)) return false;
        if (needle) {
            const hay = `${p.name} ${brandOf(p)?.name || ""} ${catOf(p)?.name || ""}`.toLowerCase();
            if (!needle.split(/\s+/).every((w) => hay.includes(w))) return false;
        }
        return true;
    });

    const sorters = {
        price_asc: (a, b) => a.price - b.price,
        price_desc: (a, b) => b.price - a.price,
        discount: (a, b) => discountOf(b) - discountOf(a),
        newest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    };
    list.sort(sorters[sort] || sorters.newest);
    // Keep in-stock items ahead of out-of-stock ones
    list.sort((a, b) => Number(b.in_stock) - Number(a.in_stock));

    state.results = list;

    $$(".chip").forEach((c) => c.classList.toggle("active", c.dataset.category === category));
    $("#brandFilter").value = brand;
    $("#sortFilter").value = sort;

    if (!list.length) {
        $("#productGrid").innerHTML = `
            <div class="empty">
                <i class="fas fa-magnifying-glass"></i>
                <h3>No products found</h3>
                <p>Try another search or clear the filters.</p>
                <button class="btn btn-outline" data-reset>Clear filters</button>
            </div>`;
        $("#pagination").innerHTML = "";
        $("#resultCount").textContent = `0 of ${state.catalog.length} products`;
    } else {
        renderPage(1);
    }

    if (scroll) scrollToShop();
}

function scrollToShop() {
    $("#shop").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
}

// ===== PAGINATION =====
function renderPage(page) {
    const pages = Math.ceil(state.results.length / PAGE_SIZE);
    state.page = Math.min(Math.max(1, page), pages);
    const start = (state.page - 1) * PAGE_SIZE;
    const slice = state.results.slice(start, start + PAGE_SIZE);

    $("#productGrid").innerHTML = slice.map((p, i) => cardHTML(p, i)).join("");
    $("#resultCount").textContent =
        pages > 1
            ? `Showing ${start + 1}–${start + slice.length} of ${state.results.length} products`
            : `${state.results.length} products`;
    $("#pagination").innerHTML = paginationHTML(state.page, pages);
}

// Page list with ellipses, e.g. 1 … 4 5 6 … 12
function pageList(current, pages) {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    const set = new Set([1, pages, current - 1, current, current + 1]);
    if (current <= 3) [2, 3, 4].forEach((n) => set.add(n));
    if (current >= pages - 2) [pages - 1, pages - 2, pages - 3].forEach((n) => set.add(n));
    const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
    return nums.flatMap((n, i) => (i && n - nums[i - 1] > 1 ? ["…", n] : [n]));
}

function paginationHTML(current, pages) {
    if (pages <= 1) return "";
    const nums = pageList(current, pages)
        .map((n) =>
            n === "…"
                ? '<span class="page-gap" aria-hidden="true">…</span>'
                : `<button class="page-num ${n === current ? "active" : ""}" data-page="${n}" ${n === current ? 'aria-current="page"' : ""} aria-label="Page ${n}">${n}</button>`
        )
        .join("");
    return `
        <button class="page-step" data-page="${current - 1}" ${current === 1 ? "disabled" : ""} aria-label="Previous page"><i class="fas fa-arrow-left"></i><span>Prev</span></button>
        <div class="page-nums">${nums}</div>
        <span class="page-of">Page ${current} of ${pages}</span>
        <button class="page-step" data-page="${current + 1}" ${current === pages ? "disabled" : ""} aria-label="Next page"><span>Next</span><i class="fas fa-arrow-right"></i></button>`;
}

function renderSkeletonGrid() {
    $("#productGrid").innerHTML = '<div class="card skeleton-card"></div>'.repeat(8);
}

// ===== TEMPLATES =====
function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function money(n) {
    return "KSh " + Math.round(Number(n) || 0).toLocaleString("en-KE");
}

function iconFor(p) {
    const s = `${catOf(p)?.slug || ""} ${p.name || ""}`.toLowerCase();
    const map = [
        [/tv|theatre|theater/, "tv"], [/phone|tablet|infinix|tecno/, "mobile-screen"], [/laptop|computer|printer/, "laptop"],
        [/audio|speaker|sound|woofer|headphone|church/, "volume-high"], [/gaming|console/, "gamepad"], [/watch|wearable/, "clock"],
        [/bulb|lamp|light/, "lightbulb"], [/wifi|router/, "wifi"], [/socket|switch|cable|wire/, "plug"],
        [/power|pump|generator|pressure/, "bolt"], [/appliance|microwave|fridge|blender|iron/, "blender"],
    ];
    return (map.find(([re]) => re.test(s)) || [, "microchip"])[1];
}

function thumbHTML(src, alt, icon, eager = false) {
    const img = src
        ? `<img src="${esc(src)}" alt="${esc(alt)}" ${eager ? "" : 'loading="lazy"'} decoding="async" referrerpolicy="no-referrer" onload="this.classList.add('loaded')" onerror="this.remove()">`
        : "";
    return `<div class="thumb">${img}<span class="ph"><i class="fas fa-${icon}"></i></span></div>`;
}

function cardHTML(p, i = 0) {
    const off = discountOf(p);
    const brand = brandOf(p)?.name || catOf(p)?.name || "";
    return `
    <article class="card enter" style="--i:${i % PAGE_SIZE}" data-id="${p.id}">
        <div class="badges">
            ${off ? `<span class="badge badge-off">-${off}%</span>` : ""}
            ${p.is_new ? '<span class="badge badge-new">New</span>' : ""}
            ${!p.in_stock ? '<span class="badge badge-out">Sold out</span>' : ""}
        </div>
        <button class="quick-add" data-view="${p.id}" aria-label="Quick view ${esc(p.name)}"><i class="fas fa-eye"></i></button>
        <div data-view="${p.id}">${thumbHTML(p.main_image, p.name, iconFor(p))}</div>
        <div class="card-body">
            <span class="card-brand">${esc(brand)}</span>
            <h3 class="card-name" data-view="${p.id}">${esc(p.name)}</h3>
            <div class="card-foot">
                <div class="price">
                    <strong>${money(p.price)}</strong>
                    ${off ? `<s>${money(p.old_price)}</s>` : ""}
                </div>
                <button class="add-btn" data-add="${p.id}" ${p.in_stock ? "" : "disabled"} aria-label="Add ${esc(p.name)} to cart">
                    <i class="fas fa-plus"></i><span>Add</span>
                </button>
            </div>
        </div>
    </article>`;
}

// ===== SECTIONS =====
function renderCategoryChips() {
    const counts = countBy("category_id");
    const cats = [...state.categories.values()].filter((c) => counts.get(c.id)).sort((a, b) => counts.get(b.id) - counts.get(a.id));
    $("#categoryChips").innerHTML =
        `<button class="chip active" data-category="all">All <small>${state.catalog.length}</small></button>` +
        cats.map((c) => `<button class="chip" data-category="${esc(c.slug)}">${esc(c.name)} <small>${counts.get(c.id)}</small></button>`).join("");
}

function renderBrandFilter() {
    const counts = countBy("brand_id");
    const brands = [...state.brands.values()].filter((b) => counts.get(b.id)).sort((a, b) => a.name.localeCompare(b.name));
    $("#brandFilter").innerHTML = `<option value="all">All brands</option>` + brands.map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join("");
}

function renderBrandMarquee() {
    const counts = countBy("brand_id");
    const brands = [...state.brands.values()].filter((b) => counts.get(b.id)).sort((a, b) => counts.get(b.id) - counts.get(a.id));
    if (!brands.length) return $(".brands").remove();
    const items = brands.map((b) => `<button data-brand="${b.id}">${esc(b.name)}</button>`).join("");
    $("#brandTrack").innerHTML = items + items.replace(/<button/g, '<button aria-hidden="true" tabindex="-1"');
}

function renderFooterCategories() {
    const counts = countBy("category_id");
    const cats = [...state.categories.values()].filter((c) => counts.get(c.id)).sort((a, b) => counts.get(b.id) - counts.get(a.id)).slice(0, 6);
    $("#footerCategories").innerHTML = cats.map((c) => `<li><button data-cat="${esc(c.slug)}">${esc(c.name)}</button></li>`).join("");
}

function setStats() {
    const brandsWithProducts = new Set(state.catalog.map((p) => p.brand_id).filter(Boolean)).size;
    $("#statProducts").dataset.count = state.catalog.length;
    $("#statProducts").dataset.suffix = "+";
    $("#statBrands").dataset.count = brandsWithProducts;
    const stats = $(".hero-stats");
    new IntersectionObserver((entries, obs) => {
        if (!entries[0].isIntersecting) return;
        obs.disconnect();
        $$("[data-count]", stats).forEach(countUp);
    }).observe(stats);
}

function countUp(el) {
    const target = Number(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || "";
    if (reduceMotion) return (el.textContent = target.toLocaleString() + suffix);
    const start = performance.now();
    const dur = 1600;
    const tick = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 4);
        el.textContent = Math.round(target * eased).toLocaleString() + (t === 1 ? suffix : "");
        if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

// Spotlight carousel in the hero
function renderSpotlight() {
    const withImg = state.catalog.filter((p) => p.main_image && p.in_stock);
    let picks = withImg.filter((p) => p.is_featured);
    if (picks.length < 3) picks = [...picks, ...withImg.filter((p) => !p.is_featured).sort((a, b) => discountOf(b) - discountOf(a))];
    picks = picks.slice(0, 5);
    if (!picks.length) return $("#spotlight").remove();

    $("#spotStage").innerHTML = picks
        .map((p, i) => {
            const off = discountOf(p);
            return `
            <button class="spot-slide ${i === 0 ? "active" : ""}" data-view="${p.id}" aria-label="View ${esc(p.name)}">
                ${thumbHTML(p.main_image, p.name, iconFor(p), i === 0)}
                <div class="spot-info">
                    <div><small>${esc(brandOf(p)?.name || catOf(p)?.name || "")}</small><h3>${esc(p.name)}</h3></div>
                    <div class="spot-price">${off ? `<s>${money(p.old_price)}</s>` : ""}<strong>${money(p.price)}</strong></div>
                </div>
            </button>`;
        })
        .join("");
    $("#spotDots").innerHTML = picks.map((_, i) => `<button class="${i === 0 ? "active" : ""}" data-spot="${i}" aria-label="Show deal ${i + 1}"></button>`).join("");

    let idx = 0;
    let timer;
    const slides = $$(".spot-slide");
    const dots = $$("#spotDots button");
    const go = (n) => {
        if (n === idx) return;
        slides[idx].classList.remove("active");
        slides[idx].classList.add("leaving");
        const prev = slides[idx];
        setTimeout(() => prev.classList.remove("leaving"), 700);
        dots[idx].classList.remove("active");
        idx = (n + slides.length) % slides.length;
        slides[idx].classList.add("active");
        dots[idx].classList.add("active");
    };
    const play = () => {
        clearInterval(timer);
        if (slides.length > 1 && !reduceMotion) timer = setInterval(() => go(idx + 1), 4500);
    };
    $("#spotDots").addEventListener("click", (e) => {
        const b = e.target.closest("[data-spot]");
        if (b) { go(Number(b.dataset.spot)); play(); }
    });
    $("#spotlight").addEventListener("mouseenter", () => clearInterval(timer));
    $("#spotlight").addEventListener("mouseleave", play);
    play();
}

function renderDeals() {
    let deals = state.catalog.filter((p) => discountOf(p) > 0 && p.in_stock).sort((a, b) => discountOf(b) - discountOf(a));
    if (deals.length < 4) deals = [...deals, ...state.catalog.filter((p) => p.is_featured && !deals.includes(p))];
    deals = deals.slice(0, 12);
    if (!deals.length) return $("#deals").remove();
    $("#dealsCarousel").innerHTML = deals.map((p, i) => cardHTML(p, i)).join("");
}

// ===== QUICK VIEW =====
async function openProduct(id) {
    const body = $("#productModalBody");
    body.innerHTML = `<div class="pd-skel"><div class="skeleton"></div><div class="skeleton"></div></div>`;
    openOverlay("#productModal");

    let p;
    try {
        p = await DB.getProductById(id);
    } catch (err) {
        console.error(err);
        closeOverlay("#productModal");
        return toast("Couldn't load that product", "error");
    }

    const off = discountOf(p);
    const images = [p.main_image, ...(p.gallery_images || [])].filter(Boolean);
    const specs = p.specifications && typeof p.specifications === "object" ? Object.entries(p.specifications) : [];
    const features = (p.features || []).filter(Boolean).slice(0, 8);
    const desc = p.short_description || p.full_description || "";
    let qty = 1;

    body.innerHTML = `
    <div class="pd">
        <div class="pd-gallery">
            <div id="pdMain">${thumbHTML(images[0], p.name, iconFor(p), true)}</div>
            ${images.length > 1 ? `<div class="pd-thumbs">${images.map((src, i) => `<button class="${i ? "" : "active"}" data-img="${i}"><img src="${esc(src)}" alt="" referrerpolicy="no-referrer" loading="lazy"></button>`).join("")}</div>` : ""}
        </div>
        <div class="pd-info">
            <span class="card-brand">${esc(p.brands?.name || "")}</span>
            <h2>${esc(p.name)}</h2>
            <div class="pd-meta">
                ${p.categories?.name ? `<span>${esc(p.categories.name)}</span>` : ""}
                ${p.sku ? `<span>SKU ${esc(p.sku)}</span>` : ""}
                <span class="${p.in_stock ? "in" : "out"}"><i class="fas fa-circle" style="font-size:7px;vertical-align:middle"></i> ${p.in_stock ? "In stock" : "Sold out"}</span>
            </div>
            <div class="pd-price">
                <strong>${money(p.price)}</strong>
                ${off ? `<s>${money(p.old_price)}</s><span class="badge badge-off">Save ${off}%</span>` : ""}
            </div>
            ${desc ? `<p class="pd-desc">${esc(desc)}</p>` : ""}
            ${features.length ? `<ul class="pd-features">${features.map((f) => `<li><i class="fas fa-check"></i><span>${esc(f)}</span></li>`).join("")}</ul>` : ""}
            ${specs.length ? `
                <details class="pd-specs">
                    <summary>Specifications <i class="fas fa-chevron-down"></i></summary>
                    <dl>${specs.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
                </details>` : ""}
            <div class="pd-assure">
                <div><i class="fas fa-shield-halved"></i><span>${esc(p.warranty || "Genuine product with manufacturer warranty")}</span></div>
                <div><i class="fas fa-truck-fast"></i><span>${esc(p.delivery_info || "Free delivery around Migori")}</span></div>
            </div>
            <div class="pd-actions">
                <div class="qty" aria-label="Quantity">
                    <button data-q="-1" aria-label="Decrease">−</button><span id="pdQty">1</span><button data-q="1" aria-label="Increase">+</button>
                </div>
                <button class="btn btn-primary" id="pdAdd" ${p.in_stock ? "" : "disabled"}><i class="fas fa-bag-shopping"></i> Add to bag</button>
                <button class="btn btn-whatsapp" id="pdWa"><i class="fab fa-whatsapp"></i> Order on WhatsApp</button>
            </div>
        </div>
    </div>`;

    body.onclick = (e) => {
        const t = e.target.closest("[data-img]");
        if (t) {
            $$(".pd-thumbs button", body).forEach((b) => b.classList.toggle("active", b === t));
            $("#pdMain").innerHTML = thumbHTML(images[t.dataset.img], p.name, iconFor(p), true);
        }
        const q = e.target.closest("[data-q]");
        if (q) {
            qty = Math.max(1, Math.min(99, qty + Number(q.dataset.q)));
            $("#pdQty").textContent = qty;
        }
    };
    $("#pdAdd").onclick = (e) => {
        addToCart(p, qty, e.currentTarget);
        closeOverlay("#productModal");
    };
    $("#pdWa").onclick = () => {
        window.open(`https://wa.me/${WHATSAPP}?text=${DB.generateWhatsAppMessage(p, qty)}`, "_blank", "noopener");
    };
}

// ===== CART =====
function getCart() {
    try {
        return JSON.parse(localStorage.getItem("napeizCart")) || [];
    } catch {
        return [];
    }
}

function saveCart(items) {
    try { localStorage.setItem("napeizCart", JSON.stringify(items)); } catch {}
    renderCartBadge();
    if ($("#cartDrawer").classList.contains("open")) renderCart();
}

function addToCart(p, qty = 1, fromEl) {
    if (!p) return;
    const cart = getCart();
    const existing = cart.find((i) => i.id === p.id);
    if (existing) existing.quantity += qty;
    else cart.push({ id: p.id, name: p.name, brand: (p.brands || brandOf(p))?.name || "", price: p.price, main_image: p.main_image, quantity: qty });
    saveCart(cart);
    flyToCart(fromEl);
    toast(`Added to bag: ${p.name}`);
}

function renderCartBadge() {
    const n = getCart().reduce((s, i) => s + i.quantity, 0);
    const badge = $("#cartCount");
    badge.textContent = n > 99 ? "99+" : n;
    badge.classList.toggle("show", n > 0);
}

function renderCart() {
    const cart = getCart();
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    $("#cartHeadCount").textContent = count ? `(${count})` : "";

    if (!cart.length) {
        $("#cartBody").innerHTML = `
            <div class="cart-empty">
                <div class="bag"><i class="fas fa-bag-shopping"></i></div>
                <h4>Your bag is empty</h4>
                <p>Find something you'll love. It's all genuine.</p>
                <button class="btn btn-primary" data-close data-goto="#shop">Start shopping</button>
            </div>`;
        $("#cartFoot").innerHTML = "";
        return;
    }

    $("#cartBody").innerHTML = cart
        .map((item, i) => `
        <div class="ci" style="animation-delay:${i * 40}ms">
            ${thumbHTML(item.main_image, item.name, "box", true)}
            <div>
                <div class="ci-brand">${esc(item.brand)}</div>
                <div class="ci-name">${esc(item.name)}</div>
                <div class="qty">
                    <button data-cart-qty="${item.id}" data-delta="-1" aria-label="Decrease">−</button>
                    <span>${item.quantity}</span>
                    <button data-cart-qty="${item.id}" data-delta="1" aria-label="Increase">+</button>
                </div>
            </div>
            <div class="ci-side">
                <strong>${money(item.price * item.quantity)}</strong>
                <button class="ci-remove" data-cart-remove="${item.id}"><i class="fas fa-trash-can"></i> Remove</button>
            </div>
        </div>`)
        .join("");

    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    $("#cartFoot").innerHTML = `
        <div class="cart-total"><span>Total</span><strong>${money(total)}</strong></div>
        <p class="cart-note">Delivery is free around Migori. We'll confirm stock and payment on WhatsApp.</p>
        <button class="btn btn-whatsapp btn-lg btn-block" id="checkoutBtn"><i class="fab fa-whatsapp"></i> Checkout on WhatsApp</button>`;
}

function updateQty(id, delta) {
    let cart = getCart();
    const item = cart.find((i) => String(i.id) === String(id));
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) cart = cart.filter((i) => i !== item);
    saveCart(cart);
}

function checkout() {
    const cart = getCart();
    if (!cart.length) return;
    let msg = "Hello Napeiz Electronics! I would like to order:\n\n";
    cart.forEach((item, i) => {
        msg += `${i + 1}. ${item.brand ? item.brand + " " : ""}${item.name} x${item.quantity} = ${money(item.price * item.quantity)}\n`;
    });
    msg += `\nTotal: ${money(cart.reduce((s, i) => s + i.price * i.quantity, 0))}`;
    msg += "\n\nPlease share payment details and delivery information. Thank you!";
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
}

function flyToCart(fromEl) {
    const cartBtn = $("#cartBtn");
    const bump = () => {
        cartBtn.classList.remove("bump");
        void cartBtn.offsetWidth;
        cartBtn.classList.add("bump");
    };
    if (!fromEl || reduceMotion || !fromEl.isConnected) return bump();
    const a = fromEl.getBoundingClientRect();
    const b = cartBtn.getBoundingClientRect();
    const dot = document.createElement("div");
    dot.className = "fly";
    dot.style.left = a.left + a.width / 2 - 9 + "px";
    dot.style.top = a.top + a.height / 2 - 9 + "px";
    document.body.appendChild(dot);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    dot.animate(
        [
            { transform: "translate(0,0) scale(1)", opacity: 1 },
            { transform: `translate(${dx * 0.5}px, ${dy - 120}px) scale(1.2)`, opacity: 1, offset: 0.5 },
            { transform: `translate(${dx}px, ${dy}px) scale(.4)`, opacity: 0.6 },
        ],
        { duration: 750, easing: "cubic-bezier(.5,0,.3,1)" }
    ).onfinish = () => {
        dot.remove();
        bump();
    };
}

// ===== OVERLAYS =====
let lastFocus = null;
function openOverlay(sel) {
    lastFocus = document.activeElement;
    const o = $(sel);
    o.classList.add("open");
    o.setAttribute("aria-hidden", "false");
    document.body.classList.add("locked");
    setTimeout(() => $("[data-close]", o)?.focus({ preventScroll: true }), 50);
}

function closeOverlay(sel) {
    const o = typeof sel === "string" ? $(sel) : sel;
    o.classList.remove("open");
    o.setAttribute("aria-hidden", "true");
    if (!$(".overlay.open")) document.body.classList.remove("locked");
    lastFocus?.focus?.({ preventScroll: true });
}

// ===== EVENTS =====
function initEvents() {
    document.addEventListener("click", (e) => {
        const t = e.target;

        const add = t.closest("[data-add]");
        if (add) {
            const p = state.catalog.find((x) => String(x.id) === add.dataset.add);
            addToCart(p, 1, add);
            add.classList.add("added");
            add.innerHTML = '<i class="fas fa-check"></i><span>Added</span>';
            setTimeout(() => {
                add.classList.remove("added");
                add.innerHTML = '<i class="fas fa-plus"></i><span>Add</span>';
            }, 1400);
            return;
        }

        const view = t.closest("[data-view]");
        if (view) return openProduct(Number(view.dataset.view));

        const chip = t.closest("[data-category]");
        if (chip) {
            state.filter.category = chip.dataset.category;
            chip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
            return applyFilters();
        }

        const cat = t.closest("[data-cat]");
        if (cat) {
            // Tiles for categories with no products yet fall back to showing everything
            const exists = state.catalog.some((p) => catOf(p)?.slug === cat.dataset.cat);
            Object.assign(state.filter, { category: exists ? cat.dataset.cat : "all", brand: "all", q: "" });
            $("#searchInput").value = "";
            return applyFilters({ scroll: true });
        }

        const brand = t.closest("[data-brand]");
        if (brand) {
            Object.assign(state.filter, { category: "all", brand: brand.dataset.brand, q: "" });
            $("#searchInput").value = "";
            return applyFilters({ scroll: true });
        }

        if (t.closest("[data-reset]")) {
            state.filter = { category: "all", brand: "all", sort: "newest", q: "" };
            $("#searchInput").value = "";
            return applyFilters();
        }

        const qtyBtn = t.closest("[data-cart-qty]");
        if (qtyBtn) return updateQty(qtyBtn.dataset.cartQty, Number(qtyBtn.dataset.delta));

        const rm = t.closest("[data-cart-remove]");
        if (rm) {
            saveCart(getCart().filter((i) => String(i.id) !== rm.dataset.cartRemove));
            return toast("Removed from bag");
        }

        if (t.closest("#checkoutBtn")) return checkout();

        const close = t.closest("[data-close]");
        if (close) {
            closeOverlay(close.closest(".overlay"));
            if (close.dataset.goto) $(close.dataset.goto).scrollIntoView({ behavior: "smooth" });
            return;
        }
        if (t.classList.contains("overlay")) return closeOverlay(t);

        const scrollBtn = t.closest("[data-scroll]");
        if (scrollBtn) {
            const c = $("#dealsCarousel");
            c.scrollBy({ left: Number(scrollBtn.dataset.scroll) * c.clientWidth * 0.8, behavior: "smooth" });
        }
    });

    $("#cartBtn").addEventListener("click", () => {
        renderCart();
        openOverlay("#cartDrawer");
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") $$(".overlay.open").forEach(closeOverlay);
    });

    $("#brandFilter").addEventListener("change", (e) => {
        state.filter.brand = e.target.value;
        applyFilters();
    });
    $("#sortFilter").addEventListener("change", (e) => {
        state.filter.sort = e.target.value;
        applyFilters();
    });

    $("#pagination").addEventListener("click", (e) => {
        const b = e.target.closest("[data-page]");
        if (!b || b.disabled || Number(b.dataset.page) === state.page) return;
        renderPage(Number(b.dataset.page));
        scrollToShop();
    });

    $("#newsletterForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = $("#newsletterEmail");
        const btn = e.target.querySelector("button");
        btn.disabled = true;
        try {
            await DB.subscribe(input.value.trim());
            toast("You're in! Watch your inbox for deals.");
            e.target.reset();
        } catch (err) {
            toast(err.message || "Subscription failed. Try again.", "error");
        } finally {
            btn.disabled = false;
        }
    });
}

// ===== SEARCH =====
function initSearch() {
    const input = $("#searchInput");
    const box = $("#searchResults");
    let focusIdx = -1;

    const matches = (q) => {
        const words = q.toLowerCase().split(/\s+/).filter(Boolean);
        return state.catalog.filter((p) => {
            const hay = `${p.name} ${brandOf(p)?.name || ""} ${catOf(p)?.name || ""}`.toLowerCase();
            return words.every((w) => hay.includes(w));
        });
    };

    const show = () => {
        const q = input.value.trim();
        focusIdx = -1;
        if (!q || !state.catalog.length) return box.classList.remove("open");
        const found = matches(q);
        box.innerHTML = found.length
            ? found.slice(0, 6).map((p) => `
                <button class="sr-item" data-view="${p.id}" role="option">
                    ${thumbHTML(p.main_image, p.name, iconFor(p), true)}
                    <span><span class="sr-name">${esc(p.name)}</span><span class="sr-price">${money(p.price)}</span></span>
                </button>`).join("") +
              `<button class="sr-all" data-search-all>See all ${found.length} results <i class="fas fa-arrow-right"></i></button>`
            : `<span class="sr-empty">No matches for “${esc(q)}”</span>`;
        box.classList.add("open");
    };

    const submit = () => {
        state.filter.q = input.value.trim();
        if (state.filter.q) Object.assign(state.filter, { category: "all", brand: "all" });
        box.classList.remove("open");
        input.blur();
        applyFilters({ scroll: true });
    };

    let t;
    input.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(show, 80);
        if (!input.value.trim() && state.filter.q) {
            state.filter.q = "";
            applyFilters();
        }
    });
    input.addEventListener("focus", show);
    input.addEventListener("keydown", (e) => {
        const items = $$(".sr-item", box);
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            focusIdx = Math.max(-1, Math.min(items.length - 1, focusIdx + (e.key === "ArrowDown" ? 1 : -1)));
            items.forEach((el, i) => el.classList.toggle("focused", i === focusIdx));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (focusIdx >= 0 && items[focusIdx]) items[focusIdx].click();
            else submit();
        } else if (e.key === "Escape") {
            box.classList.remove("open");
            input.blur();
        }
    });
    box.addEventListener("click", (e) => {
        if (e.target.closest("[data-search-all]")) submit();
        else if (e.target.closest(".sr-item")) box.classList.remove("open");
    });
    document.addEventListener("click", (e) => {
        if (!e.target.closest("#search")) box.classList.remove("open");
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) {
            e.preventDefault();
            input.focus();
        }
    });
}

// ===== THEME =====
function initTheme() {
    $("#themeToggle").addEventListener("click", () => {
        const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        try { localStorage.setItem("napeiz-theme", next); } catch {}
    });
}

// ===== HEADER, SCROLL & NAV =====
function initHeader() {
    const header = $("#header");
    const toTop = $("#toTop");
    const toolbar = $("#toolbar");
    const menuBtn = $("#menuBtn");
    const nav = $("#nav");
    const heroVideo = $("#heroVideo");
    const hero = $("#hero");
    let ticking = false;

    const onScroll = () => {
        const y = window.scrollY;
        header.classList.toggle("scrolled", y > 20);
        toTop.classList.toggle("show", y > 900);
        const tb = toolbar.getBoundingClientRect().top;
        toolbar.classList.toggle("stuck", tb <= parseFloat(getComputedStyle(toolbar).top) + 1 && tb > -200);
        if (!reduceMotion && y < hero.offsetHeight) heroVideo.style.transform = `translate3d(0, ${y * 0.3}px, 0) scale(1.08)`;
        ticking = false;
    };
    window.addEventListener("scroll", () => {
        if (!ticking) {
            requestAnimationFrame(onScroll);
            ticking = true;
        }
    }, { passive: true });
    onScroll();

    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));

    menuBtn.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        menuBtn.setAttribute("aria-expanded", open);
    });
    $$("a", nav).forEach((a) => a.addEventListener("click", () => {
        nav.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
    }));

    // Highlight the nav link for the section in view
    const links = new Map($$("a", nav).map((a) => [a.getAttribute("href").slice(1), a]));
    const navObs = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
            if (en.isIntersecting) links.forEach((a, id) => a.classList.toggle("active", id === en.target.id));
        });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach((_, id) => document.getElementById(id) && navObs.observe(document.getElementById(id)));
}

// ===== REVEAL ON SCROLL =====
function initReveal() {
    const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
            if (en.isIntersecting) {
                en.target.classList.add("in");
                io.unobserve(en.target);
            }
        });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    $$(".reveal").forEach((el) => io.observe(el));
}

// ===== VIDEO =====
function initHeroMedia() {
    const saveData = navigator.connection?.saveData;
    const hero = $("#heroVideo");

    if (reduceMotion || saveData) {
        hero.removeAttribute("autoplay");
        hero.querySelector("source")?.remove();
        hero.load();
    }

    // Only play videos while visible; lazy-load the promo video source
    const io = new IntersectionObserver((entries) => {
        entries.forEach(({ target: v, isIntersecting }) => {
            if (isIntersecting) {
                const src = v.querySelector("source[data-src]");
                if (src && !reduceMotion && !saveData) {
                    src.src = src.dataset.src;
                    src.removeAttribute("data-src");
                    v.load();
                }
                if (v.currentSrc) v.play().catch(() => {});
            } else {
                v.pause();
            }
        });
    }, { threshold: 0.15 });
    io.observe(hero);
    $$(".lazy-video").forEach((v) => io.observe(v));
}

// ===== COUNTDOWN (deals end at midnight) =====
function initCountdown() {
    const pad = (n) => String(n).padStart(2, "0");
    const tick = () => {
        const now = new Date();
        const end = new Date(now);
        end.setHours(24, 0, 0, 0);
        const s = Math.floor((end - now) / 1000);
        $("#cdH").textContent = pad(Math.floor(s / 3600));
        $("#cdM").textContent = pad(Math.floor((s % 3600) / 60));
        $("#cdS").textContent = pad(s % 60);
    };
    tick();
    setInterval(tick, 1000);
}

// ===== TOAST =====
function toast(message, type = "success") {
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fas fa-${type === "error" ? "circle-exclamation" : "circle-check"}"></i><span>${esc(message)}</span>`;
    $("#toasts").appendChild(el);
    setTimeout(() => {
        el.classList.add("out");
        el.addEventListener("animationend", () => el.remove(), { once: true });
    }, 2800);
    const all = $$("#toasts .toast");
    if (all.length > 3) all[0].remove();
}
