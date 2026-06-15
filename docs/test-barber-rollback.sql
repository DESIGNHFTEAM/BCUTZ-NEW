-- Rollback for the fake "E2E Test Barbershop" preview seed.
-- Barber profile id: 196cd699-b9a1-4963-b896-bd893aab4819
-- Auth user:         bbbb2222-2222-2222-2222-222222222222 (e2e-barber@bcutz.test)
-- Run via Supabase MCP execute_sql on project mistdeyttbkqrxcvnrlp.
-- This restores the row to its pre-seed snapshot (2026-06-10) and deletes seeded children.

-- 1. Delete seeded reviews + bookings (deterministic test UUIDs)
delete from reviews  where id in (
  'a0000004-0000-4000-8000-000000000001',
  'a0000004-0000-4000-8000-000000000002',
  'a0000004-0000-4000-8000-000000000003');
delete from bookings where id in (
  'a0000003-0000-4000-8000-000000000001',
  'a0000003-0000-4000-8000-000000000002',
  'a0000003-0000-4000-8000-000000000003');

-- 2. Delete seeded staff + location
delete from barber_staff     where id in (
  'a0000002-0000-4000-8000-000000000001',
  'a0000002-0000-4000-8000-000000000002');
delete from barber_locations where id = 'a0000001-0000-4000-8000-000000000001';

-- 3. Restore barber_profiles to the pre-seed snapshot (hidden again)
update barber_profiles set
  shop_name            = 'E2E Test Barbershop',
  description          = 'A test shop seeded for end-to-end testing. Friendly, professional, fast.',
  is_active            = false,
  is_verified          = false,
  profile_image_url    = null,
  gallery_images       = '{}',
  videos               = '{}',
  amenities            = '{}',
  languages            = '{}',
  service_tags         = array['haircut','fade','beard','shave'],
  audience_tags        = array['men','unisex'],
  avg_rating           = 0,
  total_reviews        = 0,
  cancellation_policy  = null,
  booking_buffer_minutes = 0
where id = '196cd699-b9a1-4963-b896-bd893aab4819';

-- To ONLY hide it from the public site (keep the rich data), run instead:
-- update barber_profiles set is_active = false where id = '196cd699-b9a1-4963-b896-bd893aab4819';
