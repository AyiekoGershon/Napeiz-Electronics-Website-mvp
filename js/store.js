// ===== STORE UI LOGIC - Supabase Powered =====
document.addEventListener("DOMContentLoaded", async () => {
    // Initialize Supabase
    const connected = await DB.init();
    if (!connected) {
        showToast("Could not connect to database. Please try again.", "error");
        document.getElementById("productGrid").innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px;">
                <i class="fas fa-exclamation-triangle" style="font-size:48px;color:var(--danger);margin-bottom:15px;"></i>
                <h3 style="color:var(--text-light);">Unable to load products</h3>
                <p style="color:var(--text-light);">Please check your Supabase configuration in js/supabase-config.js</p>
            </div>`;
        return;
    }

    // Load initial data
    await Promise.all([
        loadCategories(),
        loadBrands(),
        loadProducts(),
        loadFeaturedProducts(),
        updateHeroStats()
    ]);

    initNavigation();
    initFilters();
    updateCartBadge();
    initCartModal();
    initModals();
    initNewsletter();
    initScrollEffects();
});

// ===== LOAD DATA =====
async function loadCategories() {
    try {
        const categories = await DB.getCategories();
        
        // Category filter buttons
        const container = document.getElementById("categoryFilters");
        if (container) {
            container.innerHTML = `<button class="filter-btn category-filter active" data-category="all">All</button>`;
            categories.forEach((cat) => {
                container.innerHTML += `<button class="filter-btn category-filter" data-category="${cat.slug}">${cat.name}</button>`;
            });
        }

        // Footer categories
        const footerCat = document.getElementById("footerCategories");
        if (footerCat) {
            footerCat.innerHTML = categories
                .map((c) => `<li><a href="#productsSection"><i class="fas fa-chevron-right"></i> ${c.name}</a></li>`)
                .join("");
        }
    } catch (err) {
        console.error("Failed to load categories:", err);
    }
}

async function loadBrands() {
    try {
        const brands = await DB.getBrands();
        
        // Brand filter dropdown
        const brandSelect = document.getElementById("brandFilter");
        if (brandSelect) {
            brandSelect.innerHTML = `<option value="all">All Brands</option>`;
            brands.forEach((b) => {
                brandSelect.innerHTML += `<option value="${b.id}">${b.name}</option>`;
            });
        }

        // Brands grid
        const grid = document.getElementById("brandsGrid");
        if (grid) {
            const brandIcons = {
                Samsung: "mobile-alt",
                Apple: "apple-alt",
                Sony: "playstation",
                LG: "tv",
                JBL: "music",
                Nintendo: "gamepad",
                Dyson: "wind",
                Bose: "headphones",
                HP: "laptop",
            };
            grid.innerHTML = brands
                .map(
                    (b) => `
                    <div class="brand-item" onclick="filterByBrand(${b.id})">
                        <i class="fas fa-${brandIcons[b.name] || "microchip"}"></i>
                        <span>${b.name}</span>
                    </div>`
                )
                .join("");
        }
    } catch (err) {
        console.error("Failed to load brands:", err);
    }
}

async function loadProducts(filters = {}) {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    // Show loading
    grid.innerHTML = `
        <div class="loading" style="display:block;grid-column:1/-1;">
            <div class="loading-spinner"></div>
            <p>Loading products...</p>
        </div>`;

    try {
        // Get active filter values
        const activeCat = document.querySelector(".category-filter.active");
        if (activeCat && activeCat.dataset.category !== "all") {
            filters.category_slug = activeCat.dataset.category;
        }

        const brandFilter = document.getElementById("brandFilter");
        if (brandFilter && brandFilter.value !== "all") {
            filters.brand_id = parseInt(brandFilter.value);
        }

        const sortFilter = document.getElementById("sortFilter");
        if (sortFilter) {
            filters.sort = sortFilter.value;
        }

        const searchInput = document.getElementById("searchInput");
        if (searchInput && searchInput.value.trim()) {
            filters.search = searchInput.value.trim();
        }

        const { products, count } = await DB.getProducts(filters);

        if (!products || products.length === 0) {
            grid.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:60px 20px;">
                    <i class="fas fa-search" style="font-size:48px;color:#ddd;margin-bottom:20px;"></i>
                    <h3 style="color:var(--text-light);margin-bottom:10px;">No Products Found</h3>
                    <p style="color:var(--text-light);">Try adjusting your search or filter criteria.</p>
                    <button class="btn btn-outline" style="margin-top:15px;" onclick="resetFilters()">Clear Filters</button>
                </div>`;
            return;
        }

        grid.innerHTML = products
            .map((product) => {
                const hasDiscount = product.old_price && product.old_price > product.price;
                const discountPercent = hasDiscount ? Math.round((1 - product.price / product.old_price) * 100) : 0;
                const categoryName = product.categories?.name || "Category";
                const brandName = product.brands?.name || "Brand";

                return `
                <div class="product-card" data-id="${product.id}">
                    ${discountPercent > 0 ? `<div class="product-badge">-${discountPercent}%</div>` : ""}
                    ${product.is_featured ? '<div class="product-badge featured">Featured</div>' : ""}
                    ${product.is_new ? '<div class="product-badge" style="background:var(--success);">New</div>' : ""}
                    ${!product.in_stock ? '<div class="product-badge out-of-stock">Out of Stock</div>' : ""}
                    
                    <div class="product-image" onclick="showProductModal(${product.id})">
                        ${product.main_image 
                            ? `<img src="${product.main_image}" alt="${product.name}" loading="lazy">`
                            : `<div class="product-image-placeholder">
                                <i class="fas fa-${getProductIcon(categoryName)}"></i>
                                <span>${product.name}</span>
                              </div>`
                        }
                    </div>
                    
                    <div class="product-info">
                        <div class="product-brand">${brandName}</div>
                        <div class="product-category">${categoryName}</div>
                        <h3 class="product-name">${product.name}</h3>
                        
                        <div class="product-rating">
                            <div class="stars">${renderStars(product.rating || 0)}</div>
                            <span class="rating-count">(${product.review_count || 0})</span>
                        </div>
                        
                        <div class="product-price">
                            <span class="current-price">${DB.formatPrice(product.price).replace("KSh ", "")}</span>
                            ${hasDiscount ? `<span class="old-price">${DB.formatPrice(product.old_price).replace("KSh ", "")}</span>` : ""}
                        </div>
                        
                        <div class="product-actions">
                            <button class="btn-add-cart" onclick="buyViaWhatsApp(${product.id})" ${!product.in_stock ? "disabled" : ""}>
                                <i class="fab fa-whatsapp"></i> Buy via WhatsApp
                            </button>
                            <button class="btn-view" onclick="showProductModal(${product.id})" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                </div>`;
            })
            .join("");
    } catch (err) {
        console.error("Failed to load products:", err);
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px;">
                <i class="fas fa-exclamation-circle" style="font-size:48px;color:var(--danger);margin-bottom:15px;"></i>
                <h3 style="color:var(--text-light);">Error loading products</h3>
                <p style="color:var(--text-light);">${err.message}</p>
            </div>`;
    }
}

async function loadFeaturedProducts() {
    const grid = document.getElementById("featuredGrid");
    if (!grid) return;

    try {
        const { products } = await DB.getProducts({ featured: true, limit: 4 });

        if (!products || products.length === 0) {
            grid.innerHTML =
                '<p style="grid-column:1/-1;text-align:center;color:var(--text-light);padding:40px;">No featured products yet.</p>';
            return;
        }

        grid.innerHTML = products
            .map((product) => {
                const brandName = product.brands?.name || "";
                return `
                <div class="product-card" data-id="${product.id}">
                    <div class="product-badge featured">Featured</div>
                    <div class="product-image" onclick="showProductModal(${product.id})">
                        ${product.main_image 
                            ? `<img src="${product.main_image}" alt="${product.name}" loading="lazy">`
                            : `<div class="product-image-placeholder">
                                <i class="fas fa-${getProductIcon(product.categories?.name || "")}"></i>
                                <span>${product.name}</span>
                              </div>`
                        }
                    </div>
                    <div class="product-info">
                        <div class="product-brand">${brandName}</div>
                        <h3 class="product-name">${product.name}</h3>
                        <div class="product-rating">
                            <div class="stars">${renderStars(product.rating || 0)}</div>
                        </div>
                        <div class="product-price">
                            <span class="current-price">${DB.formatPrice(product.price).replace("KSh ", "")}</span>
                        </div>
                        <div class="product-actions">
                            <button class="btn-add-cart" onclick="buyViaWhatsApp(${product.id})">
                                <i class="fab fa-whatsapp"></i> Buy Now
                            </button>
                            <button class="btn-view" onclick="showProductModal(${product.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                </div>`;
            })
            .join("");
    } catch (err) {
        console.error("Failed to load featured:", err);
    }
}

