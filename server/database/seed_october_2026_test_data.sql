-- ============================================================================
-- NEXUS WORKSPACE ERP - COMPREHENSIVE OCTOBER 2026 TEST DATA SEED SCRIPT
-- Database Engine: MySQL 8.0+ / MariaDB 10.4+
-- Period Coverage: October 1, 2026 – October 15, 2026 (Inclusive)
--
-- TARGET: Validates and stress-tests all ERP functionality fixes:
--   1. Branch Isolation & Global Multi-Branch Filtering
--   2. Facility Analytics, Capacity, & Occupancy Calculations
--   3. Operations & Daily Logger (All booking statuses, payment methods, durations)
--   4. CRM & Customer Directory (Lifetime Revenue, Active/Expiring/Expired Subscriptions)
--   5. Finance & Expenses (Direct Branch vs. Shared 50/50 Multi-Branch Allocation)
--   6. Financial Reports & Profitability (Reconciled Profitable vs. Loss-Making Branches)
--
-- SAFETY & REPEATABILITY:
--   - Uses idempotent INSERT ... ON DUPLICATE KEY UPDATE syntax.
--   - Non-destructive: No DROP, TRUNCATE, or DELETE operations.
--   - All seeded records use distinct, identifiable primary key prefixes:
--       Branches:         `BR-SEED-01`, `BR-SEED-02`
--       Facilities:       `FAC-SEED-01` to `FAC-SEED-10` (5 per branch)
--       Expense Cats:     `EC-SEED-01` to `EC-SEED-03`
--       Clients/CRM:      `CL-SEED-01` to `CL-SEED-10`
--       Bookings:         `BK-SEED-01` to `BK-SEED-20`
--       Booking Items:    9001 to 9020
--       Subscriptions:    `SUB-SEED-01` to `SUB-SEED-08`
--       Expenses:         `EXP-SEED-01` to `EXP-SEED-14`
--       Payments:         `PAY-SEED-01` to `PAY-SEED-19`
-- ============================================================================

START TRANSACTION;

-- ----------------------------------------------------------------------------
-- 1. BRANCHES (Exactly 2 Enterprise Hub Branches)
-- ----------------------------------------------------------------------------
INSERT INTO `branches` (`id`, `branch_code`, `name`, `location`, `state`, `status`, `created_date`, `created_at`, `updated_at`)
VALUES
  ('BR-SEED-01', 'ABJ', 'Abuja Central Hub', 'Plot 402 Constitution Avenue, Central Business District, Abuja', 'FCT Abuja', 'Active', '2026-09-15', '2026-09-15 08:00:00', '2026-09-15 08:00:00'),
  ('BR-SEED-02', 'PHC', 'Port Harcourt Premier Hub', '12 Trans-Amadi Industrial Layout, Port Harcourt', 'Rivers State', 'Active', '2026-09-15', '2026-09-15 08:00:00', '2026-09-15 08:00:00')
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `location` = VALUES(`location`),
  `state` = VALUES(`state`),
  `status` = VALUES(`status`),
  `updated_at` = NOW();

-- ----------------------------------------------------------------------------
-- 2. FACILITIES (Exactly 5 Facilities per Branch = 10 Facilities Total)
-- ----------------------------------------------------------------------------
-- Branch 1 Facilities: Abuja Central Hub (BR-SEED-01)
INSERT INTO `facilities` (`id`, `name`, `branch_id`, `branch_name`, `default_price`, `capacity`, `status`, `description`, `created_date`, `created_at`, `updated_at`)
VALUES
  ('FAC-SEED-01', 'Abuja Hot Desk Zone', 'BR-SEED-01', 'Abuja Central Hub', 1500.00, 40, 'Active', 'Open-plan collaborative flex desks with dedicated high-speed fiber WiFi and ergonomic Herman Miller seating.', '2026-09-20', '2026-09-20 09:00:00', '2026-09-20 09:00:00'),
  ('FAC-SEED-02', 'Abuja Dedicated Desk Suite', 'BR-SEED-01', 'Abuja Central Hub', 3500.00, 20, 'Active', 'Reserved single-occupancy workstation desk with lockable under-desk mobile pedestal in a low-noise zone.', '2026-09-20', '2026-09-20 09:00:00', '2026-09-20 09:00:00'),
  ('FAC-SEED-03', 'Abuja Executive Boardroom', 'BR-SEED-01', 'Abuja Central Hub', 12000.00, 16, 'Active', 'High-end executive boardroom equipped with dual 4K conference displays, acoustic baffling, and smart interactive whiteboard.', '2026-09-20', '2026-09-20 09:00:00', '2026-09-20 09:00:00'),
  ('FAC-SEED-04', 'Abuja Team Private Office', 'BR-SEED-01', 'Abuja Central Hub', 25000.00, 8, 'Active', 'Fully furnished turn-key private office suite with biometric door access and executive managerial desk.', '2026-09-20', '2026-09-20 09:00:00', '2026-09-20 09:00:00'),
  ('FAC-SEED-05', 'Abuja Podcast & Media Studio', 'BR-SEED-01', 'Abuja Central Hub', 8000.00, 5, 'Active', 'Sound-isolated acoustic recording studio equipped with 4 Shure SM7B broadcast microphones and 4K PTZ camera.', '2026-09-20', '2026-09-20 09:00:00', '2026-09-20 09:00:00'),

