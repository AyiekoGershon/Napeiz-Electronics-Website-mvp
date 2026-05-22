// ===== SUPABASE CONFIGURATION =====
// IMPORTANT: Replace these with your actual Supabase project credentials!
// Get them from: https://supabase.com -> Project Settings -> API

const SUPABASE_CONFIG = {
    // TODO: Replace with your Supabase URL
    url: 'https://artgbfskbqzvcmszxnvu.supabase.co',
    
    // TODO: Replace with your Supabase anon/public key
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFydGdiZnNrYnF6dmNtc3p4bnZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0Mzk2MzksImV4cCI6MjA5NTAxNTYzOX0.-iwx5kM2IsYL52wIg-FkTeWIQZWRTBWhNQ9b_g9D7cA',
    
    // Table names
    tables: {
        products: 'products',
        categories: 'categories',
        brands: 'brands',
        productVariants: 'product_variants',
        adminUsers: 'admin_users',
        inquiries: 'inquiries',
        subscribers: 'subscribers',
        auditLog: 'audit_log'
    }
};

// Initialize Supabase client
let supabaseClient = null;

function getSupabase() {
    if (supabaseClient) return supabaseClient;
    
    // Check if Supabase library is loaded
    if (typeof supabase === 'undefined') {
        console.error('Supabase library not loaded. Make sure to include the Supabase script.');
        return null;
    }
    
    supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    return supabaseClient;
}
