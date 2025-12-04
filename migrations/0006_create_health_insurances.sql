
CREATE TABLE IF NOT EXISTS "health_insurances" (
	"id" serial PRIMARY KEY NOT NULL,
	"doctor_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"registration_number" varchar(100),
	"contract_number" varchar(100),
	"contact_phone" varchar(20),
	"contact_email" varchar(255),
	"website" varchar(255),
	"address" text,
	"city" varchar(100),
	"state" varchar(50),
	"zip_code" varchar(20),
	"consultation_value" numeric(10,2),
	"return_consultation_value" numeric(10,2),
	"urgent_consultation_value" numeric(10,2),
	"home_visit_value" numeric(10,2),
	"payment_term_days" integer DEFAULT 30 NOT NULL,
	"discount_percentage" numeric(5,2) DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"accepts_new_patients" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS "health_insurances_doctor_id_idx" ON "health_insurances" ("doctor_id");

-- Adicionar constraint de chave estrangeira
DO $$ BEGIN
 ALTER TABLE "health_insurances" ADD CONSTRAINT "health_insurances_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
