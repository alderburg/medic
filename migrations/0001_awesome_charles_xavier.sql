CREATE TABLE "blood_pressure_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"systolic" integer NOT NULL,
	"diastolic" integer NOT NULL,
	"heart_rate" integer,
	"notes" text,
	"measured_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "glucose_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"glucose_level" real NOT NULL,
	"measurement_type" varchar(20) NOT NULL,
	"notes" text,
	"measured_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "heart_rate_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"heart_rate" integer NOT NULL,
	"measurement_type" varchar(20) NOT NULL,
	"notes" text,
	"measured_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "temperature_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"temperature" real NOT NULL,
	"measurement_method" varchar(20) NOT NULL,
	"notes" text,
	"measured_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weight_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"weight" real NOT NULL,
	"height" real,
	"bmi" real,
	"notes" text,
	"measured_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blood_pressure_readings" ADD CONSTRAINT "blood_pressure_readings_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glucose_readings" ADD CONSTRAINT "glucose_readings_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heart_rate_readings" ADD CONSTRAINT "heart_rate_readings_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "temperature_readings" ADD CONSTRAINT "temperature_readings_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_readings" ADD CONSTRAINT "weight_readings_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;