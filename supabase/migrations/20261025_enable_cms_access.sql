-- =============================================================================
-- SIOMAY ONLINE — ENABLE FULL CMS ACCESS (MENU, STORAGE & SETTINGS)
-- =============================================================================
-- Jalankan skrip ini di Supabase SQL Editor agar Admin CMS dapat:
-- 1. Menambah, mengedit, dan menghapus menu langsung ke tabel Supabase
-- 2. Mengunggah foto produk langsung ke Supabase Storage 'media'
-- 3. Mengubah pengaturan toko (WhatsApp, Hero banner) secara live
-- =============================================================================

-- 1. Akses Pengelolaan Menu Makanan (Insert, Update, Delete)
DROP POLICY IF EXISTS "Owner can manage menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Public can manage menu items" ON public.menu_items;
CREATE POLICY "Public can manage menu items"
  ON public.menu_items FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 2. Akses Upload & Pengelolaan Media Storage (Bucket: 'media')
DROP POLICY IF EXISTS "Owner can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Owner can update media" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete media" ON storage.objects;
DROP POLICY IF EXISTS "Allow all access to media" ON storage.objects;
CREATE POLICY "Allow all access to media"
  ON storage.objects FOR ALL
  TO public
  USING (bucket_id = 'media')
  WITH CHECK (bucket_id = 'media');

-- 3. Akses Pengaturan Toko (site_settings)
DROP POLICY IF EXISTS "Owner can update site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Public can update site settings" ON public.site_settings;
CREATE POLICY "Public can update site settings"
  ON public.site_settings FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
