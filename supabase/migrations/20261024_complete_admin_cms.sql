-- =============================================================================
-- SIOMAY ONLINE — COMPLETE ADMIN CMS DATABASE SCHEMA & RLS POLICIES
-- =============================================================================
-- Tables:
-- 1. admin_users: Authorized owner accounts
-- 2. menu_items: Food menu items (name, price, image, description, availability)
-- 3. site_settings: Singleton table for WhatsApp, Hero banner, Promo video
-- 4. customer_reviews: Customer reviews and moderation
-- 5. Storage bucket 'media' configuration & policies
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. ADMIN USERS TABLE (Whitelisted Owner Authorization)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an authorized owner
CREATE OR REPLACE FUNCTION public.is_admin_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS: Only authenticated users can read their own admin record
DROP POLICY IF EXISTS "Admin users can view own profile" ON public.admin_users;
CREATE POLICY "Admin users can view own profile"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- -----------------------------------------------------------------------------
-- 2. FOOD MENU ITEMS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(80) UNIQUE,
  name VARCHAR(120) NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  badge VARCHAR(60) NULL,
  portion VARCHAR(60) DEFAULT 'Porsi Mantap',
  rating NUMERIC(2, 1) DEFAULT 4.9 CHECK (rating >= 1.0 AND rating <= 5.0),
  is_best_seller BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_sort ON public.menu_items (sort_order ASC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items (is_available);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Public can read available menu items (or all menu items so website can show unavailable badge)
DROP POLICY IF EXISTS "Public can view menu items" ON public.menu_items;
CREATE POLICY "Public can view menu items"
  ON public.menu_items FOR SELECT
  TO public
  USING (true);

-- Only authorized owner can insert, update, delete
DROP POLICY IF EXISTS "Owner can manage menu items" ON public.menu_items;
CREATE POLICY "Owner can manage menu items"
  ON public.menu_items FOR ALL
  TO authenticated
  USING (public.is_admin_owner())
  WITH CHECK (public.is_admin_owner());

-- -----------------------------------------------------------------------------
-- 3. SITE SETTINGS TABLE (Singleton)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  brand_name VARCHAR(100) NOT NULL DEFAULT 'Siomay Online',
  whatsapp_number VARCHAR(30) NOT NULL DEFAULT '628XXXXXXXXXX',
  default_order_message TEXT NOT NULL DEFAULT 'Halo Siomay Online, saya ingin pesan siomay fresh untuk diantar.',
  hero_title TEXT NOT NULL DEFAULT 'Sederhana Rasanya, Susah Dilupakannya.',
  hero_subtitle TEXT NOT NULL DEFAULT 'Siomay fresh dengan bumbu kacang khas Bandung, dibuat setiap hari dari 100% ikan tenggiri asli dan diantar hangat langsung ke rumahmu.',
  hero_badge TEXT NOT NULL DEFAULT 'SIOMAY ONLINE',
  hero_cta_text TEXT NOT NULL DEFAULT 'Pesan via WhatsApp',
  hero_cta_url TEXT NULL,
  hero_image_url TEXT NOT NULL DEFAULT '/images/hero.jpg',
  promo_video_url TEXT NULL,
  promo_video_poster_url TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Public can view site settings
DROP POLICY IF EXISTS "Public can view site settings" ON public.site_settings;
CREATE POLICY "Public can view site settings"
  ON public.site_settings FOR SELECT
  TO public
  USING (true);

-- Only authorized owner can update site settings
DROP POLICY IF EXISTS "Owner can update site settings" ON public.site_settings;
CREATE POLICY "Owner can update site settings"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin_owner())
  WITH CHECK (public.is_admin_owner());

-- Trigger for auto updating updated_at
CREATE OR REPLACE FUNCTION public.handle_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER trigger_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_site_settings_updated_at();

-- -----------------------------------------------------------------------------
-- 4. STORAGE BUCKET: 'media' FOR FOOD IMAGES AND PROMO VIDEOS
-- -----------------------------------------------------------------------------
-- Create 'media' bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies:
-- Public can view/download media
DROP POLICY IF EXISTS "Public media access" ON storage.objects;
CREATE POLICY "Public media access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'media');

