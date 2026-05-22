---
globs: "**/Napeiz Electronics Asscesories/**/*"
---

For the Napeiz Electronics ecommerce project with Supabase:

ARCHITECTURE:
- Database: Supabase PostgreSQL (tables: products, categories, brands, product_variants, admin_users, audit_log, inquiries, subscribers)
- Frontend: Static HTML/JS (index.html, admin.html, admin-dashboard.html)
- JS files: supabase-config.js (config), database.js (DB service), store.js (customer UI), admin-dashboard.js (admin UI)
- CSS: style.css with CSS variables

KEY RULES:
1. Admin access is URL-based only (admin.html). NO admin button on public site.
2. All products, categories, brands come from Supabase (not from JSON file directly)
3. Configure Supabase credentials in js/supabase-config.js
4. Admin credentials stored in admin_users table (default: admin / Napeiz@2024)
5. Admin session stored in localStorage key 'napeizAdminSession'
6. Cart uses localStorage key 'napeizCart' (no user sign-in needed for customers)
7. WhatsApp integration: customers click "Buy via WhatsApp" → opens pre-filled WhatsApp chat
8. Product model includes: pricing, descriptions, features, specifications (JSONB), variants, media, inventory, SEO, delivery/warranty
9. Admin can: CRUD products with full Jumia-like fields, manage categories, manage brands, view dashboard stats
10. Price format: KSh with Kenyan locale (KSh 89,999.00)
11. Import Supabase JS lib: https://cdnjs.cloudflare.com/ajax/libs/supabase/2.39.0/supabase.min.js