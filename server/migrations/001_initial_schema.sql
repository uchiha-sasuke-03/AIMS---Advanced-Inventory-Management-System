-- =============================================
-- AIMS Database Schema Migration
-- Employee Inventory Management System
-- =============================================

CREATE DATABASE IF NOT EXISTS aims_db;
USE aims_db;

-- Users / Employees table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  emp_id VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  age INT,
  salary DECIMAL(12,2),
  email VARCHAR(150) NOT NULL UNIQUE,
  department VARCHAR(100),
  designation VARCHAR(150) DEFAULT 'Associate',
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'employee') DEFAULT 'employee',
  photo_path VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_department (department),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Asset Categories
CREATE TABLE IF NOT EXISTS asset_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Assets
CREATE TABLE IF NOT EXISTS assets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  model VARCHAR(150),
  serial_number VARCHAR(100) NOT NULL UNIQUE,
  purchase_date DATE,
  price DECIMAL(12,2),
  status ENUM('in_stock', 'allocated', 'damaged', 'retired') DEFAULT 'in_stock',
  location VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES asset_categories(id) ON DELETE RESTRICT,
  INDEX idx_assets_status (status),
  INDEX idx_assets_location (location),
  INDEX idx_assets_category (category_id),
  INDEX idx_assets_serial (serial_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Allocations (event-sourced)
CREATE TABLE IF NOT EXISTS allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_id INT NOT NULL,
  user_id INT NOT NULL,
  allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  allocated_by INT,
  expected_return_date DATE,
  returned_at TIMESTAMP NULL DEFAULT NULL,
  condition_on_return VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (allocated_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_allocations_asset (asset_id),
  INDEX idx_allocations_user (user_id),
  INDEX idx_allocations_active (asset_id, returned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Damage Reports (event-sourced)
CREATE TABLE IF NOT EXISTS damage_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_id INT NOT NULL,
  reported_by INT NOT NULL,
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT NOT NULL,
  photo_path VARCHAR(500),
  severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolution_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
  FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_damage_asset (asset_id),
  INDEX idx_damage_severity (severity),
  INDEX idx_damage_resolved (resolved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
