-- Migration: Add phone, hon_id, department columns to users table
-- Run in Supabase SQL Editor

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hon_id text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department text;

-- Populate sample data
UPDATE public.users SET phone = '+1 (602) 555-0147', hon_id = 'HON-2024-0891', department = 'IT Administration' WHERE id = 'user-admin';
UPDATE public.users SET phone = '+1 (312) 555-0234', hon_id = 'HON-2024-1456', department = 'Procurement' WHERE id = 'user-buyer';
UPDATE public.users SET phone = '+1 (415) 555-0389', hon_id = 'HON-2024-2103', department = 'Operations' WHERE id = 'user-viewer';
