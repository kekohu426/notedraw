ALTER TABLE "note_project" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "note_project" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "note_project" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "note_project" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
CREATE INDEX "note_project_slug_idx" ON "note_project" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "note_project_featured_idx" ON "note_project" USING btree ("is_featured");--> statement-breakpoint
ALTER TABLE "note_project" ADD CONSTRAINT "note_project_slug_unique" UNIQUE("slug");