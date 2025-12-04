CREATE TABLE "medical_evolutions" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"doctor_name" text NOT NULL,
	"doctor_crm" text,
	"appointment_id" integer,
	"chief_complaint" text NOT NULL,
	"current_illness_history" text,
	"physical_exam" text,
	"vital_signs" text,
	"diagnostic_hypotheses" text,
	"therapeutic_plan" text,
	"prescribed_medications" text,
	"requested_exams" text,
	"general_recommendations" text,
	"additional_observations" text,
	"is_confirmed" boolean DEFAULT false,
	"digital_signature" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "global_notifications" ALTER COLUMN "patient_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "global_notifications" ALTER COLUMN "processed_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "global_notifications" ALTER COLUMN "distributed_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "global_notifications" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "global_notifications" ADD COLUMN "user_name" text;--> statement-breakpoint
ALTER TABLE "notification_audit_log" ADD COLUMN "before_state" text;--> statement-breakpoint
ALTER TABLE "notification_audit_log" ADD COLUMN "after_state" text;--> statement-breakpoint
ALTER TABLE "notification_audit_log" ADD COLUMN "correlation_id" text;--> statement-breakpoint
ALTER TABLE "notification_audit_log" ADD COLUMN "processing_time_ms" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gender" varchar(10);--> statement-breakpoint
ALTER TABLE "medical_evolutions" ADD CONSTRAINT "medical_evolutions_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_evolutions" ADD CONSTRAINT "medical_evolutions_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_evolutions" ADD CONSTRAINT "medical_evolutions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "medical_evolutions_patient_id_idx" ON "medical_evolutions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "medical_evolutions_doctor_id_idx" ON "medical_evolutions" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "medical_evolutions_appointment_id_idx" ON "medical_evolutions" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "medical_evolutions_created_at_idx" ON "medical_evolutions" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "global_notifications" ADD CONSTRAINT "global_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "global_notifications_user_id_idx" ON "global_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_audit_correlation_idx" ON "notification_audit_log" USING btree ("correlation_id");