async function updateHeroStats() {
    try {
        // Get total products count directly
        const { count: totalProducts, error: prodErr } = await DB.client
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);
        
        const brands = await DB.getBrands();
        
        document.getElementById("statProducts").textContent = totalProducts || "0";
        document.getElementById("statBrands").textContent = brands.length || "0";
    } catch (err) {
        console.error("Failed to load hero stats:", err);
    }
}

// ===== NAVIGATION =====
function initNavigation() {
    const hamburger = document.querySelector(".hamburger");
    const navMenu = document.querySelector(".nav-menu");

    if (hamburger) {
        hamburger.addEventListener("click", () => {
            navMenu.classList.toggle("active");
        });
    }

    document.querySelectorAll(".nav-menu a").forEach((link) => {
        link.addEventListener("click", () => {
            navMenu.classList.remove("active");
        });
    });
}

// ===== FILTERS =====
function initFilters() {
    // Category filters
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".category-filter");
        if (btn) {
            document.querySelectorAll(".category-filter").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            loadProducts();
        }
    });

    // Brand filter
    const brandSelect = document.getElementById("brandFilter");
    if (brandSelect) {
        brandSelect.addEventListener("change", () => loadProducts());
    }

    // Sort filter
    const sortSelect = document.getElementById("sortFilter");
    if (sortSelect) {
        sortSelect.addEventListener("change", () => loadProducts());
    }

    // Search input
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener("input", () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => loadProducts(), 400);
        });
    }
}