-- Branch 2 Facilities: Port Harcourt Premier Hub (BR-SEED-02)
  ('FAC-SEED-06', 'PHC Creative Coworking Space', 'BR-SEED-02', 'Port Harcourt Premier Hub', 1200.00, 35, 'Active', 'Dynamic coworking space with natural daylight, lounge breakout areas, and direct cafe access.', '2026-09-20', '2026-09-20 09:00:00', '2026-09-20 09:00:00'),
  ('FAC-SEED-07', 'PHC Corporate Meeting Room', 'BR-SEED-02', 'Port Harcourt Premier Hub', 6500.00, 12, 'Active', 'Mid-sized presentation and client pitch conference room with conferencing soundbar and glass whiteboard.', '2026-09-20', '2026-09-20 09:00:00', '2026-09-20 09:00:00'),
  ('FAC-SEED-08', 'PHC Private Executive Suite', 'BR-SEED-02', 'Port Harcourt Premier Hub', 18000.00, 6, 'Active', 'Soundproofed private office designed for business executives and confidential legal or energy consulting teams.', '2026-09-20', '2026-09-20 09:00:00', '2026-09-20 09:00:00'),
  ('FAC-SEED-09', 'PHC Training & Workshop Hall', 'BR-SEED-02', 'Port Harcourt Premier Hub', 22000.00, 30, 'Active', 'Expansive seminar and workshop event space configured with tiered seating, dual projection, and wireless lapel mics.', '2026-09-20', '2026-09-20 09:00:00', '2026-09-20 09:00:00'),
  ('FAC-SEED-10', 'PHC Sound Stage & Audio Booth', 'BR-SEED-02', 'Port Harcourt Premier Hub', 7500.00, 4, 'Active', 'Compact audio isolation booth for commercial voiceovers, podcast recordings, and audio post-production.', '2026-09-20', '2026-09-20 09:00:00', '2026-09-20 09:00:00')
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `branch_id` = VALUES(`branch_id`),
  `branch_name` = VALUES(`branch_name`),
  `default_price` = VALUES(`default_price`),
  `capacity` = VALUES(`capacity`),
  `status` = VALUES(`status`),
  `description` = VALUES(`description`),
  `updated_at` = NOW();

-- ----------------------------------------------------------------------------
-- 3. EXPENSE CATEGORIES (Supplementary Test Categories)
-- ----------------------------------------------------------------------------
INSERT INTO `expense_categories` (`id`, `category_ref`, `name`, `description`, `status`, `created_date`, `created_at`, `updated_at`, `color`)
VALUES
  ('EC-SEED-01', 'CAT-MKT', 'Marketing & Advertising', 'Digital search campaigns, corporate billboard placements, and promotional brochures.', 'Active', '2026-09-20', '2026-09-20 10:00:00', '2026-09-20 10:00:00', '#F59E0B'),
  ('EC-SEED-02', 'CAT-OFF', 'Office Supplies & Stationery', 'Paper, toners, visitor wristbands, printer maintenance kits, and desk stationery.', 'Active', '2026-09-20', '2026-09-20 10:00:00', '2026-09-20 10:00:00', '#EC4899'),
  ('EC-SEED-03', 'CAT-SEC', 'Security & Access Control', 'Physical security guards, biometric access turnstile calibration, and CCTV surveillance.', 'Active', '2026-09-20', '2026-09-20 10:00:00', '2026-09-20 10:00:00', '#6366F1')
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `status` = VALUES(`status`),
  `color` = VALUES(`color`),
  `updated_at` = NOW();

-- ----------------------------------------------------------------------------
-- 4. CRM & CLIENTS (10 Realistic Enterprise & SME Accounts)
-- ----------------------------------------------------------------------------
INSERT INTO `clients` (`id`, `client_ref`, `name`, `phone`, `email`, `company`, `status`, `created_at`, `updated_at`)
VALUES
  ('CL-SEED-01', 'CL-OCT-01', 'Apex Innovations Ltd', '+234 803 111 2233', 'operations@apexinnovations.ng', 'Apex Innovations Group', 'VIP', '2026-09-25 09:30:00', '2026-10-15 08:00:00'),
  ('CL-SEED-02', 'CL-OCT-02', 'Zenith Digital Media', '+234 802 222 3344', 'contact@zenithmedia.africa', 'Zenith Digital Media', 'Active', '2026-09-26 10:15:00', '2026-10-14 11:20:00'),
  ('CL-SEED-03', 'CL-OCT-03', 'Nexus Logistics International', '+234 814 333 4455', 'dispatch@nexuslogistics.com', 'Nexus Freight & Logistics', 'Active', '2026-09-28 11:00:00', '2026-10-15 09:10:00'),
  ('CL-SEED-04', 'CL-OCT-04', 'Bluefin Capital Advisors', '+234 809 444 5566', 'deals@bluefincapital.com', 'Bluefin Capital Partners', 'VIP', '2026-09-29 14:00:00', '2026-10-12 16:00:00'),
  ('CL-SEED-05', 'CL-OCT-05', 'Alpha Legal Partners', '+234 805 555 6677', 'chambers@alphalegal.ng', 'Alpha Legal Chambers', 'Expiring Soon', '2026-09-30 08:45:00', '2026-10-12 10:00:00'),
  ('CL-SEED-06', 'CL-OCT-06', 'Kore Advisory Group', '+234 818 666 7788', 'info@koreadvisory.com', 'Kore Global Advisors', 'Expired', '2026-10-01 09:00:00', '2026-10-06 18:00:00'),
  ('CL-SEED-07', 'CL-OCT-07', 'OmniCorp Energy Solutions', '+234 807 777 8899', 'energy@omnicorp.ng', 'OmniCorp Energy Services', 'VIP', '2026-10-01 10:30:00', '2026-10-10 14:00:00'),
  ('CL-SEED-08', 'CL-OCT-08', 'Horizon Studio Tech', '+234 811 888 9900', 'tech@horizonstudio.io', 'Horizon Media & Sound', 'Active', '2026-10-02 12:00:00', '2026-10-11 15:30:00'),
  ('CL-SEED-09', 'CL-OCT-09', 'Rivtech Solutions Limited', '+234 806 999 0011', 'hello@rivtech.io', 'Rivtech Software Lab', 'Active', '2026-10-03 13:45:00', '2026-10-13 17:00:00'),
  ('CL-SEED-10', 'CL-OCT-10', 'Niger Delta Arts Collective', '+234 812 000 1122', 'collective@nigerdeltaarts.org', 'Niger Delta Cultural Foundation', 'Active', '2026-10-04 15:10:00', '2026-10-14 18:40:00')
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `phone` = VALUES(`phone`),
  `email` = VALUES(`email`),
  `company` = VALUES(`company`),
  `status` = VALUES(`status`),
  `updated_at` = NOW();

