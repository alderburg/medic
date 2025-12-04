-- Migration: Add weight and whatsapp fields to users table
-- Date: 2025-07-05

ALTER TABLE users 
ADD COLUMN weight REAL,
ADD COLUMN whatsapp VARCHAR(20);