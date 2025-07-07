DROP TABLE IF EXISTS "messages";
DROP TABLE IF EXISTS "contacts_to_groups";
DROP TABLE IF EXISTS "contacts";
DROP TABLE IF EXISTS "contact_groups";
DROP TABLE IF EXISTS "templates";
DROP TABLE IF EXISTS "campaigns";
DROP TABLE IF EXISTS "bulk_sms_jobs";
DROP TABLE IF EXISTS "sender_ids";
DROP TABLE IF EXISTS "users";
DROP TABLE IF EXISTS "campaign_groups";

-- Drop custom types if they exist
DROP TYPE IF EXISTS "user_role";
DROP TYPE IF EXISTS "sender_id_status";
DROP TYPE IF EXISTS "message_status";
DROP TYPE IF EXISTS "campaign_status";
DROP TYPE IF EXISTS "group_status";
DROP TYPE IF EXISTS "template_status";

-- Create custom ENUM types for status fields
CREATE TYPE "user_role" AS ENUM ('admin', 'client');
CREATE TYPE "sender_id_status" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "message_status" AS ENUM ('queued', 'scheduled', 'retrying', 'sent', 'failed', 'delivered', 'pending');
CREATE TYPE "campaign_status" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'COMPLETED');
CREATE TYPE "group_status" AS ENUM ('active', 'inactive');
CREATE TYPE "template_status" AS ENUM ('pending', 'approved', 'rejected');

-- Create users table
CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "password" TEXT NOT NULL,
  "role" user_role NOT NULL,
  "country" TEXT[],
  "rate" NUMERIC DEFAULT 0,
  "balance" NUMERIC DEFAULT 0,
  "status" VARCHAR(20) DEFAULT 'active',
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create sender_ids table
CREATE TABLE "sender_ids" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(11) NOT NULL,
  "status" sender_id_status NOT NULL DEFAULT 'pending',
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "purpose" TEXT,
  "rejection_reason" TEXT,
  "approved_at" TIMESTAMPTZ
);

-- Create campaigns table
CREATE TABLE "campaigns" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "scheduled_at" TIMESTAMPTZ,
  "sent_at" TIMESTAMPTZ,
  "status" campaign_status NOT NULL DEFAULT 'draft',
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "message" TEXT,
  "sender_id" VARCHAR(50),
  "sent" INT DEFAULT 0,
  "delivered" INT DEFAULT 0,
  "failed" INT DEFAULT 0
);

-- Create bulk_sms_jobs table
CREATE TABLE "bulk_sms_jobs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "sender_id" VARCHAR(50) NOT NULL,
  "message" TEXT NOT NULL,
  "schedule_at" TIMESTAMPTZ,
  "status" message_status NOT NULL DEFAULT 'queued',
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE "messages" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    scheduled_at TIMESTAMPTZ,
    status message_status NOT NULL DEFAULT 'queued',
    sender_id TYPE TEXT,
    job_id UUID REFERENCES bulk_sms_jobs(id) ON DELETE SET NULL,
    group_id UUID REFERENCES contact_groups(id) ON DELETE SET NULL,
    recipient VARCHAR(255),
    vendor VARCHAR(100),
    retry_count INT DEFAULT 0,
    delivery_rate NUMERIC(5,2) DEFAULT 0,
    delivered_at TIMESTAMPTZ,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create templates table
CREATE TABLE "templates" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status template_status NOT NULL DEFAULT 'pending',
    content TEXT NOT NULL,
    tags TEXT[],
    type VARCHAR(50),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create contacts table
CREATE TABLE "contacts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "phone_number" VARCHAR(50) NOT NULL,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create contact_groups table
CREATE TABLE "contact_groups" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" VARCHAR(20) DEFAULT 'active',
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create a join table for the many-to-many relationship between contacts and groups
CREATE TABLE "contacts_to_groups" (
  "contact_id" UUID NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
  "group_id" UUID NOT NULL REFERENCES "contact_groups"("id") ON DELETE CASCADE,
  PRIMARY KEY ("contact_id", "group_id")
);

-- Create campaign_groups table
CREATE TABLE campaign_groups (
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  group_id UUID REFERENCES contact_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, group_id)
);

-- Insert sender IDs
INSERT INTO sender_ids (id, name, purpose, status, user_id, created_at, updated_at, rejection_reason, approved_at)
VALUES
  (gen_random_uuid(), 'COMPANY', 'General business communications', 'APPROVED', 'b70292a1-6d10-439e-98c8-8b646c646688', '2024-01-10', '2024-01-12', NULL, '2024-01-12'),
  (gen_random_uuid(), 'PROMO', 'Promotional campaigns and offers', 'PENDING', '40d8a64d-8ee3-4fd2-8329-399346e73d2c', '2024-01-18', '2024-01-18', NULL, NULL);

-- Update sender_ids table
UPDATE sender_ids
SET status = LOWER(status)
WHERE status IN ('APPROVED', 'REJECTED', 'PENDING');

-- Change column type
ALTER TABLE sender_ids
ALTER COLUMN status TYPE sender_id_status
USING status::sender_id_status;

