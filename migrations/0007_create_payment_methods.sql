
-- Migration: Create payment_methods table
-- Created at: 2025-01-22

CREATE TABLE IF NOT EXISTS "payment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"doctor_id" integer NOT NULL,
	"name" text NOT NULL,
	"payment_type" text NOT NULL,
	"brand" text,
	"fixed_fee" real DEFAULT 0 NOT NULL,
	"percentage_fee" real DEFAULT 0 NOT NULL,
	"receiving_days" integer DEFAULT 0 NOT NULL,
	"accepts_installment" boolean DEFAULT false NOT NULL,
	"max_installments" integer,
	"installment_rates" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "payment_methods_doctor_id_idx" ON "payment_methods" ("doctor_id");
CREATE INDEX IF NOT EXISTS "payment_methods_name_idx" ON "payment_methods" ("name");
CREATE INDEX IF NOT EXISTS "payment_methods_is_active_idx" ON "payment_methods" ("is_active");
CREATE INDEX IF NOT EXISTS "payment_methods_payment_type_idx" ON "payment_methods" ("payment_type");
