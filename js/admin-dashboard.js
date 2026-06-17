// ===== ADMIN DASHBOARD - Full Jumia-like Management =====
document.addEventListener("DOMContentLoaded", async () => {
    // Check authentication
    if (!DB.isLoggedIn()) {
        window.location.href = "admin.html";
        return;
    }

    // Initialize
    const connected = await DB.init();
    if (!connected) {
        showToast("Database connection failed!", "error");
        return;
    }

    // Show admin info
    const admin = DB.getCurrentAdmin();
    document.getElementById("adminInfo").innerHTML = `
        <div style="font-weight:600;color:rgba(255,255,255,0.8);">${admin.fullName}</div>
        <div style="color:rgba(255,255,255,0.4);">${admin.role}</div>
    `;

    initAdminNavigation();
    await Promise.all([
        loadDashboard(),
        loadAdminProducts(),
        loadCategoryOptions(),
        loadBrandOptions(),
        loadCategoryList(),
        loadBrandList()
    ]);

    initProductForm();
    initCategoryForm();
    initBrandForm();
    initDiscountCalculator();
    initAdminSearch();
    updateLastUpdate();
});

// ===== NAVIGATION =====
function initAdminNavigation() {
    document.querySelectorAll(".admin-nav a[data-page]").forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            document.querySelectorAll(".admin-nav a").forEach((l) => l.classList.remove("active"));
            link.classList.add("active");
            showAdminPage(link.dataset.page);
        });
    });
}

function showAdminPage(page) {
    document.querySelectorAll(".admin-page").forEach((p) => (p.style.display = "none"));
    const target = document.getElementById(page + "Page");
    if (target) target.style.display = "block";

    // Refresh data when switching to certain pages
    if (page === "products") loadAdminProducts();
    if (page === "categories") loadCategoryList();
    if (page === "brands") loadBrandList();
}

function updateLastUpdate() {
    document.getElementById("lastUpdate").textContent =
        "Last updated: " + new Date().toLocaleString();
}

// ===== DASHBOARD =====
async function loadDashboard() {
    try {
        const [productsList, categories, brands] = await Promise.all([
            DB.getAllProductsAdmin(),
            DB.getCategories(),
            DB.getBrands()
        ]);

        const activeProducts = productsList.filter((p) => p.is_active);
        const featuredProducts = activeProducts.filter((p) => p.is_featured);
        const outOfStock = activeProducts.filter((p) => !p.in_stock);
        const lowStock = activeProducts.filter((p) => p.in_stock && p.stock_quantity <= (p.low_stock_threshold || 5));
        const totalValue = activeProducts.reduce((sum, p) => sum + p.price * (p.stock_quantity || 0), 0);

        document.getElementById("statTotalProducts").textContent = activeProducts.length;
        document.getElementById("statInventoryValue").textContent = DB.formatPrice(totalValue);
        document.getElementById("statCategories").textContent = categories.length;
        document.getElementById("statBrands").textContent = brands.length;
        document.getElementById("statLowStock").textContent = lowStock.length;
        document.getElementById("statFeatured").textContent = featuredProducts.length;
        document.getElementById("statOutOfStock").textContent = outOfStock.length;
    } catch (err) {
        console.error("Dashboard load error:", err);
    }
}

