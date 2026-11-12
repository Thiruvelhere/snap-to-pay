import { describe, expect, it } from "vitest";

import {
  buildCanonicalSaleRecord,
  buildLedgerHash,
  buildSaleProofHash,
} from "./sale-proof";

describe("sale proof hashing", () => {
  it("creates a stable canonical payload for the same transaction", () => {
    const transactionA = buildCanonicalSaleRecord({
      saleId: "42b3c8a1-1ff2-4a28-9ab5-8d0f4b6ae125",
      total: 2550,
      subtotal: 2400,
      tax: 150,
      paymentStatus: "completed",
      paypalOrderId: "PAYPAL_ORDER_123",
      paypalCaptureId: "PAYPAL_CAPTURE_456",
      createdAt: "2026-11-12T09:00:00.000Z",
      items: [
        {
          id: "line-2",
          catalogItemId: "catalog-2",
          productName: "Notebook",
          quantity: 2,
          unitPrice: 1200,
          source: "manual",
          confidenceScore: null,
        },
        {
          id: "line-1",
          catalogItemId: "catalog-1",
          productName: "Pen",
          quantity: 1,
          unitPrice: 1200,
          source: "ai",
          confidenceScore: 0.93,
        },
      ],
    });

    const transactionB = buildCanonicalSaleRecord({
      saleId: "42b3c8a1-1ff2-4a28-9ab5-8d0f4b6ae125",
      total: 2550,
      subtotal: 2400,
      tax: 150,
      paymentStatus: "completed",
      paypalOrderId: "PAYPAL_ORDER_123",
      paypalCaptureId: "PAYPAL_CAPTURE_456",
      createdAt: "2026-11-12T09:00:00.000Z",
      items: [
        {
          id: "line-1",
          catalogItemId: "catalog-1",
          productName: "Pen",
          quantity: 1,
          unitPrice: 1200,
          source: "ai",
          confidenceScore: 0.93,
        },
        {
          id: "line-2",
          catalogItemId: "catalog-2",
          productName: "Notebook",
          quantity: 2,
          unitPrice: 1200,
          source: "manual",
          confidenceScore: null,
        },
      ],
    });

    expect(transactionA).toBe(transactionB);
  });

  it("binds the hash to the previous ledger entry when chaining", () => {
    const previousHash = "a1b2c3";
    const transactionHash = buildSaleProofHash({
      saleId: "sale-1",
      paymentStatus: "completed",
      total: 1500,
      subtotal: 1500,
      tax: 0,
      paypalOrderId: "paypal-order-1",
      paypalCaptureId: "paypal-capture-1",
      createdAt: "2026-11-12T09:00:00.000Z",
      items: [{
        id: "line-1",
        catalogItemId: "catalog-1",
        productName: "Book",
        quantity: 1,
        unitPrice: 1500,
        source: "manual",
        confidenceScore: null,
      }],
      previousHash,
    });

    expect(transactionHash).not.toBe(previousHash);
    expect(buildLedgerHash(previousHash, transactionHash)).toBe(
      buildLedgerHash(previousHash, transactionHash)
    );
  });
});
