// ===== SUPABASE DATABASE SERVICE =====
// Handles all database operations for the store
// FIXED: init() uses correct Supabase syntax
// FIXED: getProducts() handles category_slug filter differently

const DB = {
    client: null,

    async init() {
        this.client = getSupabase();
        if (!this.client) return false;
        
        // Verify connection by fetching categories
        try {
            const { count, error } = await this.client
                .from('categories')
                .select('*', { count: 'exact', head: true });
            if (error) throw error;
            console.log('Supabase connected successfully. Count:', count);
            return true;
        } catch (err) {
            console.error('Supabase init failed:', err.message);
            // Try a simpler connection test
            try {
                const { data, error: e2 } = await this.client.from('categories').select('id').limit(1);
                if (e2) throw e2;
                console.log('Supabase reachable via simple query');
                return true;
            } catch (e3) {
                console.error('Supabase completely unreachable:', e3.message);
                return false;
            }
        }
    },

    // ==================== PRODUCTS ====================

    async getProducts(filters = {}) {
        // First get the category_id if we have a slug filter
        let categoryId = null;
        if (filters.category_slug) {
            try {
                const { data: cat } = await this.client
                    .from('categories')
                    .select('id')
                    .eq('slug', filters.category_slug)
                    .single();
                if (cat) categoryId = cat.id;
            } catch (e) {
                // category not found
            }
        }

        let query = this.client
            .from('products')
            .select(`
                *,
                categories:category_id(name, slug, icon),
                brands:brand_id(name, slug, icon)
            `)
            .eq('is_active', true);

        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }
        if (filters.brand_id) {
            query = query.eq('brand_id', filters.brand_id);
        }
        if (filters.featured) {
            query = query.eq('is_featured', true);
        }
        if (filters.new) {
            query = query.eq('is_new', true);
        }
        if (filters.best_seller) {
            query = query.eq('is_best_seller', true);
        }
        if (filters.search) {
            query = query.ilike('name', `%${filters.search}%`);
        }
        if (filters.in_stock) {
            query = query.eq('in_stock', true);
        }

        // Sorting
        if (filters.sort) {
            switch (filters.sort) {
                case 'price_asc': query = query.order('price', { ascending: true }); break;
                case 'price_desc': query = query.order('price', { ascending: false }); break;
                case 'rating': query = query.order('rating', { ascending: false }); break;
                case 'newest': default: query = query.order('created_at', { ascending: false }); break;
            }
        } else {
            query = query.order('created_at', { ascending: false });
        }

        // Pagination
        if (filters.limit) query = query.limit(filters.limit);
        if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);

        const { data, error, count } = await query;
        if (error) throw error;
        return { products: data, count };
    },

    async getProductBySlug(slug) {
        const { data, error } = await this.client
            .from('products')
            .select(`
                *,
                categories:category_id(*),
                brands:brand_id(*),
                product_variants(*)
            `)
            .eq('slug', slug)
            .single();

        if (error) throw error;
        return data;
    },

    async getProductById(id) {
        const { data, error } = await this.client
            .from('products')
            .select(`
                *,
                categories:category_id(*),
                brands:brand_id(*),
                product_variants(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    // Admin: Get all products (including inactive)
    async getAllProductsAdmin() {
        const { data, error } = await this.client
            .from('products')
            .select(`
                *,
                categories:category_id(name, slug),
                brands:brand_id(name, slug)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    // Admin: Create product
    async createProduct(productData) {
        const { data, error } = await this.client
            .from('products')
            .insert([productData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Admin: Update product
    async updateProduct(id, productData) {
        const { data, error } = await this.client
            .from('products')
            .update(productData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Admin: Soft delete
    async deleteProduct(id) {
        const { data, error } = await this.client
            .from('products')
            .update({ is_active: false })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Admin: Permanently delete
    async hardDeleteProduct(id) {
        const { error } = await this.client
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    // ==================== VARIANTS ====================

    async getVariants(productId) {
        const { data, error } = await this.client
            .from('product_variants')
            .select('*')
            .eq('product_id', productId)
            .eq('is_active', true);

        if (error) throw error;
        return data;
    },

    async createVariant(variantData) {
        const { data, error } = await this.client
            .from('product_variants')
            .insert([variantData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateVariant(id, variantData) {
        const { data, error } = await this.client
            .from('product_variants')
            .update(variantData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteVariant(id) {
        const { error } = await this.client
            .from('product_variants')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    // ==================== CATEGORIES ====================

    async getCategories() {
        const { data, error } = await this.client
            .from('categories')
            .select('*')
            .order('display_order');

        if (error) throw error;
        return data;
    },

    async createCategory(catData) {
        const { data, error } = await this.client
            .from('categories')
            .insert([catData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateCategory(id, catData) {
        const { data, error } = await this.client
            .from('categories')
            .update(catData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteCategory(id) {
        const { error } = await this.client
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    // ==================== BRANDS ====================

    async getBrands() {
        const { data, error } = await this.client
            .from('brands')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;
        return data;
    },

    async createBrand(brandData) {
        const { data, error } = await this.client
            .from('brands')
            .insert([brandData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateBrand(id, brandData) {
        const { data, error } = await this.client
            .from('brands')
            .update(brandData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteBrand(id) {
        const { error } = await this.client
            .from('brands')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw error;
        return true;
    },

    // ==================== AUTHENTICATION ====================

    async login(identifier, password) {
        const input = identifier.trim();
        if (!input || !password) {
            throw new Error('Please enter both username/email and password.');
        }

        let query = this.client
            .from('admin_users')
            .select('*')
            .eq('is_active', true);

        if (input.includes('@')) {
            query = query.ilike('email', input);
        } else {
            query = query.ilike('username', input);
        }

        const { data, error } = await query.maybeSingle();
        if (error) {
            throw new Error(`Login failed: ${error.message}${error.details ? ` - ${error.details}` : ''}`);
        }
        if (!data) {
            throw new Error('Invalid credentials');
        }

        // Compare password (plain text for now - use bcrypt in production)
        if (data.password_hash !== password) {
            throw new Error('Invalid credentials');
        }

        // Update last login
        await this.client
            .from('admin_users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', data.id);

        // Store admin session
        const session = {
            id: data.id,
            username: data.username,
            fullName: data.full_name,
            role: data.role,
            email: data.email
        };
        localStorage.setItem('napeizAdminSession', JSON.stringify(session));

        return session;
    },

    logout() {
        localStorage.removeItem('napeizAdminSession');
    },

    getCurrentAdmin() {
        const session = localStorage.getItem('napeizAdminSession');
        return session ? JSON.parse(session) : null;
    },

    isLoggedIn() {
        return !!this.getCurrentAdmin();
    },

    // ==================== DASHBOARD STATS ====================

    async getDashboardStats() {
        const [products, categories, brands, lowStock] = await Promise.all([
            this.client.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
            this.client.from('categories').select('*', { count: 'exact', head: true }),
            this.client.from('brands').select('*', { count: 'exact', head: true }).eq('is_active', true),
            this.client.from('products').select('*', { count: 'exact', head: true }).eq('in_stock', true).lt('stock_quantity', 10)
        ]);

        const { data: activeProducts } = await this.client
            .from('products')
            .select('price, stock_quantity')
            .eq('is_active', true);

        const totalValue = activeProducts?.reduce((sum, p) => sum + (p.price * (p.stock_quantity || 0)), 0) || 0;

        return {
            totalProducts: products.count || 0,
            totalCategories: categories.count || 0,
            totalBrands: brands.count || 0,
            lowStockItems: lowStock.count || 0,
            totalInventoryValue: totalValue
        };
    },

    // ==================== AUDIT LOG ====================

    async logAudit(action, entityType, entityId, changes = {}) {
        const admin = this.getCurrentAdmin();
        if (!admin) return;

        await this.client
            .from('audit_log')
            .insert([{
                admin_id: admin.id,
                action,
                entity_type: entityType,
                entity_id: entityId,
                changes: changes
            }]);
    },

    // ==================== INQUIRIES ====================

    async logInquiry(inquiry) {
        const { data, error } = await this.client
            .from('inquiries')
            .insert([inquiry])
            .select();

        if (error) throw error;
        return data;
    },

    // ==================== SUBSCRIBERS ====================

    async subscribe(email) {
        const { data, error } = await this.client
            .from('subscribers')
            .insert([{ email }])
            .select();

        if (error) {
            if (error.code === '23505') {
                throw new Error('You are already subscribed!');
            }
            throw error;
        }
        return data;
    },

    // ==================== UTILITY ====================

    generateSlug(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_]+/g, '-')
            .replace(/^-+|-+$/g, '')
            + '-' + Math.random().toString(36).substring(2, 6);
    },

    formatPrice(price) {
        if (price === null || price === undefined) return 'KSh 0.00';
        return 'KSh ' + Number(price).toLocaleString('en-KE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },

    generateWhatsAppMessage(product, quantity = 1) {
        const company = {
            name: 'Napeiz Electronics Accessories',
            phone: '+254708521714',
            whatsapp: '254708521714'
        };

        const total = product.price * quantity;
        let message = `Hello ${company.name}! I am interested in purchasing:\n\n`;
        message += `*${product.name}*\n`;
        if (product.brands) message += `Brand: ${product.brands.name}\n`;
        message += `Price: ${this.formatPrice(product.price)}\n`;
        message += `Quantity: ${quantity}\n`;
        message += `Total: ${this.formatPrice(total)}\n\n`;
        if (product.sku) message += `SKU: ${product.sku}\n`;
        message += `\nPlease provide payment details and delivery information. Thank you!`;

        return encodeURIComponent(message);
    }
};