// ===== PRODUCTS LIST =====
async function loadAdminProducts(search = "") {
    const tbody = document.getElementById("adminProductList");
    if (!tbody) return;

    try {
        let products = await DB.getAllProductsAdmin();
        
        if (search) {
            const term = search.toLowerCase();
            products = products.filter(
                (p) =>
                    p.name.toLowerCase().includes(term) ||
                    (p.brands?.name || "").toLowerCase().includes(term) ||
                    (p.categories?.name || "").toLowerCase().includes(term) ||
                    (p.sku || "").toLowerCase().includes(term)
            );
        }

        if (products.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-light);">
                <i class="fas fa-box-open" style="font-size:32px;display:block;margin-bottom:10px;color:#ddd;"></i>
                No products found. <a href="#" onclick="showAdminPage('addProduct')" style="color:var(--primary);font-weight:600;">Add your first product</a>
            </td></tr>`;
            return;
        }

        tbody.innerHTML = products
            .map((p, i) => {
                const brandName = p.brands?.name || "—";
                const categoryName = p.categories?.name || "—";
                const statusBadge = !p.is_active
                    ? '<span style="background:var(--gray-dark);color:var(--text-light);padding:3px 10px;border-radius:50px;font-size:11px;">Archived</span>'
                    : !p.in_stock
                    ? '<span style="background:#fde8e8;color:var(--danger);padding:3px 10px;border-radius:50px;font-size:11px;">Out of Stock</span>'
                    : p.stock_quantity <= (p.low_stock_threshold || 5)
                    ? '<span style="background:#fef3c7;color:var(--warning);padding:3px 10px;border-radius:50px;font-size:11px;">Low Stock</span>'
                    : '<span style="background:#d1fae5;color:var(--success);padding:3px 10px;border-radius:50px;font-size:11px;">In Stock</span>';

                return `<tr>
                    <td>${i + 1}</td>
                    <td>
                        <strong>${p.name}</strong>
                        <div style="display:flex;gap:5px;margin-top:3px;">
                            <small style="color:var(--text-light);">${brandName}</small>
                            ${p.sku ? `<small style="color:var(--text-light);">| SKU: ${p.sku}</small>` : ""}
                            ${p.is_featured ? '<small style="color:var(--warning);">⭐</small>' : ""}
                            ${p.is_new ? '<small style="color:var(--success);">🆕</small>' : ""}
                            ${p.is_best_seller ? '<small style="color:var(--primary);">🏆</small>' : ""}
                        </div>
                    </td>
                    <td><small>${categoryName}</small></td>
                    <td><strong>${DB.formatPrice(p.price)}</strong></td>
                    <td>${p.stock_quantity || 0}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div style="display:flex;gap:3px;">
                            <button class="btn-view" onclick="editProduct(${p.id})" title="Edit Product" style="padding:6px 10px;">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-view" onclick="duplicateProduct(${p.id})" title="Duplicate" style="padding:6px 10px;color:var(--primary);">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="btn-view" onclick="toggleProductActive(${p.id}, ${!p.is_active})" title="${p.is_active ? 'Archive' : 'Restore'}" style="padding:6px 10px;color:${p.is_active ? 'var(--warning)' : 'var(--success)'};">
                                <i class="fas ${p.is_active ? 'fa-archive' : 'fa-undo'}"></i>
                            </button>
                            <button class="btn-view" onclick="confirmDeleteProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')" title="Delete Permanently" style="padding:6px 10px;color:var(--danger);">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
            })
            .join("");
    } catch (err) {
        console.error("Failed to load admin products:", err);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--danger);">Error: ${err.message}</td></tr>`;
    }
}

function initAdminSearch() {
    const searchInput = document.getElementById("adminSearch");
    if (searchInput) {
        let timer;
        searchInput.addEventListener("input", () => {
            clearTimeout(timer);
            timer = setTimeout(() => loadAdminProducts(searchInput.value), 300);
        });
    }
}

