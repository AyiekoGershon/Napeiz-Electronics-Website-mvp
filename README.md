# Napeiz Electronics Accessories

A modern, full-stack e-commerce platform for premium electronics and accessories built with HTML, CSS, JavaScript, and Supabase.

## 🚀 Features

### Customer Store
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- 🛒 **Shopping Cart** - Add/remove products, view totals
- 🔍 **Product Search & Filtering** - Filter by category, brand, price, and ratings
- 📦 **Product Details** - Full specifications, images, and availability status
- 💬 **WhatsApp Integration** - Direct WhatsApp ordering with pre-filled product info
- 📧 **Newsletter Subscription** - Subscribe for updates and exclusive offers
- ⭐ **Featured Products** - Showcase top deals and new arrivals
- 🏷️ **Brand Directory** - Browse products by trusted brands

### Admin Dashboard
- 🔐 **Secure Login** - Username/email and password authentication
- 📊 **Dashboard Stats** - Total products, inventory value, categories, and brands
- ➕ **Add/Edit Products** - Full product management with variants, pricing, and stock
- 🏷️ **Category Management** - Create and manage product categories
- 🎯 **Brand Management** - Manage brands and associated products
- 📋 **Product Listing** - View all products with search and filtering
- 📝 **Audit Logging** - Track all admin changes for security
- 💾 **Real-time Sync** - All changes sync immediately to the live store

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Supabase (PostgreSQL database)
- **Authentication**: Email/Username with plaintext validation (upgrade to bcrypt in production)
- **Deployment**: Vercel (with client-side routing support)
- **API**: RESTful via Supabase PostgREST

## 📋 Prerequisites

- Node.js & Python (for local development server)
- Supabase account (https://supabase.com)
- Modern web browser

## 🔧 Installation & Setup

### 1. Clone or Download the Project
```bash
git clone <repository-url>
cd Napeiz-Electronics
```

### 2. Configure Supabase
- Create a Supabase project at https://supabase.com
- Copy your project URL and anon key
- Update `js/supabase-config.js`:
  ```javascript
  const SUPABASE_CONFIG = {
      url: 'your-supabase-url',
      anonKey: 'your-supabase-anon-key',
      ...
  }
  ```

### 3. Initialize Database
- Go to Supabase SQL Editor
- Run the entire `supabase/schema.sql` file to create tables and RLS policies
- Default admin credentials:
  - **Username**: `admin`
  - **Email**: `admin@napeizelectronics.co.ke`
  - **Password**: `Napeiz@2024`

### 4. Run Local Development Server
```bash
python -m http.server 8000
```
- **Store**: http://localhost:8000/
- **Admin**: http://localhost:8000/admin

## 📁 Project Structure

```
Napeiz Electronics Accessories/
├── index.html                 # Main entry point (store + admin)
├── admin.html                 # Legacy admin login (deprecated)
├── admin-dashboard.html       # Admin dashboard interface
├── css/
│   └── style.css             # All styling
├── js/
│   ├── supabase-config.js    # Supabase initialization
│   ├── database.js           # Database operations (DB object)
│   ├── store.js              # Store UI logic and interactions
│   ├── admin-dashboard.js    # Admin dashboard logic
│   └── router.js             # Client-side routing
├── supabase/
│   └── schema.sql            # Database schema & RLS policies
├── data/
│   └── products.json         # Sample product data
├── vercel.json               # Vercel deployment config
└── README.md                 # This file
```

## 🌐 Routing

The app uses client-side routing to handle both store and admin portals from one entry point:

- `/` → Store homepage
- `/admin` → Admin login/dashboard (redirects to login if not authenticated)
- Click "Admin" link in store top-bar to navigate to admin panel
- Click "Back to Store" to return to the store

## 🔐 Authentication

### Admin Login Flow
1. Navigate to `/admin`
2. Enter username/email and password
3. Session stored in browser localStorage
4. Redirects to admin dashboard on success
5. Session persists across page refreshes


⚠️ **Important**: Change this password immediately in production!

## 💾 Database

### Tables
- `products` - Product catalog
- `categories` - Product categories
- `brands` - Brand information
- `product_variants` - Product size/color variants
- `admin_users` - Admin accounts
- `audit_log` - Admin action history
- `inquiries` - Customer inquiries via WhatsApp
- `subscribers` - Newsletter subscribers

### Row Level Security (RLS)
All tables have permissive RLS policies enabled for the anon role. **This is for development only.** For production, implement strict role-based policies.

## 📞 Contact Information

- **Location**: Mabera Town, Migori, Kenya
- **Phone/WhatsApp**: +254 708 521 714
- **Email**: info@napeizelectronics.co.ke

## 🚀 Deployment to Vercel

### Prerequisites
- GitHub account with repository
- Vercel account (https://vercel.com)

### Steps
1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Vercel automatically detects `vercel.json` configuration
4. Deploy! The app will be live with client-side routing working correctly

### Environment Variables (if needed)
No environment variables required for basic deployment. Supabase credentials are client-side safe.

## 🔒 Security Notes

### Current Implementation (Development)
- ⚠️ Passwords stored as plaintext in database
- ⚠️ Supabase anon key exposed in frontend (intentional for SPA)
- ⚠️ RLS policies are permissive for all anon users

### Production Recommendations
1. **Hash Passwords**: Implement bcrypt or similar
2. **Enhance RLS**: Create strict role-based policies
3. **API Layer**: Add backend authentication service
4. **CORS**: Configure Supabase CORS policies
5. **Rate Limiting**: Implement rate limiting on auth endpoints
6. **SSL**: Ensure HTTPS everywhere
7. **Audit Logging**: Extend audit trail for compliance

## 📱 WhatsApp Integration

Customers can purchase directly via WhatsApp:
- Click "Buy via WhatsApp" on any product
- Pre-filled message with product details
- Opens WhatsApp Web or app with merchant number: **+254 708 521 714**

Admin can customize WhatsApp messages in dashboard settings.

## 🐛 Troubleshooting

### Products not loading?
- Check Supabase connection in browser console
- Verify RLS policies are enabled for `admin_users` table
- Clear browser cache and refresh

### Admin login fails?
- Verify admin user exists in Supabase `admin_users` table
- Check `is_active` is set to `true`
- Ensure password matches `password_hash` (case-sensitive)

### Images not showing?
- Verify image URLs are publicly accessible
- Check image URLs in product entries
- Use HTTPS URLs only

### WhatsApp links not working?
- Phone number must be in international format without `+` sign
- Current number: `254708521714`

## 📝 License

This project is proprietary software for Napeiz Electronics Accessories.

## 👥 Support

For issues or questions:
- Email: info@napeizelectronics.co.ke
- WhatsApp: +254 708 521 714

---

**Last Updated**: May 22, 2026
**Version**: 1.0.0
