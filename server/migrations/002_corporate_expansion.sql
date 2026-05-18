-- =============================================
-- AIMS Corporate Tech Expansion Schema
-- =============================================

USE aims_db;

-- 1. SaaS & Cloud License Tracking Table
CREATE TABLE IF NOT EXISTS saas_licenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50),
  total_seats INT NOT NULL,
  occupied_seats INT NOT NULL,
  cost_per_seat DECIMAL(10,2) NOT NULL,
  renewal_date DATE NOT NULL,
  active_warnings VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Add signature support to Allocations
ALTER TABLE allocations 
  ADD COLUMN custody_signature LONGTEXT NULL,
  ADD COLUMN signed_at TIMESTAMP NULL;

-- 3. Add MDM sync timestamp to Assets
ALTER TABLE assets
  ADD COLUMN mdm_synchronized_at TIMESTAMP NULL;

-- Seed initial corporate SaaS licenses
INSERT IGNORE INTO saas_licenses (name, category, total_seats, occupied_seats, cost_per_seat, renewal_date, active_warnings) VALUES
  ('GitHub Enterprise', 'Development', 150, 142, 21.00, '2026-11-15', '5 seats are inactive for >30 days'),
  ('AWS Cloud Infrastructure', 'Hosting & Database', 200, 185, 45.50, '2026-08-20', NULL),
  ('Slack Premium Chat', 'Communication', 180, 178, 8.75, '2026-12-01', NULL),
  ('Figma Organization', 'Design', 40, 39, 45.00, '2026-09-10', '1 seat assigned to external contractor'),
  ('Zoom Pro Meet', 'Communication', 100, 48, 15.99, '2026-07-05', '52 under-utilized licenses (reducing cloud waste)');