// ===== PRODUCT FORM =====
async function loadCategoryOptions() {
    const select = document.getElementById("pCategory");
    try {
        const categories = await DB.getCategories();
        select.innerHTML = '<option value="">Select Category</option>';
        categories.forEach((c) => {
            select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    } catch (err) {
        console.error("Failed to load categories:", err);
    }
}

async function loadBrandOptions() {
    const select = document.getElementById("pBrand");
    try {
        const brands = await DB.getBrands();
        select.innerHTML = '<option value="">Select Brand</option>';
        brands.forEach((b) => {
            select.innerHTML += `<option value="${b.id}">${b.name}</option>`;
        });
    } catch (err) {
        console.error("Failed to load brands:", err);
    }
}

function initDiscountCalculator() {
    document.getElementById("pPrice").addEventListener("input", updateDiscount);
    document.getElementById("pOldPrice").addEventListener("input", updateDiscount);
}

function updateDiscount() {
    const price = parseFloat(document.getElementById("pPrice").value) || 0;
    const oldPrice = parseFloat(document.getElementById("pOldPrice").value) || 0;
    const discount = oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;
    document.getElementById("discountDisplay").textContent = discount > 0 ? discount + "% OFF" : "No Discount";
    document.getElementById("discountDisplay").style.color = discount > 0 ? "var(--secondary)" : "var(--text-light)";
}

function addSpec() {
    const container = document.getElementById("specsContainer");
    const row = document.createElement("div");
    row.className = "form-row spec-row";
    row.style.marginBottom = "10px";
    row.innerHTML = `
        <div class="form-group" style="flex:1;">
            <input type="text" class="spec-key" placeholder="Spec name">
        </div>
        <div class="form-group" style="flex:1;">
            <input type="text" class="spec-value" placeholder="Spec value">
        </div>
        <div style="display:flex;align-items:flex-end;padding-bottom:20px;">
            <button type="button" class="btn-view" onclick="removeSpec(this)" style="color:var(--danger);padding:10px 12px;">
                <i class="fas fa-times"></i>
            </button>
        </div>`;
    container.appendChild(row);
}

function removeSpec(btn) {
    const row = btn.closest(".spec-row");
    if (document.querySelectorAll(".spec-row").length > 1) {
        row.remove();
    } else {
        row.querySelector(".spec-key").value = "";
        row.querySelector(".spec-value").value = "";
    }
}

function getSpecs() {
    const specs = {};
    document.querySelectorAll(".spec-row").forEach((row) => {
        const key = row.querySelector(".spec-key").value.trim();
        const value = row.querySelector(".spec-value").value.trim();
        if (key && value) specs[key] = value;
    });
    return Object.keys(specs).length > 0 ? specs : null;
}

function setSpecs(specs) {
    const container = document.getElementById("specsContainer");
    container.innerHTML = "";
    if (specs && typeof specs === "object") {
        Object.entries(specs).forEach(([key, value]) => {
            const row = document.createElement("div");
            row.className = "form-row spec-row";
            row.style.marginBottom = "10px";
            row.innerHTML = `
                <div class="form-group" style="flex:1;">
                    <input type="text" class="spec-key" value="${key.replace(/"/g, "&quot;")}" placeholder="Spec name">
                </div>
                <div class="form-group" style="flex:1;">
                    <input type="text" class="spec-value" value="${value.replace(/"/g, "&quot;")}" placeholder="Spec value">
                </div>
                <div style="display:flex;align-items:flex-end;padding-bottom:20px;">
                    <button type="button" class="btn-view" onclick="removeSpec(this)" style="color:var(--danger);padding:10px 12px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>`;
            container.appendChild(row);
        });
    }
    // Ensure at least one row
    if (container.children.length === 0) {
        addSpec();
    }
}

function initProductForm() {
    const form = document.getElementById("productForm");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await saveProduct();
    });

    // Auto-generate slug from name
    document.getElementById("pName").addEventListener("input", () => {
        const slugInput = document.getElementById("pSlug");
        if (!slugInput.value || slugInput.dataset.auto === "true") {
            slugInput.value = DB.generateSlug(document.getElementById("pName").value);
            slugInput.dataset.auto = "true";
        }
    });

    document.getElementById("pSlug").addEventListener("input", () => {
        document.getElementById("pSlug").dataset.auto = "false";
    });
}

