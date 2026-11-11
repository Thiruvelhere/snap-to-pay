import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Enums
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
  "cancelled",
]);

export const saleLineSourceEnum = pgEnum("sale_line_source", ["ai", "manual"]);

/**
 * 1. catalog_items
 * Seller's product catalogue
 * - Product name
 * - Description
 * - Price in integer cents
 * - Image reference (optional)
 */
export const catalogItems = pgTable(
  "catalog_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    // Price stored in integer cents (e.g., $10.00 = 1000)
    price: integer("price").notNull(),
    // Image reference/URL (optional)
    imageReference: text("image_reference"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("catalog_items_price_non_negative", sql`${table.price} >= 0`),
    check(
      "catalog_items_name_not_empty",
      sql`length(trim(${table.name})) > 0`
    ),
    index("catalog_items_name_idx").on(table.name),
  ]
);

/**
 * 2. sales
 * Individual transactions
 * - Sale ID
 * - Payment status
 * - Subtotal, tax and total (in integer cents)
 * - PayPal order and capture IDs
 * - Timestamps
 */
export const sales = pgTable(
  "sales",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    paymentStatus: paymentStatusEnum("payment_status")
      .notNull()
      .default("pending"),
    // Financial values stored in integer cents
    subtotal: integer("subtotal").notNull().default(0),
    tax: integer("tax").notNull().default(0),
    total: integer("total").notNull().default(0),
    // PayPal integration identifiers
    paypalOrderId: varchar("paypal_order_id", { length: 255 }),
    paypalCaptureId: varchar("paypal_capture_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("sales_subtotal_non_negative", sql`${table.subtotal} >= 0`),
    check("sales_tax_non_negative", sql`${table.tax} >= 0`),
    check("sales_total_non_negative", sql`${table.total} >= 0`),
    index("sales_payment_status_idx").on(table.paymentStatus),
    index("sales_paypal_order_id_idx").on(table.paypalOrderId),
    index("sales_created_at_idx").on(table.createdAt),
  ]
);

/**
 * 3. sale_lines
 * Individual products in each transaction
 * - Sale ID
 * - Catalog item ID
 * - Product name snapshot
 * - Quantity
 * - Unit price snapshot (in integer cents)
 * - AI/manual source
 * - Confidence score
 */
export const saleLines = pgTable(
  "sale_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    // Nullable so that if a catalog item is deleted, sale line history is preserved
    catalogItemId: uuid("catalog_item_id").references(
      () => catalogItems.id,
      { onDelete: "set null" }
    ),
    // Snapshot of product name at purchase time
    productName: varchar("product_name", { length: 255 }).notNull(),
    quantity: integer("quantity").notNull().default(1),
    // Unit price snapshot in integer cents at purchase time
    unitPrice: integer("unit_price").notNull(),
    // Source of item detection: 'ai' or 'manual'
    source: saleLineSourceEnum("source").notNull().default("manual"),
    // AI detection confidence score between 0.0 and 1.0 (nullable for manual entries)
    confidenceScore: real("confidence_score"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("sale_lines_quantity_positive", sql`${table.quantity} > 0`),
    check("sale_lines_unit_price_non_negative", sql`${table.unitPrice} >= 0`),
    check(
      "sale_lines_confidence_score_range",
      sql`${table.confidenceScore} IS NULL OR (${table.confidenceScore} >= 0 AND ${table.confidenceScore} <= 1)`
    ),
    index("sale_lines_sale_id_idx").on(table.saleId),
    index("sale_lines_catalog_item_id_idx").on(table.catalogItemId),
  ]
);

// Relations
export const catalogItemsRelations = relations(catalogItems, ({ many }) => ({
  saleLines: many(saleLines),
}));

export const salesRelations = relations(sales, ({ many }) => ({
  lines: many(saleLines),
}));

export const saleLinesRelations = relations(saleLines, ({ one }) => ({
  sale: one(sales, {
    fields: [saleLines.saleId],
    references: [sales.id],
  }),
  catalogItem: one(catalogItems, {
    fields: [saleLines.catalogItemId],
    references: [catalogItems.id],
  }),
}));

// Inferred TypeScript Types
export type CatalogItem = typeof catalogItems.$inferSelect;
export type NewCatalogItem = typeof catalogItems.$inferInsert;

export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;

export type SaleLine = typeof saleLines.$inferSelect;
export type NewSaleLine = typeof saleLines.$inferInsert;
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type SaleLineSource = (typeof saleLineSourceEnum.enumValues)[number];

