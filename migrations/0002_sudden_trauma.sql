CREATE TABLE "medication_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"medication_log_id" integer NOT NULL,
	"medication_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"scheduled_date_time" timestamp NOT NULL,
	"actual_date_time" timestamp,
	"notes" text,
	"side_effects" text,
	"effectiveness" varchar(20),
	"symptoms" text,
	"additional_info" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "medication_history" ADD CONSTRAINT "medication_history_medication_log_id_medication_logs_id_fk" FOREIGN KEY ("medication_log_id") REFERENCES "public"."medication_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_history" ADD CONSTRAINT "medication_history_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_history" ADD CONSTRAINT "medication_history_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_history" ADD CONSTRAINT "medication_history_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_logs" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "weight_readings" DROP COLUMN "height";--> statement-breakpoint
ALTER TABLE "weight_readings" DROP COLUMN "bmi";