function resetFilters() {
    document.querySelectorAll(".category-filter").forEach((b) => b.classList.remove("active"));
    document.querySelector('[data-category="all"]')?.classList.add("active");
    document.getElementById("brandFilter").value = "all";
    document.getElementById("sortFilter").value = "newest";
    document.getElementById("searchInput").value = "";
    loadProducts();
}

function filterByBrand(brandId) {
    document.getElementById("productsSection").scrollIntoView({ behavior: "smooth" });
    document.getElementById("brandFilter").value = brandId;
    loadProducts();
}

// ===== WHATSAPP INTEGRATION =====
async function buyViaWhatsApp(productId) {
    try {
        const product = await DB.getProductById(productId);
        if (!product) return;

        const phone = "254708521714";
        const message = DB.generateWhatsAppMessage(product);
        window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    } catch (err) {
        showToast("Could not load product details", "error");
    }
}

function buyCartViaWhatsApp() {
    const cart = getCartItems();
    if (cart.length === 0) {
        showToast("Your cart is empty!", "error");
        return;
    }

    const phone = "254708521714";
    let message = "Hello Napeiz Electronics! I would like to order:\n\n";
    let total = 0;
    
    cart.forEach((item, i) => {
        message += `${i + 1}. ${item.brand} ${item.name} x${item.quantity} = ${DB.formatPrice(item.price * item.quantity)}\n`;
        total += item.price * item.quantity;
    });
    
    message += `\nTotal: ${DB.formatPrice(total)}`;
    message += `\n\nPlease share payment details and delivery information. Thank you!`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
}

