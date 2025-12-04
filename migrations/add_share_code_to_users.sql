-- Migration: Add share_code column to users table
ALTER TABLE users ADD COLUMN share_code TEXT;

-- Add index for better performance when searching by share code
CREATE INDEX idx_users_share_code ON users(share_code);