-- Owner can upload media
DROP POLICY IF EXISTS "Owner can upload media" ON storage.objects;
CREATE POLICY "Owner can upload media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media' AND
    public.is_admin_owner()
  );

-- Owner can update/replace media
DROP POLICY IF EXISTS "Owner can update media" ON storage.objects;
CREATE POLICY "Owner can update media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'media' AND public.is_admin_owner())
  WITH CHECK (bucket_id = 'media' AND public.is_admin_owner());

-- Owner can delete media
DROP POLICY IF EXISTS "Owner can delete media" ON storage.objects;
CREATE POLICY "Owner can delete media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'media' AND public.is_admin_owner());

-- -----------------------------------------------------------------------------
-- 5. INITIAL SEED DATA (Matching Existing Website Content)
-- -----------------------------------------------------------------------------
-- Default singleton row in site_settings
INSERT INTO public.site_settings (
  id,
  brand_name,
  whatsapp_number,
  default_order_message,
  hero_title,
  hero_subtitle,
  hero_badge,
  hero_cta_text,
  hero_image_url
) VALUES (
  1,
  'Siomay Online',
  '628XXXXXXXXXX',
  'Halo Siomay Online, saya ingin pesan siomay fresh untuk diantar.',
  'Sederhana Rasanya, Susah Dilupakannya.',
  'Siomay fresh dengan bumbu kacang khas Bandung, dibuat setiap hari dari 100% ikan tenggiri asli dan diantar hangat langsung ke rumahmu.',
  'SIOMAY ONLINE',
  'Pesan via WhatsApp',
  '/images/hero.jpg'
)
ON CONFLICT (id) DO NOTHING;

-- Initial menu items from existing website
INSERT INTO public.menu_items (id, slug, name, price, description, image_url, badge, portion, rating, is_best_seller, is_available, sort_order)
VALUES
  (
    '00000000-0000-0000-0001-000000000001',
    'siomay-original',
    'Siomay Original',
    15000,
    'Siomay lembut dengan siraman bumbu kacang khas dan kecap manis gurih.',
    '/images/menu-original.jpg',
    'Paling Populer',
    'Porsi Mantap',
    4.9,
    false,
    true,
    1
  ),
  (
    '00000000-0000-0000-0001-000000000002',
    'siomay-komplit',
    'Siomay Komplit',
    25000,
    'Siomay, tahu, kentang, telur, dan bumbu kacang khas yang melimpah.',
    '/images/menu-komplit.jpg',
    'BEST SELLER',
    'Paling Lengkap',
    4.9,
    true,
    true,
    2
  ),
  (
    '00000000-0000-0000-0001-000000000003',
    'batagor',
    'Batagor',
    15000,
    'Batagor renyah keemasan dengan adonan gurih dan bumbu kacang kental.',
    '/images/menu-batagor.jpg',
    NULL,
    'Crispy & Gurih',
    4.8,
    false,
    true,
    3
  ),
  (
    '00000000-0000-0000-0001-000000000004',
    'tahu',
    'Tahu',
    12000,
    'Tahu lembut isi adonan ikan tenggiri gurih kukus hangat kaya rasa.',
    '/images/menu-tahu.jpg',
    NULL,
    'Kukus Hangat',
    4.8,
    false,
    true,
    4
  ),
  (
    '00000000-0000-0000-0001-000000000005',
    'kentang',
    'Kentang',
    12000,
    'Kentang kukus pulen empuk disiram bumbu kacang gurih dan jeruk limau.',
    '/images/menu-kentang.jpg',
    NULL,
    'Pulen & Empuk',
    4.7,
    false,
    true,
    5
  ),
  (
    '00000000-0000-0000-0001-000000000006',
    'paket-hemat',
    'Paket Hemat',
    35000,
    'Kombinasi siomay, batagor, tahu & telur untuk santap puas bersama teman atau keluarga.',
    '/images/menu-paket-hemat.jpg',
    'Paling Hemat',
    'Porsi Kenyang',
    4.9,
    false,
    true,
    6
  )
ON CONFLICT (id) DO NOTHING;
