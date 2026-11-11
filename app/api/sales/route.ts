
import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { z } from "zod";

import {
    db,
    catalogItems,
    sales,
    saleLines,
} from "../../../src/lib/db";

const createSaleSchema = z.object({
    items: z
        .array(
            z.object({
                catalogItemId: z.string().uuid(),
                quantity: z.number().int().positive().max(100),
            })
        )
        .min(1)
        .max(50),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validation = createSaleSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid sale request",
                    errors: validation.error.issues,
                },
                { status: 400 }
            );
        }

        const requestedItems = validation.data.items;

        // Prevent duplicate catalogue IDs in one request.
        const ids = requestedItems.map((item) => item.catalogItemId);
        const uniqueIds = new Set(ids);

        if (uniqueIds.size !== ids.length) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Duplicate catalogue items are not allowed",
                },
                { status: 400 }
            );
        }

        const result = await db.transaction(async (tx) => {
            // Always retrieve prices from the database.
            const catalogue = await tx
                .select({
                    id: catalogItems.id,
                    name: catalogItems.name,
                    price: catalogItems.price,
                })
                .from(catalogItems)
                .where(inArray(catalogItems.id, ids));

            if (catalogue.length !== ids.length) {
                throw new Error("CATALOG_ITEMS_NOT_FOUND");
            }

            const catalogueMap = new Map(
                catalogue.map((item) => [item.id, item])
            );

            const verifiedLines = requestedItems.map((requested) => {
                const product = catalogueMap.get(requested.catalogItemId)!;

                return {
                    catalogItemId: product.id,
                    productName: product.name,
                    quantity: requested.quantity,
                    unitPrice: product.price,
                    source: "manual" as const,
                };
            });

            // All monetary calculations use integer paise.
            const subtotal = verifiedLines.reduce(
                (sum, line) => sum + line.unitPrice * line.quantity,
                0
            );

            if (!Number.isSafeInteger(subtotal) || subtotal > 2147483647) {
                throw new Error("SALE_TOTAL_OUT_OF_RANGE");
            }

            // Tax is zero for this demo.
            const tax = 0;
            const total = subtotal + tax;

            const [sale] = await tx
                .insert(sales)
                .values({
                    subtotal,
                    tax,
                    total,
                })
                .returning({
                    id: sales.id,
                    paymentStatus: sales.paymentStatus,
                });

            await tx.insert(saleLines).values(
                verifiedLines.map((line) => ({
                    saleId: sale.id,
                    catalogItemId: line.catalogItemId,
                    productName: line.productName,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    source: line.source,
                }))
            );

            return {
                saleId: sale.id,
                paymentStatus: sale.paymentStatus,
                subtotal,
                tax,
                total,
                currency: "INR",
                items: verifiedLines,
            };
        });

        return NextResponse.json(
            {
                success: true,
                sale: result,
            },
            { status: 201 }
        );
    } catch (error) {
        if (
            error instanceof Error &&
            error.message === "CATALOG_ITEMS_NOT_FOUND"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "One or more catalogue products do not exist",
                },
                { status: 400 }
            );
        }

        console.error("Sale creation error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Unable to create sale",
            },
            { status: 500 }
        );
    }
}
