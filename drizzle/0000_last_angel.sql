CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."sale_line_source" AS ENUM('ai', 'manual');--> statement-breakpoint
CREATE TABLE "catalog_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"image_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_items_price_non_negative" CHECK ("catalog_items"."price" >= 0),
	CONSTRAINT "catalog_items_name_not_empty" CHECK (length(trim("catalog_items"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "sale_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"catalog_item_id" uuid,
	"product_name" varchar(255) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" integer NOT NULL,
	"source" "sale_line_source" DEFAULT 'manual' NOT NULL,
	"confidence_score" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sale_lines_quantity_positive" CHECK ("sale_lines"."quantity" > 0),
	CONSTRAINT "sale_lines_unit_price_non_negative" CHECK ("sale_lines"."unit_price" >= 0),
	CONSTRAINT "sale_lines_confidence_score_range" CHECK ("sale_lines"."confidence_score" IS NULL OR ("sale_lines"."confidence_score" >= 0 AND "sale_lines"."confidence_score" <= 1))
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"tax" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"paypal_order_id" varchar(255),
	"paypal_capture_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_subtotal_non_negative" CHECK ("sales"."subtotal" >= 0),
	CONSTRAINT "sales_tax_non_negative" CHECK ("sales"."tax" >= 0),
	CONSTRAINT "sales_total_non_negative" CHECK ("sales"."total" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_items_name_idx" ON "catalog_items" USING btree ("name");--> statement-breakpoint
CREATE INDEX "sale_lines_sale_id_idx" ON "sale_lines" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_lines_catalog_item_id_idx" ON "sale_lines" USING btree ("catalog_item_id");--> statement-breakpoint
CREATE INDEX "sales_payment_status_idx" ON "sales" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "sales_paypal_order_id_idx" ON "sales" USING btree ("paypal_order_id");--> statement-breakpoint
CREATE INDEX "sales_created_at_idx" ON "sales" USING btree ("created_at");