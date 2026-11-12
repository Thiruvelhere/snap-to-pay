import { createHash } from "node:crypto";

import { desc, eq, sql } from "drizzle-orm";

import { db, saleLines, saleProofs, sales } from "./db";

export type SaleProofItemInput = {
  id?: string | null;
  catalogItemId?: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  source?: string | null;
  confidenceScore?: number | null;
};

export type SaleProofInput = {
  saleId: string;
  paymentStatus: string;
  subtotal: number;
  tax: number;
  total: number;
  paypalOrderId?: string | null;
  paypalCaptureId?: string | null;
  createdAt: string;
  items: SaleProofItemInput[];
  previousHash?: string | null;
};

export function buildCanonicalSaleRecord(input: SaleProofInput): string {
  const normalizedItems = [...input.items]
    .map((item) => ({
      id: item.id ?? null,
      catalogItemId: item.catalogItemId ?? null,
      productName: item.productName,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.quantity) * Number(item.unitPrice),
      source: item.source ?? "manual",
      confidenceScore: item.confidenceScore == null ? null : Number(item.confidenceScore),
    }))
    .sort((left, right) => {
      const leftKey = [left.productName, left.id ?? "", left.catalogItemId ?? ""].join(":");
      const rightKey = [right.productName, right.id ?? "", right.catalogItemId ?? ""].join(":");
      return leftKey.localeCompare(rightKey);
    });

  return JSON.stringify({
    saleId: input.saleId,
    paymentStatus: input.paymentStatus,
    subtotal: Number(input.subtotal),
    tax: Number(input.tax),
    total: Number(input.total),
    currency: "INR",
    paypalOrderId: input.paypalOrderId ?? null,
    paypalCaptureId: input.paypalCaptureId ?? null,
    createdAt: input.createdAt,
    items: normalizedItems,
  });
}

export function buildSaleProofHash(input: SaleProofInput): string {
  const canonicalTransaction = buildCanonicalSaleRecord(input);
  const hashInput = JSON.stringify({
    previousHash: input.previousHash ?? null,
    canonicalTransaction,
  });

  return createHash("sha256").update(hashInput).digest("hex");
}

export function buildLedgerHash(
  previousHash: string | null,
  proofHash: string
): string {
  const hashInput = JSON.stringify({
    previousHash: previousHash ?? null,
    proofHash,
  });

  return createHash("sha256").update(hashInput).digest("hex");
}