-- ----------------------------------------------------------------------------
-- 5. OPERATIONS & BOOKINGS (October 1 – 15, 2026)
-- ----------------------------------------------------------------------------
-- Total Qualifying Revenue:
--   Abuja Central Hub:           ₦229,500.00 (10 valid bookings, 1 cancelled booking of ₦10,000 excluded)
--   Port Harcourt Premier Hub:   ₦98,500.00  (9 valid bookings)
--   Company Test Total:          ₦328,000.00
INSERT INTO `bookings` (
  `id`, `booking_ref`, `date`, `start_time`, `end_time`,
  `client_id`, `client_name`, `phone`, `email`,
  `branch_id`, `branch`, `facility_id`, `facility`,
  `days_count`, `time_duration`, `amount`, `payment_method`,
  `days_used`, `days_left`, `status`, `created_by`, `created_at`, `updated_at`
)
VALUES
  -- --------------------------------------------------------------------------
  -- ABUJA CENTRAL HUB (BR-SEED-01) BOOKINGS (₦229,500.00 Qualifying)
  -- --------------------------------------------------------------------------
  -- 1. Expired 10-day booking (Oct 1 - Oct 10)
  ('BK-SEED-01', 'BK-OCT-001', '2026-10-01', '08:30:00', '17:30:00',
   'CL-SEED-01', 'Apex Innovations Ltd', '+234 803 111 2233', 'operations@apexinnovations.ng',
   'BR-SEED-01', 'Abuja Central Hub', 'FAC-SEED-01', 'Abuja Hot Desk Zone',
   10, '08:30 AM - 05:30 PM', 15000.00, 'Wire Transfer',
   10, 0, 'Expired', 'System Admin', '2026-10-01 08:30:00', '2026-10-10 18:00:00'),

  -- 2. Expired 10-day booking (Oct 5 - Oct 14)
  ('BK-SEED-02', 'BK-OCT-002', '2026-10-05', '09:00:00', '18:00:00',
   'CL-SEED-02', 'Zenith Digital Media', '+234 802 222 3344', 'contact@zenithmedia.africa',
   'BR-SEED-01', 'Abuja Central Hub', 'FAC-SEED-01', 'Abuja Hot Desk Zone',
   10, '09:00 AM - 06:00 PM', 15000.00, 'Credit Card',
   10, 0, 'Expired', 'System Admin', '2026-10-05 09:00:00', '2026-10-14 18:00:00'),

  -- 3. Active 14-day booking (Oct 10 - Oct 23), 5 days used, 9 days left
  ('BK-SEED-03', 'BK-OCT-003', '2026-10-10', '09:00:00', '17:00:00',
   'CL-SEED-03', 'Nexus Logistics International', '+234 814 333 4455', 'dispatch@nexuslogistics.com',
   'BR-SEED-01', 'Abuja Central Hub', 'FAC-SEED-01', 'Abuja Hot Desk Zone',
   14, '09:00 AM - 05:00 PM', 21000.00, 'Corporate Billing',
   5, 9, 'Active', 'System Admin', '2026-10-10 09:00:00', '2026-10-15 08:00:00'),

  -- 4. Expired 10-day dedicated desk (Oct 2 - Oct 11)
  ('BK-SEED-04', 'BK-OCT-004', '2026-10-02', '08:00:00', '18:00:00',
   'CL-SEED-04', 'Bluefin Capital Advisors', '+234 809 444 5566', 'deals@bluefincapital.com',
   'BR-SEED-01', 'Abuja Central Hub', 'FAC-SEED-02', 'Abuja Dedicated Desk Suite',
   10, '08:00 AM - 06:00 PM', 35000.00, 'Wire Transfer',
   10, 0, 'Expired', 'System Admin', '2026-10-02 08:00:00', '2026-10-11 18:00:00'),

  -- 5. Active / Expiring Soon 7-day booking (Oct 12 - Oct 18), 3 days used, 4 days left
  ('BK-SEED-05', 'BK-OCT-005', '2026-10-12', '08:30:00', '17:30:00',
   'CL-SEED-05', 'Alpha Legal Partners', '+234 805 555 6677', 'chambers@alphalegal.ng',
   'BR-SEED-01', 'Abuja Central Hub', 'FAC-SEED-02', 'Abuja Dedicated Desk Suite',
   7, '08:30 AM - 05:30 PM', 24500.00, 'POS Terminal',
   3, 4, 'Active', 'System Admin', '2026-10-12 08:30:00', '2026-10-15 08:00:00'),

  -- 6. Expired 2-day boardroom conference (Oct 4 - Oct 5)
  ('BK-SEED-06', 'BK-OCT-006', '2026-10-04', '09:00:00', '17:00:00',
   'CL-SEED-06', 'Kore Advisory Group', '+234 818 666 7788', 'info@koreadvisory.com',
   'BR-SEED-01', 'Abuja Central Hub', 'FAC-SEED-03', 'Abuja Executive Boardroom',
   2, '09:00 AM - 05:00 PM', 24000.00, 'Credit Card',
   2, 0, 'Expired', 'System Admin', '2026-10-04 09:00:00', '2026-10-05 17:00:00'),

  -- 7. Active 1-day AGM executive session (Oct 15 - Today)
  ('BK-SEED-07', 'BK-OCT-007', '2026-10-15', '09:00:00', '17:00:00',
   'CL-SEED-01', 'Apex Innovations Ltd', '+234 803 111 2233', 'operations@apexinnovations.ng',
   'BR-SEED-01', 'Abuja Central Hub', 'FAC-SEED-03', 'Abuja Executive Boardroom',
   1, '09:00 AM - 05:00 PM', 12000.00, 'Wire Transfer',
   1, 0, 'Active', 'System Admin', '2026-10-15 08:00:00', '2026-10-15 08:00:00'),

  -- 8. Expired 2-day team office intensive (Oct 1 - Oct 2)
  ('BK-SEED-08', 'BK-OCT-008', '2026-10-01', '08:00:00', '20:00:00',
   'CL-SEED-07', 'OmniCorp Energy Solutions', '+234 807 777 8899', 'energy@omnicorp.ng',
   'BR-SEED-01', 'Abuja Central Hub', 'FAC-SEED-04', 'Abuja Team Private Office',
   2, '08:00 AM - 08:00 PM', 50000.00, 'Corporate Billing',
   2, 0, 'Expired', 'System Admin', '2026-10-01 08:00:00', '2026-10-02 20:00:00'),

  -- 9. Expired 1-day team office retreat (Oct 8)
  ('BK-SEED-09', 'BK-OCT-009', '2026-10-08', '08:00:00', '18:00:00',
   'CL-SEED-04', 'Bluefin Capital Advisors', '+234 809 444 5566', 'deals@bluefincapital.com',
   'BR-SEED-01', 'Abuja Central Hub', 'FAC-SEED-04', 'Abuja Team Private Office',
   1, '08:00 AM - 06:00 PM', 25000.00, 'Wire Transfer',
   1, 0, 'Expired', 'System Admin', '2026-10-08 08:00:00', '2026-10-08 18:00:00'),

  -- 10. Active 1-day Podcast Media session (Oct 14)
  ('BK-SEED-10', 'BK-OCT-010', '2026-10-14', '10:00:00', '18:00:00',
   'CL-SEED-02', 'Zenith Digital Media', '+234 802 222 3344', 'contact@zenithmedia.africa',
   'BR-SEED-01', 'Abuja Central Hub', 'FAC-SEED-05', 'Abuja Podcast & Media Studio',
   1, '10:00 AM - 06:00 PM', 8000.00, 'Cash',
   1, 0, 'Active', 'System Admin', '2026-10-14 10:00:00', '2026-10-14 18:00:00'),

  -- 11. CANCELLED booking: Specifically tests that cancelled records are excluded from qualifying lifetime revenue & reports
  ('BK-SEED-11', 'BK-OCT-011', '2026-10-11', '12:00:00', '16:00:00',
   'CL-SEED-08', 'Horizon Studio Tech', '+234 811 888 9900', 'tech@horizonstudio.io',
   'BR-SEED-01', 'Abuja Central Hub', 'FAC-SEED-05', 'Abuja Podcast & Media Studio',
   1, '12:00 PM - 04:00 PM', 10000.00, 'Credit Card',
   0, 1, 'Cancelled', 'System Admin', '2026-10-11 09:00:00', '2026-10-11 11:00:00'),

  -- --------------------------------------------------------------------------
  -- PORT HARCOURT PREMIER HUB (BR-SEED-02) BOOKINGS (₦98,500.00 Qualifying)
  -- --------------------------------------------------------------------------
  -- 12. Expired 5-day creative desk pass (Oct 3 - Oct 7)
  ('BK-SEED-12', 'BK-OCT-012', '2026-10-03', '09:00:00', '18:00:00',
   'CL-SEED-09', 'Rivtech Solutions Limited', '+234 806 999 0011', 'hello@rivtech.io',
   'BR-SEED-02', 'Port Harcourt Premier Hub', 'FAC-SEED-06', 'PHC Creative Coworking Space',
   5, '09:00 AM - 06:00 PM', 6000.00, 'Cash',
   5, 0, 'Expired', 'System Admin', '2026-10-03 09:00:00', '2026-10-07 18:00:00'),

  -- 13. Expired 5-day creative desk pass (Oct 9 - Oct 13)
  ('BK-SEED-13', 'BK-OCT-013', '2026-10-09', '09:00:00', '18:00:00',
   'CL-SEED-10', 'Niger Delta Arts Collective', '+234 812 000 1122', 'collective@nigerdeltaarts.org',
   'BR-SEED-02', 'Port Harcourt Premier Hub', 'FAC-SEED-06', 'PHC Creative Coworking Space',
   5, '09:00 AM - 06:00 PM', 6000.00, 'Credit Card',
   5, 0, 'Expired', 'System Admin', '2026-10-09 09:00:00', '2026-10-13 18:00:00'),

  -- 14. Active 10-day desk pass (Oct 13 - Oct 22), 2 days used, 8 days left
  ('BK-SEED-14', 'BK-OCT-014', '2026-10-13', '09:00:00', '18:00:00',
   'CL-SEED-09', 'Rivtech Solutions Limited', '+234 806 999 0011', 'hello@rivtech.io',
   'BR-SEED-02', 'Port Harcourt Premier Hub', 'FAC-SEED-06', 'PHC Creative Coworking Space',
   10, '09:00 AM - 06:00 PM', 12000.00, 'Wire Transfer',
   2, 8, 'Active', 'System Admin', '2026-10-13 09:00:00', '2026-10-15 08:00:00'),

  -- 15. Expired 2-day corporate meeting booking (Oct 6 - Oct 7)
  ('BK-SEED-15', 'BK-OCT-015', '2026-10-06', '09:00:00', '17:00:00',
   'CL-SEED-07', 'OmniCorp Energy Solutions', '+234 807 777 8899', 'energy@omnicorp.ng',
   'BR-SEED-02', 'Port Harcourt Premier Hub', 'FAC-SEED-07', 'PHC Corporate Meeting Room',
   2, '09:00 AM - 05:00 PM', 13000.00, 'Corporate Billing',
   2, 0, 'Expired', 'System Admin', '2026-10-06 09:00:00', '2026-10-07 17:00:00'),

  -- 16. Active 1-day corporate board session (Oct 15 - Today)
  ('BK-SEED-16', 'BK-OCT-016', '2026-10-15', '10:00:00', '16:00:00',
   'CL-SEED-03', 'Nexus Logistics International', '+234 814 333 4455', 'dispatch@nexuslogistics.com',
   'BR-SEED-02', 'Port Harcourt Premier Hub', 'FAC-SEED-07', 'PHC Corporate Meeting Room',
   1, '10:00 AM - 04:00 PM', 6500.00, 'POS Terminal',
   1, 0, 'Active', 'System Admin', '2026-10-15 10:00:00', '2026-10-15 16:00:00'),

  -- 17. Expired 1-day executive confidential consultation (Oct 4)
  ('BK-SEED-17', 'BK-OCT-017', '2026-10-04', '08:00:00', '18:00:00',
   'CL-SEED-05', 'Alpha Legal Partners', '+234 805 555 6677', 'chambers@alphalegal.ng',
   'BR-SEED-02', 'Port Harcourt Premier Hub', 'FAC-SEED-08', 'PHC Private Executive Suite',
   1, '08:00 AM - 06:00 PM', 18000.00, 'Wire Transfer',
   1, 0, 'Expired', 'System Admin', '2026-10-04 08:00:00', '2026-10-04 18:00:00'),

  -- 18. Expired 1-day regional workshop seminar (Oct 11)
  ('BK-SEED-18', 'BK-OCT-018', '2026-10-11', '08:30:00', '17:30:00',
   'CL-SEED-08', 'Horizon Studio Tech', '+234 811 888 9900', 'tech@horizonstudio.io',
   'BR-SEED-02', 'Port Harcourt Premier Hub', 'FAC-SEED-09', 'PHC Training & Workshop Hall',
   1, '08:30 AM - 05:30 PM', 22000.00, 'Credit Card',
   1, 0, 'Expired', 'System Admin', '2026-10-11 08:30:00', '2026-10-11 17:30:00'),

  -- 19. Expired 1-day sound recording (Oct 7)
  ('BK-SEED-19', 'BK-OCT-019', '2026-10-07', '11:00:00', '19:00:00',
   'CL-SEED-10', 'Niger Delta Arts Collective', '+234 812 000 1122', 'collective@nigerdeltaarts.org',
   'BR-SEED-02', 'Port Harcourt Premier Hub', 'FAC-SEED-10', 'PHC Sound Stage & Audio Booth',
   1, '11:00 AM - 07:00 PM', 7500.00, 'Cash',
   1, 0, 'Expired', 'System Admin', '2026-10-07 11:00:00', '2026-10-07 19:00:00'),

  -- 20. Active 1-day sound booth session (Oct 14)
  ('BK-SEED-20', 'BK-OCT-020', '2026-10-14', '09:00:00', '17:00:00',
   'CL-SEED-02', 'Zenith Digital Media', '+234 802 222 3344', 'contact@zenithmedia.africa',
   'BR-SEED-02', 'Port Harcourt Premier Hub', 'FAC-SEED-10', 'PHC Sound Stage & Audio Booth',
   1, '09:00 AM - 05:00 PM', 7500.00, 'POS Terminal',
   1, 0, 'Active', 'System Admin', '2026-10-14 09:00:00', '2026-10-14 17:00:00')