// ===== PRODUCT MODAL =====
async function showProductModal(productId) {
    try {
        const product = await DB.getProductById(productId);
        if (!product) return;

        const modal = document.getElementById("productModal");
        const body = modal.querySelector(".modal-body");

        const hasDiscount = product.old_price && product.old_price > product.price;
        const discountPercent = hasDiscount ? Math.round((1 - product.price / product.old_price) * 100) : 0;
        const brandName = product.brands?.name || "";
        const categoryName = product.categories?.name || "";

        // Build specifications HTML
        let specsHtml = "";
        if (product.specifications && typeof product.specifications === "object") {
            specsHtml = Object.entries(product.specifications)
                .map(
                    ([key, value]) =>
                        `<tr><td style="padding:8px 10px;color:var(--text-light);font-size:13px;border-bottom:1px solid var(--gray);">${key}</td><td style="padding:8px 10px;font-size:13px;border-bottom:1px solid var(--gray);font-weight:600;">${value}</td></tr>`
                )
                .join("");
        }

        // Build features HTML
        const featuresHtml = product.features
            ? product.features.map((f) => `<li>${f}</li>`).join("")
            : "";

        body.innerHTML = `
            <div class="modal-product-detail">
                <div class="modal-product-image">
                    ${product.main_image 
                        ? `<img src="${product.main_image}" alt="${product.name}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius);">`
                        : `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--gray);border-radius:var(--radius);">
                            <i class="fas fa-${getProductIcon(categoryName)}" style="font-size:64px;color:var(--text-light);"></i>
                            <span style="margin-top:10px;color:var(--text-light);">${product.name}</span>
                          </div>`
                    }
                </div>
                <div class="modal-product-info">
                    <div class="product-brand" style="font-size:14px;">${brandName}</div>
                    <h3>${product.name}</h3>
                    <div class="product-category" style="margin-bottom:5px;">${categoryName}</div>
                    
                    ${product.sku ? `<div style="font-size:12px;color:var(--text-light);margin-bottom:5px;">SKU: ${product.sku}</div>` : ""}
                    
                    <div class="product-rating" style="margin-bottom:15px;">
                        <div class="stars">${renderStars(product.rating || 0)}</div>
                        <span class="rating-count">(${product.review_count || 0} reviews)</span>
                    </div>
                    
                    <div class="price">${DB.formatPrice(product.price)}</div>
                    ${hasDiscount ? `
                        <div style="margin-bottom:15px;">
                            <span style="text-decoration:line-through;color:var(--text-light);font-size:18px;">${DB.formatPrice(product.old_price)}</span>
                            <span style="color:var(--secondary);font-weight:700;margin-left:10px;">-${discountPercent}% OFF</span>
                        </div>` : ""
                    }
                    
                    ${product.short_description ? `<p class="description">${product.short_description}</p>` : ""}
                    ${product.full_description ? `<p class="description">${product.full_description}</p>` : ""}
                    
                    ${featuresHtml ? `
                        <div class="features-list">
                            <strong style="display:block;margin-bottom:10px;">Key Features:</strong>
                            <ul>${featuresHtml}</ul>
                        </div>` : ""
                    }
                    
                    ${specsHtml ? `
                        <div style="margin:15px 0;">
                            <strong style="display:block;margin-bottom:10px;">Specifications:</strong>
                            <table style="width:100%;border-collapse:collapse;">
                                ${specsHtml}
                            </table>
                        </div>` : ""
                    }

                    ${product.warranty ? `
                        <div style="margin:10px 0;padding:10px;background:var(--primary-light);border-radius:var(--radius-sm);">
                            <i class="fas fa-shield-alt" style="color:var(--primary);"></i>
                            <strong style="margin-left:5px;">Warranty:</strong> ${product.warranty}
                        </div>` : ""
                    }
                    
                    ${product.delivery_info ? `
                        <div style="margin:10px 0;padding:10px;background:#f0fdf4;border-radius:var(--radius-sm);">
                            <i class="fas fa-truck" style="color:var(--success);"></i>
                            <strong style="margin-left:5px;">Delivery:</strong> ${product.delivery_info}
                        </div>` : ""
                    }

                    ${product.return_policy ? `
                        <div style="margin:10px 0;padding:10px;background:#fff7ed;border-radius:var(--radius-sm);">
                            <i class="fas fa-undo-alt" style="color:var(--warning);"></i>
                            <strong style="margin-left:5px;">Returns:</strong> ${product.return_policy}
                        </div>` : ""
                    }
                    
                    <div class="modal-actions" style="margin-top:20px;">
                        <button class="btn btn-whatsapp" onclick="closeModal('productModal'); buyViaWhatsApp(${product.id});">
                            <i class="fab fa-whatsapp"></i> Buy via WhatsApp
                        </button>
                        <button class="btn btn-outline" onclick="closeModal('productModal')">
                            Continue Shopping
                        </button>
                    </div>
                </div>
            </div>`;

        modal.classList.add("show");
        document.body.style.overflow = "hidden";
    } catch (err) {
        console.error("Failed to load product:", err);
        showToast("Failed to load product details", "error");
    }
}

