-- =============================================================================
-- SIOMAY ONLINE — CUSTOMER REVIEWS TABLE & ROW LEVEL SECURITY SETUP
-- =============================================================================
-- Description:
-- Table for storing customer reviews, ratings, and comments with
-- strict Row Level Security (RLS) to enforce moderation:
-- - Public can ONLY SELECT reviews where status = 'approved'.
-- - Public can ONLY INSERT reviews where status = 'pending'.
-- - Authenticated users (admin/owner) can SELECT, UPDATE, and DELETE all reviews.
-- =============================================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.customer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name VARCHAR(100) NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  menu_item_id VARCHAR(50) NULL,
  menu_item_name VARCHAR(100) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Validation constraints
  CONSTRAINT check_display_name_length CHECK (char_length(trim(display_name)) >= 2 AND char_length(display_name) <= 100),
  CONSTRAINT check_comment_length CHECK (char_length(trim(comment)) >= 10 AND char_length(comment) <= 1000)
);

-- 2. Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_customer_reviews_approved 
  ON public.customer_reviews (status, created_at DESC) 
  WHERE status = 'approved';

CREATE INDEX IF NOT EXISTS idx_customer_reviews_status 
  ON public.customer_reviews (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_reviews_menu_item 
  ON public.customer_reviews (menu_item_id);

-- 3. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_customer_reviews_updated_at ON public.customer_reviews;
CREATE TRIGGER trigger_customer_reviews_updated_at
  BEFORE UPDATE ON public.customer_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Policy 1: Public Read
-- Anyone can read approved reviews only. Pending and rejected reviews are hidden.
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.customer_reviews;
CREATE POLICY "Public can view approved reviews"
  ON public.customer_reviews
  FOR SELECT
  TO public
  USING (status = 'approved');

-- Policy 2: Public Insert
-- Anyone can insert a new review, but status MUST be 'pending'.
-- This prevents clients from injecting status = 'approved'.
DROP POLICY IF EXISTS "Public can insert pending reviews only" ON public.customer_reviews;
CREATE POLICY "Public can insert pending reviews only"
  ON public.customer_reviews
  FOR INSERT
  TO public
  WITH CHECK (
    status = 'pending' AND
    char_length(trim(display_name)) >= 2 AND
    char_length(display_name) <= 100 AND
    rating >= 1 AND rating <= 5 AND
    char_length(trim(comment)) >= 10 AND
    char_length(comment) <= 1000
  );

-- Policy 3: Authenticated Admin Full Management
-- Store owner / admin authenticated via Supabase Auth can view, update (approve/reject), and delete all reviews.
DROP POLICY IF EXISTS "Authenticated admin can view all reviews" ON public.customer_reviews;
CREATE POLICY "Authenticated admin can view all reviews"
  ON public.customer_reviews
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated admin can update reviews" ON public.customer_reviews;
CREATE POLICY "Authenticated admin can update reviews"
  ON public.customer_reviews
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated admin can delete reviews" ON public.customer_reviews;
CREATE POLICY "Authenticated admin can delete reviews"
  ON public.customer_reviews
  FOR DELETE
  TO authenticated
  USING (true);

-- =============================================================================
-- SEED DATA FOR DEVELOPMENT / TESTING ONLY
-- =============================================================================
-- NOTE: The following seed records are explicitly marked as TEST DATA.
-- In production, real reviews will be submitted by actual customers.
-- =============================================================================

INSERT INTO public.customer_reviews (id, display_name, rating, comment, menu_item_id, menu_item_name, status, created_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Budi Santoso (Test Data)',
    5,
    'Siomaynya sangat lembut, ikannya berasa banget dan bumbu kacangnya gurih legit. Sampai di rumah masih hangat!',
    'siomay-komplit',
    'Siomay Komplit',
    'approved',
    now() - interval '2 days'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Sarah Mustika (Test Data)',
    5,
    'Batagornya garing renyah di luar tapi empuk di dalam. Bumbu kacangnya melimpah dan tidak pelit jeruk limau.',
    'batagor',
    'Batagor',
    'approved',
    now() - interval '4 days'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Dimas Pratama (Test Data)',
    5,
    'Pesan paket hemat buat makan siang sekantor di Klaten. Semua teman puji rasanya enak dan porsi mengenyangkan.',
    'paket-hemat',
    'Paket Hemat',
    'approved',
    now() - interval '6 days'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'Rina Wijaya (Test Data)',
    4,
    'Tekstur tahu dan siomay originalnya kenyal pas, gurih ikan tenggirinya mantap. Pengiriman cepat via kurir lokal.',
    'siomay-original',
    'Siomay Original',
    'approved',
    now() - interval '8 days'
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'Hendra Kurniawan (Test Data)',
    5,
    'Contoh ulasan baru yang masih menunggu moderasi admin. Ulasan ini tidak akan tampil di web publik sampai disetujui.',
    'siomay-komplit',
    'Siomay Komplit',
    'pending',
    now() - interval '1 hour'
  )
ON CONFLICT (id) DO NOTHING;