ON DUPLICATE KEY UPDATE
  `date` = VALUES(`date`),
  `client_id` = VALUES(`client_id`),
  `client_name` = VALUES(`client_name`),
  `branch_id` = VALUES(`branch_id`),
  `branch` = VALUES(`branch`),
  `facility_id` = VALUES(`facility_id`),
  `facility` = VALUES(`facility`),
  `days_count` = VALUES(`days_count`),
  `amount` = VALUES(`amount`),
  `payment_method` = VALUES(`payment_method`),
  `days_used` = VALUES(`days_used`),
  `days_left` = VALUES(`days_left`),
  `status` = VALUES(`status`),
  `updated_at` = NOW();

-- ----------------------------------------------------------------------------
-- 6. BOOKING ITEMS (Line Items for Financial Auditability)
-- ----------------------------------------------------------------------------
INSERT INTO `booking_items` (`id`, `booking_id`, `item_name`, `unit_price`, `quantity`, `total_price`)
VALUES
  (9001, 'BK-SEED-01', 'Abuja Hot Desk Pass (10 Days)', 1500.00, 10, 15000.00),
  (9002, 'BK-SEED-02', 'Abuja Hot Desk Pass (10 Days)', 1500.00, 10, 15000.00),
  (9003, 'BK-SEED-03', 'Abuja Hot Desk Pass (14 Days)', 1500.00, 14, 21000.00),
  (9004, 'BK-SEED-04', 'Abuja Dedicated Desk Pass (10 Days)', 3500.00, 10, 35000.00),
  (9005, 'BK-SEED-05', 'Abuja Dedicated Desk Pass (7 Days)', 3500.00, 7, 24500.00),
  (9006, 'BK-SEED-06', 'Abuja Executive Boardroom Booking (2 Days)', 12000.00, 2, 24000.00),
  (9007, 'BK-SEED-07', 'Abuja Executive Boardroom Booking (1 Day)', 12000.00, 1, 12000.00),
  (9008, 'BK-SEED-08', 'Abuja Team Private Office Suite (2 Days)', 25000.00, 2, 50000.00),
  (9009, 'BK-SEED-09', 'Abuja Team Private Office Suite (1 Day)', 25000.00, 1, 25000.00),
  (9010, 'BK-SEED-10', 'Abuja Podcast & Media Studio (1 Day)', 8000.00, 1, 8000.00),
  (9011, 'BK-SEED-11', 'Abuja Podcast Studio Booking (Cancelled)', 10000.00, 1, 10000.00),
  (9012, 'BK-SEED-12', 'PHC Creative Coworking Pass (5 Days)', 1200.00, 5, 6000.00),
  (9013, 'BK-SEED-13', 'PHC Creative Coworking Pass (5 Days)', 1200.00, 5, 6000.00),
  (9014, 'BK-SEED-14', 'PHC Creative Coworking Pass (10 Days)', 1200.00, 10, 12000.00),
  (9015, 'BK-SEED-15', 'PHC Corporate Meeting Room (2 Days)', 6500.00, 2, 13000.00),
  (9016, 'BK-SEED-16', 'PHC Corporate Meeting Room (1 Day)', 6500.00, 1, 6500.00),
  (9017, 'BK-SEED-17', 'PHC Private Executive Suite (1 Day)', 18000.00, 1, 18000.00),
  (9018, 'BK-SEED-18', 'PHC Training & Workshop Hall (1 Day)', 22000.00, 1, 22000.00),
  (9019, 'BK-SEED-19', 'PHC Sound Stage & Audio Booth (1 Day)', 7500.00, 1, 7500.00),
  (9020, 'BK-SEED-20', 'PHC Sound Stage & Audio Booth (1 Day)', 7500.00, 1, 7500.00)
