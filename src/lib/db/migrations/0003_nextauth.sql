-- Migration: NextAuth.js Integration
-- Remove Clerk, add NextAuth support

-- 1. Alter users table
-- Add new columns
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" varchar(255);

-- Rename image_url to image (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'image_url') THEN
        ALTER TABLE "users" RENAME COLUMN "image_url" TO "image";
    END IF;
END $$;

-- Drop clerk_id if exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'clerk_id') THEN
        ALTER TABLE "users" DROP COLUMN "clerk_id";
    END IF;
END $$;

-- 2. Create accounts table for OAuth providers
CREATE TABLE IF NOT EXISTS "accounts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "type" varchar(255) NOT NULL,
    "provider" varchar(255) NOT NULL,
    "provider_account_id" varchar(255) NOT NULL,
    "refresh_token" text,
    "access_token" text,
    "expires_at" integer,
    "token_type" varchar(255),
    "scope" varchar(255),
    "id_token" text,
    "session_state" varchar(255)
);

-- Create index on accounts
CREATE INDEX IF NOT EXISTS "account_provider_idx" ON "accounts" ("provider", "provider_account_id");

-- 3. Create sessions table
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "session_token" varchar(255) NOT NULL UNIQUE,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "expires" timestamp NOT NULL
);

-- Create index on sessions
CREATE INDEX IF NOT EXISTS "session_user_idx" ON "sessions" ("user_id");

-- 4. Create verification_tokens table
CREATE TABLE IF NOT EXISTS "verification_tokens" (
    "identifier" varchar(255) NOT NULL,
    "token" varchar(255) NOT NULL UNIQUE,
    "expires" timestamp NOT NULL
);

-- Create index on verification_tokens
CREATE INDEX IF NOT EXISTS "verification_token_idx" ON "verification_tokens" ("identifier", "token");
