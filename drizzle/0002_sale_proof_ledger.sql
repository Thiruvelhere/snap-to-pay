CREATE TABLE "sale_proofs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "sale_id" uuid NOT NULL,
    "sequence" integer NOT NULL,
    "previous_hash" varchar(255),
    "proof_hash" varchar(255) NOT NULL,
    "ledger_hash" varchar(255) NOT NULL,
    "canonical_payload" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "sale_proofs_sequence_positive" CHECK ("sequence" > 0)
);

ALTER TABLE "sale_proofs"
    ADD CONSTRAINT "sale_proofs_sale_id_sales_id_fk"
    FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX "sale_proofs_sale_id_idx" ON "sale_proofs" ("sale_id");
CREATE INDEX "sale_proofs_sequence_idx" ON "sale_proofs" ("sequence");