ON DUPLICATE KEY UPDATE
  `item_name` = VALUES(`item_name`),
  `unit_price` = VALUES(`unit_price`),
  `quantity` = VALUES(`quantity`),
  `total_price` = VALUES(`total_price`);

-- ----------------------------------------------------------------------------
-- 7. SUBSCRIPTIONS (For CRM Active / Expiring / Expired Subscriptions Verification)
-- ----------------------------------------------------------------------------
INSERT INTO `subscriptions` (
  `id`, `booking_id`, `client_id`,
  `facility_id`, `facility_name`, `branch_id`, `branch_name`,
  `start_date`, `end_date`, `days_count`, `days_used`, `days_remaining`,
  `amount`, `payment_method`, `status`, `created_at`, `updated_at`
)
VALUES
  ('SUB-SEED-01', 'BK-SEED-01', 'CL-SEED-01', 'FAC-SEED-01', 'Abuja Hot Desk Zone', 'BR-SEED-01', 'Abuja Central Hub', '2026-10-01', '2026-10-10', 10, 10, 0, 15000.00, 'Wire Transfer', 'Expired', '2026-10-01 08:30:00', '2026-10-10 18:00:00'),
  ('SUB-SEED-02', 'BK-SEED-02', 'CL-SEED-02', 'FAC-SEED-01', 'Abuja Hot Desk Zone', 'BR-SEED-01', 'Abuja Central Hub', '2026-10-05', '2026-10-14', 10, 10, 0, 15000.00, 'Credit Card', 'Expired', '2026-10-05 09:00:00', '2026-10-14 18:00:00'),
  ('SUB-SEED-03', 'BK-SEED-03', 'CL-SEED-03', 'FAC-SEED-01', 'Abuja Hot Desk Zone', 'BR-SEED-01', 'Abuja Central Hub', '2026-10-10', '2026-10-23', 14, 5, 9, 21000.00, 'Corporate Billing', 'Active', '2026-10-10 09:00:00', '2026-10-15 08:00:00'),
  ('SUB-SEED-04', 'BK-SEED-04', 'CL-SEED-04', 'FAC-SEED-02', 'Abuja Dedicated Desk Suite', 'BR-SEED-01', 'Abuja Central Hub', '2026-10-02', '2026-10-11', 10, 10, 0, 35000.00, 'Wire Transfer', 'Expired', '2026-10-02 08:00:00', '2026-10-11 18:00:00'),
  ('SUB-SEED-05', 'BK-SEED-05', 'CL-SEED-05', 'FAC-SEED-02', 'Abuja Dedicated Desk Suite', 'BR-SEED-01', 'Abuja Central Hub', '2026-10-12', '2026-10-18', 7, 3, 4, 24500.00, 'POS Terminal', 'Expiring Soon', '2026-10-12 08:30:00', '2026-10-15 08:00:00'),
  ('SUB-SEED-06', 'BK-SEED-12', 'CL-SEED-09', 'FAC-SEED-06', 'PHC Creative Coworking Space', 'BR-SEED-02', 'Port Harcourt Premier Hub', '2026-10-03', '2026-10-07', 5, 5, 0, 6000.00, 'Cash', 'Expired', '2026-10-03 09:00:00', '2026-10-07 18:00:00'),
  ('SUB-SEED-07', 'BK-SEED-13', 'CL-SEED-10', 'FAC-SEED-06', 'PHC Creative Coworking Space', 'BR-SEED-02', 'Port Harcourt Premier Hub', '2026-10-09', '2026-10-13', 5, 5, 0, 6000.00, 'Credit Card', 'Expired', '2026-10-09 09:00:00', '2026-10-13 18:00:00'),
  ('SUB-SEED-08', 'BK-SEED-14', 'CL-SEED-09', 'FAC-SEED-06', 'PHC Creative Coworking Space', 'BR-SEED-02', 'Port Harcourt Premier Hub', '2026-10-13', '2026-10-22', 10, 2, 8, 12000.00, 'Wire Transfer', 'Active', '2026-10-13 09:00:00', '2026-10-15 08:00:00')
