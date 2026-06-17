-- 1. Create the bucket for product images (if it doesn't exist)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- 2. Allow public access to read all images (SELECT)
create policy "Public Access to Product Images" 
on storage.objects for select 
using ( bucket_id = 'product-images' );

-- 3. Allow anonymous/public users to upload images (INSERT)
-- (In a strict production environment, you would restrict this to authenticated admins)
create policy "Allow Image Uploads" 
on storage.objects for insert 
with check ( bucket_id = 'product-images' );

-- 4. Allow users to update their uploaded images
create policy "Allow Image Updates" 
on storage.objects for update 
using ( bucket_id = 'product-images' );

-- 5. Allow users to delete images
create policy "Allow Image Deletes" 
on storage.objects for delete 
using ( bucket_id = 'product-images' );
