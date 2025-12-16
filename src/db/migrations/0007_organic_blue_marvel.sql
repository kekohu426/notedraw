CREATE TABLE "note_card" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"original_text" text,
	"structure" text,
	"prompt" text,
	"image_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note_project" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"input_text" text NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"visual_style" text DEFAULT 'sketch' NOT NULL,
	"generate_mode" text DEFAULT 'detailed' NOT NULL,
	"signature" text DEFAULT '娇姐手绘整理',
	"status" text DEFAULT 'draft' NOT NULL,
	"error_message" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"tags" text,
	"likes" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redemption_code" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"value" integer NOT NULL,
	"description" text,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "redemption_code_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "redemption_record" (
	"id" text PRIMARY KEY NOT NULL,
	"code_id" text NOT NULL,
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"value" integer NOT NULL,
	"redeemed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "provider" text DEFAULT 'stripe' NOT NULL;--> statement-breakpoint
ALTER TABLE "note_card" ADD CONSTRAINT "note_card_project_id_note_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."note_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_project" ADD CONSTRAINT "note_project_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_record" ADD CONSTRAINT "redemption_record_code_id_redemption_code_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."redemption_code"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_record" ADD CONSTRAINT "redemption_record_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_card_project_id_idx" ON "note_card" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "note_card_status_idx" ON "note_card" USING btree ("status");--> statement-breakpoint
CREATE INDEX "note_card_order_idx" ON "note_card" USING btree ("order");--> statement-breakpoint
CREATE INDEX "note_project_user_id_idx" ON "note_project" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "note_project_status_idx" ON "note_project" USING btree ("status");--> statement-breakpoint
CREATE INDEX "note_project_created_at_idx" ON "note_project" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "note_project_public_idx" ON "note_project" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "note_project_style_idx" ON "note_project" USING btree ("visual_style");--> statement-breakpoint
CREATE INDEX "redemption_code_idx" ON "redemption_code" USING btree ("code");--> statement-breakpoint
CREATE INDEX "redemption_code_type_idx" ON "redemption_code" USING btree ("type");--> statement-breakpoint
CREATE INDEX "redemption_code_active_idx" ON "redemption_code" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "redemption_record_code_id_idx" ON "redemption_record" USING btree ("code_id");--> statement-breakpoint
CREATE INDEX "redemption_record_user_id_idx" ON "redemption_record" USING btree ("user_id");