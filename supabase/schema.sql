-- ===== NAPEIZ ELECTRONICS - SUPABASE DATABASE SCHEMA =====
-- Copy and paste this ENTIRE file into your Supabase SQL editor
-- Run it once to set up all tables, indexes, and seed data

-- ===== 1. CATEGORIES TABLE =====
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT 'microchip',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 2. BRANDS TABLE =====
CREATE TABLE IF NOT EXISTS brands (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT DEFAULT 'microchip',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 3. PRODUCTS TABLE (full Jumia-like model) =====
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    sku TEXT UNIQUE,
    barcode TEXT,
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    brand_id BIGINT REFERENCES brands(id) ON DELETE SET NULL,
    
    -- Pricing
    price NUMERIC(12,2) NOT NULL,
    old_price NUMERIC(12,2),
    cost_price NUMERIC(12,2),
    discount_percent INTEGER DEFAULT 0,
    
    -- Description
    short_description TEXT,
    full_description TEXT,
    features TEXT[],
    specifications JSONB,
    
    -- Media
    main_image TEXT,
    gallery_images TEXT[],
    video_url TEXT,
    
    -- Inventory
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    in_stock BOOLEAN DEFAULT TRUE,
    
    -- Ratings
    rating NUMERIC(2,1) DEFAULT 0.0,
    review_count INTEGER DEFAULT 0,
    
    -- Flags
    is_featured BOOLEAN DEFAULT FALSE,
    is_new BOOLEAN DEFAULT FALSE,
    is_best_seller BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- SEO
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT,
    
    -- Delivery info
    weight_kg NUMERIC(6,2),
    dimensions TEXT,
    warranty TEXT,
    delivery_info TEXT,
    return_policy TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 4. PRODUCT VARIANTS (colors, storage sizes, etc.) =====
CREATE TABLE IF NOT EXISTS product_variants (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    price_adjustment NUMERIC(12,2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    image TEXT,
    sku TEXT UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 5. ADMIN USERS =====
CREATE TABLE IF NOT EXISTS admin_users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 6. AUDIT LOG =====
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id BIGINT,
    changes JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 7. INQUIRIES (WhatsApp leads) =====
CREATE TABLE IF NOT EXISTS inquiries (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_phone TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== 8. NEWSLETTER SUBSCRIBERS =====
CREATE TABLE IF NOT EXISTS subscribers (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);

-- ===== TRIGGER FUNCTION FOR AUTO UPDATING UPDATED_AT =====
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- ===== APPLY TRIGGERS =====
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at 
    BEFORE UPDATE ON admin_users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ===== SEED DATA: DEFAULT ADMIN USER =====
-- Credentials: username = admin, password = Napeiz@2024
-- IMPORTANT: In production, use proper password hashing (bcrypt)!
INSERT INTO admin_users (username, email, password_hash, full_name, role)
VALUES ('admin', 'admin@napeizelectronics.co.ke', 'Napeiz@2024', 'System Administrator', 'superadmin')
ON CONFLICT (username) DO NOTHING;

-- ===== SEED DATA: CATEGORIES =====
INSERT INTO categories (name, slug, icon, display_order) VALUES
    ('TVs & Home Theatre', 'tvs-home-theatre', 'tv', 1),
    ('Phones & Tablets', 'phones-tablets', 'mobile-alt', 2),
    ('Laptops & Computers', 'laptops-computers', 'laptop', 3),
    ('Audio & Headphones', 'audio-headphones', 'headphones', 4),
    ('Gaming', 'gaming', 'gamepad', 5),
    ('Wearables', 'wearables', 'watch', 6),
    ('Home Appliances', 'home-appliances', 'tint', 7)
ON CONFLICT (name) DO NOTHING;

-- ===== SEED DATA: BRANDS =====
INSERT INTO brands (name, slug, icon) VALUES
    ('Samsung', 'samsung', 'mobile-alt'),
    ('Apple', 'apple', 'apple-alt'),
    ('Sony', 'sony', 'playstation'),
    ('LG', 'lg', 'tv'),
    ('JBL', 'jbl', 'music'),
    ('Nintendo', 'nintendo', 'gamepad'),
    ('Dyson', 'dyson', 'wind'),
    ('Bose', 'bose', 'headphones'),
    ('HP', 'hp', 'laptop')
ON CONFLICT (name) DO NOTHING;

-- ===== ROW LEVEL SECURITY POLICIES =====
-- These policies allow access from the anon role for all operations.
-- WARNING: This is not secure for production. Use more restrictive policies once the app is working.

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon select products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow anon insert products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update products" ON products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete products" ON products FOR DELETE USING (true);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon select categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow anon insert categories" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update categories" ON categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete categories" ON categories FOR DELETE USING (true);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon select brands" ON brands FOR SELECT USING (true);
CREATE POLICY "Allow anon insert brands" ON brands FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update brands" ON brands FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete brands" ON brands FOR DELETE USING (true);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon select product_variants" ON product_variants FOR SELECT USING (true);
CREATE POLICY "Allow anon insert product_variants" ON product_variants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update product_variants" ON product_variants FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete product_variants" ON product_variants FOR DELETE USING (true);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon select admin_users" ON admin_users FOR SELECT USING (true);
CREATE POLICY "Allow anon insert admin_users" ON admin_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update admin_users" ON admin_users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete admin_users" ON admin_users FOR DELETE USING (true);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon select audit_log" ON audit_log FOR SELECT USING (true);
CREATE POLICY "Allow anon insert audit_log" ON audit_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update audit_log" ON audit_log FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete audit_log" ON audit_log FOR DELETE USING (true);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon select inquiries" ON inquiries FOR SELECT USING (true);
CREATE POLICY "Allow anon insert inquiries" ON inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update inquiries" ON inquiries FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete inquiries" ON inquiries FOR DELETE USING (true);

ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon select subscribers" ON subscribers FOR SELECT USING (true);
CREATE POLICY "Allow anon insert subscribers" ON subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update subscribers" ON subscribers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete subscribers" ON subscribers FOR DELETE USING (true);
