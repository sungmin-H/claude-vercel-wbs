CREATE TABLE "deliverables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'other' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"link" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deliverables_type_check" CHECK ("deliverables"."type" in ('doc','design','code','spec','data','other')),
	CONSTRAINT "deliverables_status_check" CHECK ("deliverables"."status" in ('pending','in-progress','done'))
);
--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;