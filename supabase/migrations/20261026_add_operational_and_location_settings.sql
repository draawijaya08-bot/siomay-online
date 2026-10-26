-- =============================================================================
-- SIOMAY ONLINE — MIGRATION: OPERATIONAL HOURS & STORE LOCATION SETTINGS
-- =============================================================================
-- Skrip ini menambahkan kolom pengaturan jam buka-tutup dan tempat/area pengiriman
-- ke tabel public.site_settings agar dapat dikelola dinamis dari Admin CMS.
-- =============================================================================

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS operational_status VARCHAR(20) NOT NULL DEFAULT 'buka',
  ADD COLUMN IF NOT EXISTS operational_status_label VARCHAR(60) NOT NULL DEFAULT 'Buka Hari Ini:',
  ADD COLUMN IF NOT EXISTS operational_open_time VARCHAR(10) NOT NULL DEFAULT '10:00',
  ADD COLUMN IF NOT EXISTS operational_close_time VARCHAR(10) NOT NULL DEFAULT '21:00',
  ADD COLUMN IF NOT EXISTS operational_timezone VARCHAR(10) NOT NULL DEFAULT 'WIB',
  ADD COLUMN IF NOT EXISTS operational_days VARCHAR(60) NOT NULL DEFAULT 'Setiap Hari',
  ADD COLUMN IF NOT EXISTS operational_hours VARCHAR(100) NOT NULL DEFAULT '10.00 — 21.00 WIB',
  ADD COLUMN IF NOT EXISTS delivery_area VARCHAR(120) NOT NULL DEFAULT 'Klaten & Sekitarnya',
  ADD COLUMN IF NOT EXISTS strip_announcement VARCHAR(160) NOT NULL DEFAULT '100% Ikan Tenggiri • Fresh Setiap Hari';

-- Refresh RLS permissions
NOTIFY pgrst, 'reload schema';
