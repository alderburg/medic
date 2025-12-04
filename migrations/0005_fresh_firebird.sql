CREATE TABLE "exam_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"doctor_name" text NOT NULL,
	"doctor_crm" text,
	"doctor_gender" varchar(10),
	"exam_name" text NOT NULL,
	"exam_category" text NOT NULL,
	"clinical_indication" text NOT NULL,
	"urgency" varchar(20) DEFAULT 'normal' NOT NULL,
	"special_instructions" text,
	"medical_notes" text,
	"validity_date" timestamp,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"scheduled_test_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_insurances" (
	"id" serial PRIMARY KEY NOT NULL,
	"doctor_id" integer NOT NULL,
	"name" text NOT NULL,
	"registration_number" text,
	"contract_number" text,
	"contact_phone" text,
	"contact_email" text,
	"website" text,
	"address" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"consultation_value" real,
	"return_consultation_value" real,
	"urgent_consultation_value" real,
	"home_visit_value" real,
	"payment_term_days" integer DEFAULT 30,
	"discount_percentage" real DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"accepts_new_patients" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tests" ADD COLUMN "exam_request_id" integer;--> statement-breakpoint
ALTER TABLE "tests" ADD COLUMN "preparation_notes" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "crm" varchar(50);--> statement-breakpoint
ALTER TABLE "exam_requests" ADD CONSTRAINT "exam_requests_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_requests" ADD CONSTRAINT "exam_requests_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_insurances" ADD CONSTRAINT "health_insurances_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_requests_patient_id_idx" ON "exam_requests" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "exam_requests_doctor_id_idx" ON "exam_requests" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "exam_requests_status_idx" ON "exam_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "health_insurances_doctor_id_idx" ON "health_insurances" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "health_insurances_name_idx" ON "health_insurances" USING btree ("name");--> statement-breakpoint
CREATE INDEX "health_insurances_is_active_idx" ON "health_insurances" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_exam_request_id_exam_requests_id_fk" FOREIGN KEY ("exam_request_id") REFERENCES "public"."exam_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tests_exam_request_id_idx" ON "tests" USING btree ("exam_request_id");