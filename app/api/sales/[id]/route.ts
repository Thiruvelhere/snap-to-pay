
import { NextRequest, NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db, sales, saleLines } from "../../../../src/lib/db";
import { z } from "zod";

const saleIdSchema = z.string().uuid();

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Validate the sale ID before querying the database.
        if (!saleIdSchema.safeParse(id).success) {
            return NextResponse.json(
                { success: false, message: "Invalid sale ID" },
                { status: 400 }
            );
        }

        // Retrieve the sale.
        const [sale] = await db
            .select()
            .from(sales)
            .where(eq(sales.id, id))
            .limit(1);

        if (!sale) {
            return NextResponse.json(
                { success: false, message: "Sale not found" },
                { status: 404 }
            );
        }

        // Retrieve all products belonging to this sale.
        const items = await db
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
            .where(eq(saleLines.saleId, id))
            .orderBy(asc(saleLines.createdAt));

        return NextResponse.json({
            success: true,
            sale: {
                id: sale.id,
                paymentStatus: sale.paymentStatus,
                subtotal: sale.subtotal,
                tax: sale.tax,
                total: sale.total,
                currency: "INR",
                paypalOrderId: sale.paypalOrderId,
                paypalCaptureId: sale.paypalCaptureId,
                createdAt: sale.createdAt,
                updatedAt: sale.updatedAt,
                items,
            },
        });
    } catch (error) {
        console.error("Get sale API error:", error);

        return NextResponse.json(
            { success: false, message: "Unable to retrieve sale" },
            { status: 500 }
        );
    }
}