ON DUPLICATE KEY UPDATE
  `start_date` = VALUES(`start_date`),
  `end_date` = VALUES(`end_date`),
  `days_used` = VALUES(`days_used`),
  `days_remaining` = VALUES(`days_remaining`),
  `status` = VALUES(`status`),
  `updated_at` = NOW();

-- ----------------------------------------------------------------------------
-- 8. FINANCE & EXPENSES (October 1 – 15, 2026)
-- ----------------------------------------------------------------------------
-- Total Expenses Structure:
--   Abuja Direct Expenses:             ₦88,500.00 (6 items)
--   Port Harcourt Direct Expenses:     ₦145,000.00 (6 items, intentionally higher to test loss-making scenario)
--   Shared Across Both Branches:       ₦40,000.00 (2 items - allocated ₦20,000 each in single-branch mode)
--   Reconciliation:
--     Abuja Allocated Total:           ₦88,500 + ₦20,000 = ₦108,500.00
--     Port Harcourt Allocated Total:   ₦145,000 + ₦20,000 = ₦165,000.00
--     Company-wide Combined:           ₦88,500 + ₦145,000 + ₦40,000 = ₦273,500.00 (No duplication!)
INSERT INTO `expenses` (
  `id`, `expense_ref`, `name`, `amount`, `date`,
  `branch_id`, `branch`, `category_id`, `category`,
  `description`, `status`, `created_by`, `created_at`, `updated_at`
)
VALUES
  -- ABUJA CENTRAL HUB DIRECT EXPENSES (₦88,500.00)
  ('EXP-SEED-01', 'EXP-OCT-001', 'Dedicated Primary Fiber Optic Bandwidth', 18000.00, '2026-10-02',
   'BR-SEED-01', 'Abuja Central Hub', 'CAT-002', 'Internet & Bandwidth',
   'Monthly 100Mbps 1:1 dedicated commercial ISP fiber subscription for Abuja CBD hub.', 'Paid', 'System Admin', '2026-10-02 09:15:00', '2026-10-02 09:15:00'),

  ('EXP-SEED-02', 'EXP-OCT-002', 'Workstation Sanitization & Janitorial Supplies', 9500.00, '2026-10-04',
   'BR-SEED-01', 'Abuja Central Hub', 'CAT-004', 'Janitorial & Cleaning',
   'Restroom consumables, eco-friendly surface disinfectants, and paper towel replenishments.', 'Paid', 'System Admin', '2026-10-04 11:00:00', '2026-10-04 11:00:00'),

  ('EXP-SEED-03', 'EXP-OCT-003', 'Commercial Electricity Grid Energy Token', 28000.00, '2026-10-07',
   'BR-SEED-01', 'Abuja Central Hub', 'CAT-001', 'Utilities',
   'Prepaid commercial 3-phase grid electricity meter top-up for Abuja Central Hub facility.', 'Paid', 'System Admin', '2026-10-07 14:00:00', '2026-10-07 14:00:00'),

  ('EXP-SEED-04', 'EXP-OCT-004', 'VRF Chiller & HVAC Multi-Split Servicing', 16500.00, '2026-10-10',
   'BR-SEED-01', 'Abuja Central Hub', 'CAT-003', 'Facility Maintenance',
   'Scheduled bi-weekly filter cleaning, refrigerant gas level check, and thermostat calibration.', 'Paid', 'System Admin', '2026-10-10 10:30:00', '2026-10-10 10:30:00'),

  ('EXP-SEED-05', 'EXP-OCT-005', 'Visitor Badges & Executive A4 Stationery', 12000.00, '2026-10-12',
   'BR-SEED-01', 'Abuja Central Hub', 'EC-SEED-02', 'Office Supplies & Stationery',
   'Branded NFC visitor entry passes, printer toner cartridges, and meeting notepad packs.', 'Paid', 'System Admin', '2026-10-12 13:00:00', '2026-10-12 13:00:00'),

  ('EXP-SEED-06', 'EXP-OCT-006', 'Daily Hygiene Restock & Kitchen Provisions', 4500.00, '2026-10-15',
   'BR-SEED-01', 'Abuja Central Hub', 'CAT-004', 'Janitorial & Cleaning',
   'Daily fresh coffee beans, tea pods, water dispenser refills, and cleaning supplies (October 15).', 'Paid', 'System Admin', '2026-10-15 08:30:00', '2026-10-15 08:30:00'),

  -- PORT HARCOURT PREMIER HUB DIRECT EXPENSES (₦145,000.00 - Loss-Making Test Scenario)
  ('EXP-SEED-07', 'EXP-OCT-007', '250kVA Prime Generator Low-Pour Fuel Oil', 52000.00, '2026-10-01',
   'BR-SEED-02', 'Port Harcourt Premier Hub', 'CAT-001', 'Utilities',
   '2,000 Litres of low-pour fuel oil (automotive gas oil) for continuous heavy generator run.', 'Paid', 'System Admin', '2026-10-01 07:45:00', '2026-10-01 07:45:00'),

  ('EXP-SEED-08', 'EXP-OCT-008', 'Caterpillar Generator Overhaul & Alternator Rewind', 38000.00, '2026-10-03',
   'BR-SEED-02', 'Port Harcourt Premier Hub', 'CAT-003', 'Facility Maintenance',
   'Emergency alternator rewinding, oil filter change, and automated transfer switch replacement.', 'Paid', 'System Admin', '2026-10-03 12:00:00', '2026-10-03 12:00:00'),

  ('EXP-SEED-09', 'EXP-OCT-009', 'Redundant Microwave Wireless Link Installation', 19500.00, '2026-10-06',
   'BR-SEED-02', 'Port Harcourt Premier Hub', 'CAT-002', 'Internet & Bandwidth',
   'Secondary failover point-to-point microwave wireless radio link setup and antenna alignment.', 'Paid', 'System Admin', '2026-10-06 15:20:00', '2026-10-06 15:20:00'),

  ('EXP-SEED-10', 'EXP-OCT-010', 'Turnstile Optical Sensor & Perimeter Guarding', 15000.00, '2026-10-08',
   'BR-SEED-02', 'Port Harcourt Premier Hub', 'EC-SEED-03', 'Security & Access Control',
   'Replacement infrared safety sensors for automated glass turnstiles and security uniform allowance.', 'Paid', 'System Admin', '2026-10-08 09:00:00', '2026-10-08 09:00:00'),

  ('EXP-SEED-11', 'EXP-OCT-011', 'Industrial Carpet Extraction & HVAC Disinfection', 14000.00, '2026-10-11',
   'BR-SEED-02', 'Port Harcourt Premier Hub', 'CAT-004', 'Janitorial & Cleaning',
   'Deep steam extraction for all training hall and coworking floor carpets following rainy spell.', 'Paid', 'System Admin', '2026-10-11 11:30:00', '2026-10-11 11:30:00'),

  ('EXP-SEED-12', 'EXP-OCT-012', 'Industrial Borehole Water Filtration Chemicals', 6500.00, '2026-10-15',
   'BR-SEED-02', 'Port Harcourt Premier Hub', 'CAT-001', 'Utilities',
   'Sediment filter media, chlorination treatment tablets, and raw water booster pump maintenance (October 15).', 'Paid', 'System Admin', '2026-10-15 09:00:00', '2026-10-15 09:00:00'),

  -- SHARED ACROSS BOTH BRANCHES (₦40,000.00 Total - Split 50% each when filtered by branch)
  ('EXP-SEED-13', 'EXP-OCT-013', 'Multi-Tenant Cloud ERP & Database Infrastructure', 24000.00, '2026-10-05',
   NULL, 'Both Branches', 'CAT-005', 'Software & Cloud',
   'High-availability managed cloud hosting, automated database snapshot backups, and SSL wildcard certs.', 'Paid', 'System Admin', '2026-10-05 10:00:00', '2026-10-05 10:00:00'),

  ('EXP-SEED-14', 'EXP-OCT-014', 'National Corporate Search & Workspace Ads Campaign', 16000.00, '2026-10-09',
   NULL, 'Both Branches', 'EC-SEED-01', 'Marketing & Advertising',
   'Joint digital search advertising driving corporate client acquisitions for both Abuja and PHC hubs.', 'Paid', 'System Admin', '2026-10-09 14:00:00', '2026-10-09 14:00:00')
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `amount` = VALUES(`amount`),
  `date` = VALUES(`date`),
  `branch_id` = VALUES(`branch_id`),
  `branch` = VALUES(`branch`),
  `category_id` = VALUES(`category_id`),
  `category` = VALUES(`category`),
  `description` = VALUES(`description`),
  `status` = VALUES(`status`),
  `updated_at` = NOW();

