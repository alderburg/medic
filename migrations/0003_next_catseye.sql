CREATE TABLE "global_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"patient_name" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"subtype" varchar(50),
	"title" text NOT NULL,
	"message" text NOT NULL,
	"related_id" integer,
	"related_type" varchar(30),
	"related_item_name" text,
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"urgency_score" integer DEFAULT 0,
	"original_scheduled_time" timestamp,
	"notification_trigger_time" timestamp NOT NULL,
	"processed_at" timestamp,
	"distributed_at" timestamp,
	"distribution_count" integer DEFAULT 0,
	"batch_id" text,
	"processing_node" varchar(50),
	"metadata" text,
	"deduplication_key" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"retry_count" integer DEFAULT 0,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(30) NOT NULL,
	"entity_id" integer NOT NULL,
	"action" varchar(30) NOT NULL,
	"details" text,
	"user_id" integer,
	"patient_id" integer,
	"session_id" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"processing_node" varchar(50),
	"request_id" text,
	"success" boolean NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(50) NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"category" varchar(30) NOT NULL,
	"data_type" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "notification_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"subtype" varchar(50),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 5,
	"scope" varchar(20) NOT NULL,
	"patient_id" integer,
	"patient_batch_start" integer,
	"patient_batch_end" integer,
	"batch_size" integer DEFAULT 100,
	"max_retries" integer DEFAULT 3,
	"timeout_seconds" integer DEFAULT 300,
	"total_items" integer DEFAULT 0,
	"processed_items" integer DEFAULT 0,
	"success_count" integer DEFAULT 0,
	"error_count" integer DEFAULT 0,
	"skipped_count" integer DEFAULT 0,
	"processing_node" varchar(50),
	"resource_usage" text,
	"config" text,
	"result" text,
	"error_message" text,
	"error_stack" text,
	"scheduled_for" timestamp NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"last_heartbeat" timestamp,
	"depends_on" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"metric_type" varchar(50) NOT NULL,
	"date" timestamp NOT NULL,
	"total_notifications_created" integer DEFAULT 0,
	"total_notifications_distributed" integer DEFAULT 0,
	"total_notifications_read" integer DEFAULT 0,
	"medication_notifications" integer DEFAULT 0,
	"appointment_notifications" integer DEFAULT 0,
	"test_notifications" integer DEFAULT 0,
	"active_patients" integer DEFAULT 0,
	"active_users" integer DEFAULT 0,
	"avg_processing_time_ms" integer DEFAULT 0,
	"max_processing_time_ms" integer DEFAULT 0,
	"min_processing_time_ms" integer DEFAULT 0,
	"error_rate" numeric(5, 2) DEFAULT '0.00',
	"additional_data" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_rate_limit" (
	"id" serial PRIMARY KEY NOT NULL,
	"limit_type" varchar(30) NOT NULL,
	"entity_id" integer,
	"request_count" integer DEFAULT 0,
	"window_start" timestamp NOT NULL,
	"window_end" timestamp NOT NULL,
	"max_requests" integer NOT NULL,
	"is_blocked" boolean DEFAULT false,
	"blocked_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"global_notification_id" integer NOT NULL,
	"user_profile_type" varchar(20) NOT NULL,
	"user_name" text NOT NULL,
	"access_type" varchar(20) NOT NULL,
	"access_level" varchar(20) DEFAULT 'read' NOT NULL,
	"delivery_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"acknowledged_at" timestamp,
	"delivery_method" varchar(20) DEFAULT 'web' NOT NULL,
	"delivery_attempts" integer DEFAULT 0,
	"last_delivery_error" text,
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_notifications_user_global_unique" UNIQUE("user_id","global_notification_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "weight" real;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "whatsapp" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "share_code" text;--> statement-breakpoint
ALTER TABLE "global_notifications" ADD CONSTRAINT "global_notifications_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_audit_log" ADD CONSTRAINT "notification_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_audit_log" ADD CONSTRAINT "notification_audit_log_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_config" ADD CONSTRAINT "notification_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_jobs" ADD CONSTRAINT "notification_jobs_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_global_notification_id_global_notifications_id_fk" FOREIGN KEY ("global_notification_id") REFERENCES "public"."global_notifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "global_notifications_patient_id_idx" ON "global_notifications" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "global_notifications_trigger_time_idx" ON "global_notifications" USING btree ("notification_trigger_time");--> statement-breakpoint
CREATE INDEX "global_notifications_batch_id_idx" ON "global_notifications" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "global_notifications_deduplication_idx" ON "global_notifications" USING btree ("deduplication_key");--> statement-breakpoint
CREATE INDEX "global_notifications_type_patient_idx" ON "global_notifications" USING btree ("type","patient_id");--> statement-breakpoint
CREATE INDEX "global_notifications_priority_urgency_idx" ON "global_notifications" USING btree ("priority","urgency_score");--> statement-breakpoint
CREATE INDEX "global_notifications_active_created_idx" ON "global_notifications" USING btree ("is_active","created_at");--> statement-breakpoint
CREATE INDEX "notification_audit_entity_idx" ON "notification_audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "notification_audit_user_idx" ON "notification_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_audit_patient_idx" ON "notification_audit_log" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "notification_audit_action_idx" ON "notification_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "notification_audit_created_at_idx" ON "notification_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notification_jobs_job_id_idx" ON "notification_jobs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "notification_jobs_status_priority_idx" ON "notification_jobs" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "notification_jobs_type_subtype_idx" ON "notification_jobs" USING btree ("type","subtype");--> statement-breakpoint
CREATE INDEX "notification_jobs_scheduled_for_idx" ON "notification_jobs" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "notification_jobs_processing_node_idx" ON "notification_jobs" USING btree ("processing_node");--> statement-breakpoint
CREATE INDEX "notification_jobs_patient_batch_idx" ON "notification_jobs" USING btree ("patient_batch_start","patient_batch_end");--> statement-breakpoint
CREATE INDEX "notification_jobs_heartbeat_idx" ON "notification_jobs" USING btree ("last_heartbeat");--> statement-breakpoint
CREATE INDEX "notification_metrics_date_type_idx" ON "notification_metrics" USING btree ("date","metric_type");--> statement-breakpoint
CREATE INDEX "notification_metrics_type_idx" ON "notification_metrics" USING btree ("metric_type");--> statement-breakpoint
CREATE INDEX "notification_rate_limit_type_entity_idx" ON "notification_rate_limit" USING btree ("limit_type","entity_id");--> statement-breakpoint
CREATE INDEX "notification_rate_limit_window_idx" ON "notification_rate_limit" USING btree ("window_start","window_end");--> statement-breakpoint
CREATE INDEX "user_notifications_user_id_idx" ON "user_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_notifications_global_id_idx" ON "user_notifications" USING btree ("global_notification_id");--> statement-breakpoint
CREATE INDEX "user_notifications_user_read_idx" ON "user_notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "user_notifications_delivery_status_idx" ON "user_notifications" USING btree ("delivery_status");--> statement-breakpoint
CREATE INDEX "user_notifications_profile_type_idx" ON "user_notifications" USING btree ("user_profile_type");--> statement-breakpoint
CREATE INDEX "user_notifications_access_type_idx" ON "user_notifications" USING btree ("access_type");--> statement-breakpoint
CREATE INDEX "user_notifications_priority_idx" ON "user_notifications" USING btree ("priority");