// ===== CART MODAL =====
function initCartModal() {
    const cartBtn = document.getElementById("cartBtn");
    if (cartBtn) {
        cartBtn.addEventListener("click", showCartModal);
    }
}

function getCartItems() {
    try {
        return JSON.parse(localStorage.getItem("napeizCart")) || [];
    } catch {
        return [];
    }
}

function saveCartItems(items) {
    localStorage.setItem("napeizCart", JSON.stringify(items));
}

function showCartModal() {
    const cart = getCartItems();
    const modal = document.getElementById("cartModal");
    const body = modal.querySelector(".modal-body");

    if (cart.length === 0) {
        body.innerHTML = `
            <div style="text-align:center;padding:40px 20px;">
                <i class="fas fa-shopping-cart" style="font-size:64px;color:#ddd;margin-bottom:20px;"></i>
                <h3 style="color:var(--text-light);margin-bottom:10px;">Your Cart is Empty</h3>
                <p style="color:var(--text-light);margin-bottom:20px;">Browse our products and add items you like!</p>
                <button class="btn btn-primary" onclick="closeModal('cartModal')">Start Shopping</button>
            </div>`;
    } else {
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        
        body.innerHTML = `
            <div style="margin-bottom:20px;max-height:400px;overflow-y:auto;">
                ${cart
                    .map((item, index) => `
                    <div style="display:flex;align-items:center;gap:15px;padding:15px;border-bottom:1px solid var(--gray);">
                        <div style="width:60px;height:60px;background:var(--gray);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas fa-${getProductIconFromName(item.name)}" style="font-size:24px;color:var(--text-light);"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.brand} ${item.name}</div>
                            <div style="color:var(--text-light);font-size:13px;">${DB.formatPrice(item.price)} each</div>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <button class="btn-view" onclick="updateCartQty(${item.id}, ${item.quantity - 1})" style="padding:3px 8px;font-size:16px;">−</button>
                            <span style="font-weight:700;min-width:20px;text-align:center;">${item.quantity}</span>
                            <button class="btn-view" onclick="updateCartQty(${item.id}, ${item.quantity + 1})" style="padding:3px 8px;font-size:16px;">+</button>
                        </div>
                        <div style="font-weight:700;min-width:80px;text-align:right;font-size:14px;">${DB.formatPrice(item.price * item.quantity)}</div>
                        <button class="btn-view" onclick="removeFromCart(${item.id})" style="color:var(--danger);padding:5px 8px;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>`)
                    .join("")}
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:15px 0;border-top:2px solid var(--gray);flex-wrap:wrap;gap:10px;">
                <div>
                    <strong style="font-size:20px;">Total: ${DB.formatPrice(total)}</strong>
                    <div style="font-size:12px;color:var(--text-light);">${cart.length} item(s)</div>
                </div>
                <button class="btn btn-whatsapp" onclick="closeModal('cartModal'); buyCartViaWhatsApp();">
                    <i class="fab fa-whatsapp"></i> Order via WhatsApp
                </button>
            </div>`;
    }

    modal.classList.add("show");
    document.body.style.overflow = "hidden";
}

function addToCart(product, quantity = 1) {
    const cart = getCartItems();
    const existing = cart.find((item) => item.id === product.id);
    
    if (existing) {
        existing.quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            brand: product.brands?.name || "",
            price: product.price,
            main_image: product.main_image,
            quantity: quantity,
        });
    }
    
    saveCartItems(cart);
    updateCartBadge();
}

function updateCartQty(id, qty) {
    let cart = getCartItems();
    const item = cart.find((i) => i.id === id);
    
    if (item) {
        if (qty <= 0) {
            cart = cart.filter((i) => i.id !== id);
        } else {
            item.quantity = qty;
        }
    }
    
    saveCartItems(cart);
    updateCartBadge();
    showCartModal();
}

function removeFromCart(id) {
    let cart = getCartItems();
    cart = cart.filter((i) => i.id !== id);
    saveCartItems(cart);
    updateCartBadge();
    showCartModal();
    showToast("Item removed from cart", "success");
}

// ===== MODALS =====
function initModals() {
    document.querySelectorAll(".modal").forEach((modal) => {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

function closeModal(id) {
    document.getElementById(id).classList.remove("show");
    document.body.style.overflow = "";
}

// ===== CART BADGE =====
function updateCartBadge() {
    const badge = document.getElementById("cartCount");
    if (badge) {
        const cart = getCartItems();
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = count;
        badge.style.display = count > 0 ? "flex" : "none";
    }
}

// ===== UTILITY FUNCTIONS =====
function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
}

function getProductIcon(category) {
    const icons = {
        "TVs & Home Theatre": "tv",
        "Phones & Tablets": "mobile-alt",
        "Laptops & Computers": "laptop",
        "Audio & Headphones": "headphones",
        Gaming: "gamepad",
        Wearables: "watch",
        "Home Appliances": "tint",
    };
    return icons[category] || "microchip";
}

function getProductIconFromName(name) {
    const n = name.toLowerCase();
    if (n.includes("tv") || n.includes("television")) return "tv";
    if (n.includes("phone") || n.includes("iphone")) return "mobile-alt";
    if (n.includes("laptop") || n.includes("macbook") || n.includes("computer")) return "laptop";
    if (n.includes("headphone") || n.includes("speaker") || n.includes("audio")) return "headphones";
    if (n.includes("game") || n.includes("playstation") || n.includes("nintendo")) return "gamepad";
    if (n.includes("watch")) return "watch";
    if (n.includes("vacuum") || n.includes("dyson")) return "tint";
    if (n.includes("printer")) return "print";
    if (n.includes("monitor")) return "tv";
    return "microchip";
}

// ===== NEWSLETTER =====
function initNewsletter() {
    const form = document.getElementById("newsletterForm");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("newsletterEmail").value;
            
            try {
                await DB.subscribe(email);
                showToast("Thank you for subscribing! We'll keep you updated.", "success");
                form.reset();
            } catch (err) {
                showToast(err.message || "Subscription failed. Try again.", "error");
            }
        });
    }
}

// ===== SCROLL EFFECTS =====
function initScrollEffects() {
    const header = document.querySelector(".header");
    window.addEventListener("scroll", () => {
        if (window.pageYOffset > 50) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    });
}

// ===== TOAST =====
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.className = "toast " + type;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3500);
}
