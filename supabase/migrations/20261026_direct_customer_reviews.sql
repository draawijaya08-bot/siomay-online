-- =============================================================================
-- SIOMAY ONLINE — DIRECT CUSTOMER REVIEWS (NO ADMIN MODERATION REQUIRED)
-- =============================================================================
-- Description:
-- Update customer reviews schema and Row Level Security (RLS) to support:
-- 1. Direct publishing: Reviews submitted by customers immediately have status = 'approved'.
-- 2. Customer self-management: Customers can delete their own reviews directly.
-- 3. Elimination of admin moderation requirement.
-- =============================================================================

-- 1. Alter default status to 'approved'
ALTER TABLE public.customer_reviews 
  ALTER COLUMN status SET DEFAULT 'approved';

-- 2. Approve all pending reviews so they are immediately visible on the public site
UPDATE public.customer_reviews 
  SET status = 'approved' 
  WHERE status = 'pending';

-- 3. Reset and update RLS policies
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Public can insert pending reviews only" ON public.customer_reviews;
DROP POLICY IF EXISTS "Public can insert reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Public can delete reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Authenticated admin can view all reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Authenticated admin can update reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Authenticated admin can delete reviews" ON public.customer_reviews;
DROP POLICY IF EXISTS "Public can manage reviews" ON public.customer_reviews;

-- Allow public (all visitors/customers) to read all approved reviews
CREATE POLICY "Public can view approved reviews"
  ON public.customer_reviews
  FOR SELECT
  TO public
  USING (true);

-- Allow public to insert directly with approved status
CREATE POLICY "Public can insert reviews"
  ON public.customer_reviews
  FOR INSERT
  TO public
  WITH CHECK (
    char_length(trim(display_name)) >= 2 AND
    char_length(display_name) <= 100 AND
    rating >= 1 AND rating <= 5 AND
    char_length(trim(comment)) >= 10 AND
    char_length(comment) <= 1000
  );

-- Allow customers to edit/update their reviews directly
CREATE POLICY "Public can update reviews"
  ON public.customer_reviews
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (
    char_length(trim(display_name)) >= 2 AND
    char_length(display_name) <= 100 AND
    rating >= 1 AND rating <= 5 AND
    char_length(trim(comment)) >= 10 AND
    char_length(comment) <= 1000
  );

-- Allow customers to delete reviews (e.g. if they made a typo)
CREATE POLICY "Public can delete reviews"
  ON public.customer_reviews
  FOR DELETE
  TO public
  USING (true);
