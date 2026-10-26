-- =============================================================================
-- SIOMAY ONLINE — BRANDING LOGO/FAVICON & STANDALONE ORDER INBOX MIGRATION
-- Date: 2026-10-26
-- Description:
-- 1. Adds logo_url and favicon_url columns to public.site_settings for client custom branding.
-- 2. Ensures public.customer_orders table exists with RLS for public creation & owner management.
-- =============================================================================

-- 1. ADD BRANDING LOGO & FAVICON COLUMNS TO SITE_SETTINGS
ALTER TABLE public.site_settings 
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '/images/logo.png',
  ADD COLUMN IF NOT EXISTS favicon_url TEXT DEFAULT '/favicon.png';

-- Ensure default singleton row has values
UPDATE public.site_settings 
SET 
  logo_url = COALESCE(logo_url, '/images/logo.png'),
  favicon_url = COALESCE(favicon_url, '/favicon.png')
WHERE id = 1;

-- 2. CUSTOMER ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.customer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(30) NOT NULL,
  customer_address TEXT NOT NULL,
  customer_note TEXT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_price INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'baru', -- 'baru', 'diproses', 'diantar', 'selesai', 'dibatalkan'
  source VARCHAR(30) NOT NULL DEFAULT 'website',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_orders_created ON public.customer_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_orders_status ON public.customer_orders (status);

-- Enable RLS
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

-- Public can insert orders from website checkout
DROP POLICY IF EXISTS "Public can create orders" ON public.customer_orders;
CREATE POLICY "Public can create orders"
  ON public.customer_orders FOR INSERT
  TO public
  WITH CHECK (true);

-- Public can view their own order by ID if needed
DROP POLICY IF EXISTS "Public can view own order" ON public.customer_orders;
CREATE POLICY "Public can view own order"
  ON public.customer_orders FOR SELECT
  TO public
  USING (true);

-- Authenticated owner can manage all orders
DROP POLICY IF EXISTS "Owner can manage orders" ON public.customer_orders;
CREATE POLICY "Owner can manage orders"
  ON public.customer_orders FOR ALL
  TO authenticated
  USING (public.is_admin_owner())
  WITH CHECK (public.is_admin_owner());

-- Auto update timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_customer_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customer_orders_updated_at ON public.customer_orders;
CREATE TRIGGER trg_customer_orders_updated_at
  BEFORE UPDATE ON public.customer_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_customer_orders_updated_at();