async function saveProduct() {
    const submitBtn = document.getElementById("submitBtn");
    const editId = submitBtn.dataset.editId;

    // Loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span id="submitBtnText">' + (editId ? "Updating..." : "Saving...") + '</span>';

    try {
        // 1. Upload Images
        let mainImageUrl = document.getElementById("pMainImageExisting").value || null;
        const mainImageFile = document.getElementById("pMainImage").files[0];
        if (mainImageFile) {
            mainImageUrl = await DB.uploadImage(mainImageFile);
        }

        let galleryUrls = [];
        const existingGalleryStr = document.getElementById("pGalleryExisting").value;
        if (existingGalleryStr) {
            try { galleryUrls = JSON.parse(existingGalleryStr); } catch(e){}
        }
        
        const galleryFiles = document.getElementById("pGallery").files;
        for (let i = 0; i < galleryFiles.length; i++) {
            const url = await DB.uploadImage(galleryFiles[i]);
            if (url) galleryUrls.push(url);
        }

        // 2. Gather remaining form data
        const features = document.getElementById("pFeatures").value
            .split("\n")
            .map((f) => f.trim())
            .filter(Boolean);

        const price = parseFloat(document.getElementById("pPrice").value) || 0;
        const oldPrice = parseFloat(document.getElementById("pOldPrice").value) || null;
        const costPrice = parseFloat(document.getElementById("pCostPrice").value) || null;

        const productData = {
            name: document.getElementById("pName").value.trim(),
            slug: document.getElementById("pSlug").value.trim() || DB.generateSlug(document.getElementById("pName").value),
            sku: document.getElementById("pSKU").value.trim() || null,
            barcode: document.getElementById("pBarcode").value.trim() || null,
            category_id: parseInt(document.getElementById("pCategory").value) || null,
            brand_id: parseInt(document.getElementById("pBrand").value) || null,
            price: price,
            old_price: oldPrice && oldPrice > price ? oldPrice : null,
            cost_price: costPrice,
            discount_percent: oldPrice && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0,
            short_description: document.getElementById("pShortDesc").value.trim(),
            full_description: document.getElementById("pFullDesc").value.trim(),
            features: features.length > 0 ? features : null,
            specifications: getSpecs(),
            main_image: mainImageUrl,
            gallery_images: galleryUrls.length > 0 ? galleryUrls : null,
            video_url: document.getElementById("pVideo").value.trim() || null,
            stock_quantity: parseInt(document.getElementById("pStockQty").value) || 0,
            low_stock_threshold: parseInt(document.getElementById("pLowStock").value) || 5,
            in_stock: document.getElementById("pInStock").value === "true",
            is_featured: document.getElementById("pFeatured").checked,
            is_new: document.getElementById("pNew").checked,
            is_best_seller: document.getElementById("pBestSeller").checked,
            is_active: true,
            weight_kg: parseFloat(document.getElementById("pWeight").value) || null,
            dimensions: document.getElementById("pDimensions").value.trim() || null,
            warranty: document.getElementById("pWarranty").value.trim() || null,
            delivery_info: document.getElementById("pDeliveryInfo").value.trim() || null,
            return_policy: document.getElementById("pReturnPolicy").value.trim() || null,
            meta_title: document.getElementById("pMetaTitle").value.trim() || null,
            meta_description: document.getElementById("pMetaDesc").value.trim() || null,
            meta_keywords: document.getElementById("pMetaKeywords").value.trim() || null,
        };

        if (editId) {
            // Update existing
            await DB.updateProduct(parseInt(editId), productData);
            await DB.logAudit("update", "product", parseInt(editId), { before: {}, after: productData });
            showToast("Product updated successfully!", "success");
        } else {
            // Create new
            const saved = await DB.createProduct(productData);
            await DB.logAudit("create", "product", saved.id, { data: productData });
            showToast("Product created successfully!", "success");
        }

        // Reset form
        resetProductForm();
        showAdminPage("products");
        loadAdminProducts();
        loadDashboard();
    } catch (err) {
        showToast("Error: " + err.message, "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> <span id="submitBtnText">' + (editId ? "Update Product" : "Add Product") + '</span>';
    }
}

async function editProduct(id) {
    try {
        const product = await DB.getProductById(id);
        if (!product) return;

        document.getElementById("formTitle").textContent = "Edit Product";
        document.getElementById("submitBtnText").textContent = "Update Product";
        document.getElementById("submitBtn").dataset.editId = id;
        document.getElementById("cancelEdit").style.display = "inline-block";

        // Fill form
        document.getElementById("pName").value = product.name || "";
        document.getElementById("pSlug").value = product.slug || "";
        document.getElementById("pSlug").dataset.auto = "false";
        document.getElementById("pSKU").value = product.sku || "";
        document.getElementById("pBarcode").value = product.barcode || "";
        document.getElementById("pCategory").value = product.category_id || "";
        document.getElementById("pBrand").value = product.brand_id || "";
        document.getElementById("pPrice").value = product.price || "";
        document.getElementById("pOldPrice").value = product.old_price || "";
        document.getElementById("pCostPrice").value = product.cost_price || "";
        document.getElementById("pShortDesc").value = product.short_description || "";
        document.getElementById("pFullDesc").value = product.full_description || "";
        document.getElementById("pFeatures").value = product.features ? product.features.join("\n") : "";
        
        // Handle images for file inputs
        document.getElementById("pMainImageExisting").value = product.main_image || "";
        const mainImagePreview = document.getElementById("pMainImagePreview");
        if (product.main_image) {
            mainImagePreview.innerHTML = `<img src="${product.main_image}" style="width:100%;height:auto;border-radius:4px;">`;
        } else {
            mainImagePreview.innerHTML = "";
        }

        document.getElementById("pGalleryExisting").value = product.gallery_images ? JSON.stringify(product.gallery_images) : "";
        const galleryPreview = document.getElementById("pGalleryPreview");
        if (product.gallery_images && product.gallery_images.length > 0) {
            galleryPreview.innerHTML = product.gallery_images.map(url => `<img src="${url}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;">`).join("");
        } else {
            galleryPreview.innerHTML = "";
        }

        document.getElementById("pVideo").value = product.video_url || "";
        document.getElementById("pStockQty").value = product.stock_quantity || 0;
        document.getElementById("pLowStock").value = product.low_stock_threshold || 5;
        document.getElementById("pInStock").value = product.in_stock ? "true" : "false";
        document.getElementById("pFeatured").checked = product.is_featured || false;
        document.getElementById("pNew").checked = product.is_new || false;
        document.getElementById("pBestSeller").checked = product.is_best_seller || false;
        document.getElementById("pWeight").value = product.weight_kg || "";
        document.getElementById("pDimensions").value = product.dimensions || "";
        document.getElementById("pWarranty").value = product.warranty || "";
        document.getElementById("pDeliveryInfo").value = product.delivery_info || "";
        document.getElementById("pReturnPolicy").value = product.return_policy || "";
        document.getElementById("pMetaTitle").value = product.meta_title || "";
        document.getElementById("pMetaDesc").value = product.meta_description || "";
        document.getElementById("pMetaKeywords").value = product.meta_keywords || "";

        setSpecs(product.specifications);
        updateDiscount();

        showAdminPage("addProduct");
        document.getElementById("formSection")?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
        showToast("Failed to load product: " + err.message, "error");
    }
}

async function duplicateProduct(id) {
    try {
        const product = await DB.getProductById(id);
        if (!product) return;

        // Create a copy
        const { id: _, created_at, updated_at, review_count, ...data } = product;
        data.name = product.name + " (Copy)";
        data.slug = DB.generateSlug(product.name + " Copy");
        data.is_active = true;
        data.stock_quantity = 0;

        await DB.createProduct(data);
        showToast("Product duplicated!", "success");
        loadAdminProducts();
        loadDashboard();
    } catch (err) {
        showToast("Failed to duplicate: " + err.message, "error");
    }
}

async function toggleProductActive(id, newState) {
    try {
        await DB.updateProduct(id, { is_active: newState });
        showToast(newState ? "Product restored!" : "Product archived!", "success");
        loadAdminProducts();
        loadDashboard();
    } catch (err) {
        showToast("Error: " + err.message, "error");
    }
}

function confirmDeleteProduct(id, name) {
    if (confirm(`Are you sure you want to permanently delete "${name}"?\n\nThis action cannot be undone!`)) {
        DB.hardDeleteProduct(id)
            .then(() => {
                showToast("Product permanently deleted.", "success");
                loadAdminProducts();
                loadDashboard();
            })
            .catch((err) => showToast("Error: " + err.message, "error"));
    }
}

function resetProductForm() {
    document.getElementById("productForm").reset();
    document.getElementById("formTitle").textContent = "Add New Product";
    document.getElementById("submitBtnText").textContent = "Add Product";
    document.getElementById("submitBtn").dataset.editId = "";
    document.getElementById("cancelEdit").style.display = "none";
    document.getElementById("pSlug").dataset.auto = "true";
    document.getElementById("pStockQty").value = "10";
    document.getElementById("pLowStock").value = "5";
    document.getElementById("pInStock").value = "true";
    document.getElementById("discountDisplay").textContent = "No Discount";

    // Clear image previews
    document.getElementById("pMainImagePreview").innerHTML = "";
    document.getElementById("pMainImageExisting").value = "";
    document.getElementById("pGalleryPreview").innerHTML = "";
    document.getElementById("pGalleryExisting").value = "";

    setSpecs(null);
}

function cancelEdit() {
    if (confirm("Discard changes?")) {
        resetProductForm();
        showAdminPage("products");
    }
}

// ===== CATEGORIES =====
async function loadCategoryList() {
    const tbody = document.getElementById("categoryList");
    if (!tbody) return;

    try {
        const categories = await DB.getCategories();
        tbody.innerHTML = categories
            .map((c, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td><strong>${c.name}</strong></td>
                    <td><code>${c.slug}</code></td>
                    <td><i class="fas fa-${c.icon || "tag"}"></i> ${c.icon || "—"}</td>
                    <td>${c.display_order || 0}</td>
                    <td>
                        <button class="btn-view" onclick="editCategory(${c.id}, '${c.name.replace(/'/g, "\\'")}', '${c.slug}', '${c.icon || ""}', ${c.display_order || 0})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-view" onclick="deleteCategory(${c.id})" title="Delete" style="color:var(--danger);">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`)
            .join("");
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--danger);">${err.message}</td></tr>`;
    }
}

function showAddCategoryModal() {
    document.getElementById("categoryModalTitle").textContent = "Add Category";
    document.getElementById("catEditId").value = "";
    document.getElementById("catName").value = "";
    document.getElementById("catSlug").value = "";
    document.getElementById("catIcon").value = "";
    document.getElementById("catOrder").value = "0";
    document.getElementById("categoryModal").classList.add("show");
}

function initCategoryForm() {
    document.getElementById("categoryForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const editId = document.getElementById("catEditId").value;
        const name = document.getElementById("catName").value.trim();
        const slug = document.getElementById("catSlug").value.trim() || DB.generateSlug(name);
        const icon = document.getElementById("catIcon").value.trim();
        const order = parseInt(document.getElementById("catOrder").value) || 0;

        try {
            if (editId) {
                await DB.updateCategory(parseInt(editId), { name, slug, icon, display_order: order });
                showToast("Category updated!", "success");
            } else {
                await DB.createCategory({ name, slug, icon, display_order: order });
                showToast("Category created!", "success");
            }
            closeModal("categoryModal");
            loadCategoryList();
            loadCategoryOptions();
            loadDashboard();
        } catch (err) {
            showToast("Error: " + err.message, "error");
        }
    });
}