-- ----------------------------------------------------------------------------
-- 9. PAYMENTS (Audit Trail Reconciling All Qualifying Bookings)
-- ----------------------------------------------------------------------------
INSERT INTO `payments` (`id`, `reference`, `booking_id`, `client_id`, `amount`, `payment_method`, `payment_date`, `status`, `created_at`)
VALUES
  ('PAY-SEED-01', 'REF-SEED-2026-OCT-01', 'BK-SEED-01', 'CL-SEED-01', 15000.00, 'Wire Transfer', '2026-10-01', 'Completed', '2026-10-01 08:30:00'),
  ('PAY-SEED-02', 'REF-SEED-2026-OCT-02', 'BK-SEED-02', 'CL-SEED-02', 15000.00, 'Credit Card', '2026-10-05', 'Completed', '2026-10-05 09:00:00'),
  ('PAY-SEED-03', 'REF-SEED-2026-OCT-03', 'BK-SEED-03', 'CL-SEED-03', 21000.00, 'Corporate Billing', '2026-10-10', 'Completed', '2026-10-10 09:00:00'),
  ('PAY-SEED-04', 'REF-SEED-2026-OCT-04', 'BK-SEED-04', 'CL-SEED-04', 35000.00, 'Wire Transfer', '2026-10-02', 'Completed', '2026-10-02 08:00:00'),
  ('PAY-SEED-05', 'REF-SEED-2026-OCT-05', 'BK-SEED-05', 'CL-SEED-05', 24500.00, 'POS Terminal', '2026-10-12', 'Completed', '2026-10-12 08:30:00'),
  ('PAY-SEED-06', 'REF-SEED-2026-OCT-06', 'BK-SEED-06', 'CL-SEED-06', 24000.00, 'Credit Card', '2026-10-04', 'Completed', '2026-10-04 09:00:00'),
  ('PAY-SEED-07', 'REF-SEED-2026-OCT-07', 'BK-SEED-07', 'CL-SEED-01', 12000.00, 'Wire Transfer', '2026-10-15', 'Completed', '2026-10-15 08:00:00'),
  ('PAY-SEED-08', 'REF-SEED-2026-OCT-08', 'BK-SEED-08', 'CL-SEED-07', 50000.00, 'Corporate Billing', '2026-10-01', 'Completed', '2026-10-01 08:00:00'),
  ('PAY-SEED-09', 'REF-SEED-2026-OCT-09', 'BK-SEED-09', 'CL-SEED-04', 25000.00, 'Wire Transfer', '2026-10-08', 'Completed', '2026-10-08 08:00:00'),
  ('PAY-SEED-10', 'REF-SEED-2026-OCT-10', 'BK-SEED-10', 'CL-SEED-02', 8000.00, 'Cash', '2026-10-14', 'Completed', '2026-10-14 10:00:00'),
  ('PAY-SEED-11', 'REF-SEED-2026-OCT-12', 'BK-SEED-12', 'CL-SEED-09', 6000.00, 'Cash', '2026-10-03', 'Completed', '2026-10-03 09:00:00'),
  ('PAY-SEED-12', 'REF-SEED-2026-OCT-13', 'BK-SEED-13', 'CL-SEED-10', 6000.00, 'Credit Card', '2026-10-09', 'Completed', '2026-10-09 09:00:00'),
  ('PAY-SEED-13', 'REF-SEED-2026-OCT-14', 'BK-SEED-14', 'CL-SEED-09', 12000.00, 'Wire Transfer', '2026-10-13', 'Completed', '2026-10-13 09:00:00'),
  ('PAY-SEED-14', 'REF-SEED-2026-OCT-15', 'BK-SEED-15', 'CL-SEED-07', 13000.00, 'Corporate Billing', '2026-10-06', 'Completed', '2026-10-06 09:00:00'),
  ('PAY-SEED-15', 'REF-SEED-2026-OCT-16', 'BK-SEED-16', 'CL-SEED-03', 6500.00, 'POS Terminal', '2026-10-15', 'Completed', '2026-10-15 10:00:00'),
  ('PAY-SEED-16', 'REF-SEED-2026-OCT-17', 'BK-SEED-17', 'CL-SEED-05', 18000.00, 'Wire Transfer', '2026-10-04', 'Completed', '2026-10-04 08:00:00'),
  ('PAY-SEED-17', 'REF-SEED-2026-OCT-18', 'BK-SEED-18', 'CL-SEED-08', 22000.00, 'Credit Card', '2026-10-11', 'Completed', '2026-10-11 08:30:00'),
  ('PAY-SEED-18', 'REF-SEED-2026-OCT-19', 'BK-SEED-19', 'CL-SEED-10', 7500.00, 'Cash', '2026-10-07', 'Completed', '2026-10-07 11:00:00'),
  ('PAY-SEED-19', 'REF-SEED-2026-OCT-20', 'BK-SEED-20', 'CL-SEED-02', 7500.00, 'POS Terminal', '2026-10-14', 'Completed', '2026-10-14 09:00:00')
ON DUPLICATE KEY UPDATE
  `amount` = VALUES(`amount`),
  `payment_method` = VALUES(`payment_method`),
  `status` = VALUES(`status`);

COMMIT;