export async function createSaleProofRecord(
  saleId: string,
  tx: any = db
) {
  const [sale] = await tx
    .select({
      id: sales.id,
      paymentStatus: sales.paymentStatus,
      subtotal: sales.subtotal,
      tax: sales.tax,
      total: sales.total,
      paypalOrderId: sales.paypalOrderId,
      paypalCaptureId: sales.paypalCaptureId,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .where(eq(sales.id, saleId))
    .limit(1);

  if (!sale) {
    return null;
  }

  const [existingProof] = await tx
    .select()
    .from(saleProofs)
    .where(eq(saleProofs.saleId, saleId))
    .limit(1);

  if (existingProof) {
    return existingProof;
  }

  const items = await tx
    .select({
      id: saleLines.id,
      catalogItemId: saleLines.catalogItemId,
      productName: saleLines.productName,
      quantity: saleLines.quantity,
      unitPrice: saleLines.unitPrice,
      source: saleLines.source,
      confidenceScore: saleLines.confidenceScore,
    })
    .from(saleLines)
    .where(eq(saleLines.saleId, saleId));

  const [latestProof] = await tx
    .select()
    .from(saleProofs)
    .orderBy(desc(saleProofs.sequence))
    .limit(1);

  const previousHash = latestProof?.proofHash ?? null;
  const sequence = (latestProof?.sequence ?? 0) + 1;
  const canonicalPayload = buildCanonicalSaleRecord({
    saleId: sale.id,
    paymentStatus: sale.paymentStatus,
    subtotal: sale.subtotal,
    tax: sale.tax,
    total: sale.total,
    paypalOrderId: sale.paypalOrderId ?? null,
    paypalCaptureId: sale.paypalCaptureId ?? null,
    createdAt:
      sale.createdAt instanceof Date
        ? sale.createdAt.toISOString()
        : String(sale.createdAt),
    items: items.map((item: any) => ({
      id: item.id,
      catalogItemId: item.catalogItemId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      source: item.source,
      confidenceScore: item.confidenceScore,
    })),
    previousHash,
  });

  const proofHash = buildSaleProofHash({
    saleId: sale.id,
    paymentStatus: sale.paymentStatus,
    subtotal: sale.subtotal,
    tax: sale.tax,
    total: sale.total,
    paypalOrderId: sale.paypalOrderId ?? null,
    paypalCaptureId: sale.paypalCaptureId ?? null,
    createdAt:
      sale.createdAt instanceof Date
        ? sale.createdAt.toISOString()
        : String(sale.createdAt),
    items: items.map((item: any) => ({
      id: item.id,
      catalogItemId: item.catalogItemId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      source: item.source,
      confidenceScore: item.confidenceScore,
    })),
    previousHash,
  });

  const ledgerHash = buildLedgerHash(previousHash, proofHash);

  const [proof] = await tx
    .insert(saleProofs)
    .values({
      saleId,
      sequence,
      previousHash,
      proofHash,
      ledgerHash,
      canonicalPayload,
    })
    .returning();

  return proof;
}

export async function verifySaleProof(saleId: string, tx: any = db) {
  const [sale] = await tx
    .select({
      id: sales.id,
      paymentStatus: sales.paymentStatus,
      subtotal: sales.subtotal,
      tax: sales.tax,
      total: sales.total,
      paypalOrderId: sales.paypalOrderId,
      paypalCaptureId: sales.paypalCaptureId,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .where(eq(sales.id, saleId))
    .limit(1);

  if (!sale) {
    return {
      found: false as const,
      sale: null,
      proof: null,
      items: [],
      hashValid: false,
      ledgerValid: false,
      chainValid: false,
      isValid: false,
    };
  }

  const [proof] = await tx
    .select()
    .from(saleProofs)
    .where(eq(saleProofs.saleId, saleId))
    .limit(1);

  if (!proof) {
    return {
      found: false as const,
      sale,
      proof: null,
      items: [],
      hashValid: false,
      ledgerValid: false,
      chainValid: false,
      isValid: false,
    };
  }

  const items = await tx
    .select({
      id: saleLines.id,
      catalogItemId: saleLines.catalogItemId,
      productName: saleLines.productName,
      quantity: saleLines.quantity,
      unitPrice: saleLines.unitPrice,
      source: saleLines.source,
      confidenceScore: saleLines.confidenceScore,
    })
    .from(saleLines)
    .where(eq(saleLines.saleId, saleId));

  const expectedProofHash = buildSaleProofHash({
    saleId: sale.id,
    paymentStatus: sale.paymentStatus,
    subtotal: sale.subtotal,
    tax: sale.tax,
    total: sale.total,
    paypalOrderId: sale.paypalOrderId ?? null,
    paypalCaptureId: sale.paypalCaptureId ?? null,
    createdAt: sale.createdAt instanceof Date ? sale.createdAt.toISOString() : String(sale.createdAt),
    items: items.map((item: any) => ({
      id: item.id,
      catalogItemId: item.catalogItemId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      source: item.source,
      confidenceScore: item.confidenceScore,
    })),
    previousHash: proof.previousHash ?? null,
  });

  const hashValid = expectedProofHash === proof.proofHash;
  const ledgerValid = proof.ledgerHash === buildLedgerHash(proof.previousHash ?? null, proof.proofHash);

  const [previousProof] = proof.previousHash
    ? await tx
        .select()
        .from(saleProofs)
        .where(sql`${saleProofs.sequence} < ${proof.sequence}`)
        .orderBy(desc(saleProofs.sequence))
        .limit(1)
    : [null];

  const chainValid =
    proof.sequence === 1 && proof.previousHash === null
      ? true
      : Boolean(
          previousProof &&
            proof.previousHash === previousProof.proofHash &&
            proof.sequence === previousProof.sequence + 1 &&
            proof.ledgerHash === buildLedgerHash(previousProof.proofHash, proof.proofHash)
        );

  return {
    found: true as const,
    sale,
    proof,
    items,
    hashValid,
    ledgerValid,
    chainValid,
    isValid: hashValid && ledgerValid && chainValid,
  };
}