function editCategory(id, name, slug, icon, order) {
    document.getElementById("categoryModalTitle").textContent = "Edit Category";
    document.getElementById("catEditId").value = id;
    document.getElementById("catName").value = name;
    document.getElementById("catSlug").value = slug;
    document.getElementById("catIcon").value = icon;
    document.getElementById("catOrder").value = order;
    document.getElementById("categoryModal").classList.add("show");
}

async function deleteCategory(id) {
    if (!confirm("Delete this category? Products in this category will be uncategorized.")) return;
    try {
        await DB.deleteCategory(id);
        showToast("Category deleted!", "success");
        loadCategoryList();
        loadCategoryOptions();
        loadDashboard();
    } catch (err) {
        showToast("Error: " + err.message, "error");
    }
}

// ===== BRANDS =====
async function loadBrandList() {
    const tbody = document.getElementById("brandList");
    if (!tbody) return;

    try {
        const brands = await DB.getBrands();
        tbody.innerHTML = brands
            .map((b, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td><strong>${b.name}</strong></td>
                    <td><code>${b.slug}</code></td>
                    <td><i class="fas fa-${b.icon || "copyright"}"></i> ${b.icon || "—"}</td>
                    <td><span style="color:${b.is_active ? "var(--success)" : "var(--danger)"};">${b.is_active ? "Active" : "Inactive"}</span></td>
                    <td>
                        <button class="btn-view" onclick="editBrand(${b.id}, '${b.name.replace(/'/g, "\\'")}', '${b.slug}', '${b.icon || ""}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-view" onclick="deleteBrand(${b.id})" title="Delete" style="color:var(--danger);">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`)
            .join("");
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--danger);">${err.message}</td></tr>`;
    }
}

function showAddBrandModal() {
    document.getElementById("brandModalTitle").textContent = "Add Brand";
    document.getElementById("brandEditId").value = "";
    document.getElementById("brandName").value = "";
    document.getElementById("brandSlug").value = "";
    document.getElementById("brandIcon").value = "";
    document.getElementById("brandModal").classList.add("show");
}

function initBrandForm() {
    document.getElementById("brandForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const editId = document.getElementById("brandEditId").value;
        const name = document.getElementById("brandName").value.trim();
        const slug = document.getElementById("brandSlug").value.trim() || DB.generateSlug(name);
        const icon = document.getElementById("brandIcon").value.trim();

        try {
            if (editId) {
                await DB.updateBrand(parseInt(editId), { name, slug, icon });
                showToast("Brand updated!", "success");
            } else {
                await DB.createBrand({ name, slug, icon });
                showToast("Brand created!", "success");
            }
            closeModal("brandModal");
            loadBrandList();
            loadBrandOptions();
            loadDashboard();
        } catch (err) {
            showToast("Error: " + err.message, "error");
        }
    });
}

function editBrand(id, name, slug, icon) {
    document.getElementById("brandModalTitle").textContent = "Edit Brand";
    document.getElementById("brandEditId").value = id;
    document.getElementById("brandName").value = name;
    document.getElementById("brandSlug").value = slug;
    document.getElementById("brandIcon").value = icon;
    document.getElementById("brandModal").classList.add("show");
}

async function deleteBrand(id) {
    if (!confirm("Deactivate this brand? It can be reactivated later.")) return;
    try {
        await DB.deleteBrand(id);
        showToast("Brand deactivated!", "success");
        loadBrandList();
        loadBrandOptions();
        loadDashboard();
    } catch (err) {
        showToast("Error: " + err.message, "error");
    }
}

// ===== MODALS =====
function closeModal(id) {
    document.getElementById(id).classList.remove("show");
}

// Close modals on click outside
document.querySelectorAll(".modal").forEach((m) => {
    m.addEventListener("click", (e) => {
        if (e.target === m) closeModal(m.id);
    });
});

// ===== LOGOUT =====
function confirmLogout() {
    if (confirm("Are you sure you want to logout?")) {
        DB.logout();
        window.location.href = "admin.html";
    }
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
