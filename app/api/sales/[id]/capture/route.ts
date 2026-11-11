
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, sales } from "../../../../../src/lib/db";
import { getPayPalAccessToken } from "../../../../../src/lib/paypal";
import { z } from "zod";

const paramsSchema = z.object({
    id: z.string().uuid(),
});

export async function POST(
    _request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Validate the sale ID
        const { id } = await context.params;
        const parsed = paramsSchema.safeParse({ id });

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: "Invalid sale ID" },
                { status: 400 }
            );
        }

        // 2. Fetch the sale from PostgreSQL
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

        // 3. Handle an already completed payment
        if (sale.paymentStatus === "completed") {
            return NextResponse.json({
                success: true,
                message: "Payment was already completed",
                saleId: sale.id,
                captureId: sale.paypalCaptureId,
                paymentStatus: sale.paymentStatus,
                total: sale.total,
                currency: "INR",
            });
        }

        if (!sale.paypalOrderId) {
            return NextResponse.json(
                { success: false, message: "No PayPal order found for this sale" },
                { status: 400 }
            );
        }

        // 4. Authenticate with PayPal
        const accessToken = await getPayPalAccessToken();
        const baseUrl = process.env.PAYPAL_BASE_URL;

        if (!baseUrl) {
            throw new Error("PayPal base URL is missing");
        }

        // 5. Capture the PayPal order
        const paypalResponse = await fetch(
            `${baseUrl}/v2/checkout/orders/${sale.paypalOrderId}/capture`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                    "PayPal-Request-Id": `snap-to-pay-capture-${sale.id}`,
                    Prefer: "return=representation",
                },
                cache: "no-store",
            }
        );

        const paypalData = await paypalResponse.json();

        if (!paypalResponse.ok) {
            console.error("PayPal capture failed:", paypalData);

            return NextResponse.json(
                {
                    success: false,
                    message: "PayPal could not capture this payment",
                    details: paypalData.message || "Capture request failed",
                },
                { status: 502 }
            );
        }

        // 6. Verify PayPal's actual capture status
        const capture = paypalData.purchase_units?.[0]
            ?.payments?.captures?.[0];

        if (
            paypalData.status !== "COMPLETED" ||
            capture?.status !== "COMPLETED" ||
            !capture?.id
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "PayPal has not confirmed a completed capture",
                    paypalStatus: paypalData.status,
                    captureStatus: capture?.status ?? null,
                },
                { status: 409 }
            );
        }

        // 7. Update PostgreSQL only after verified capture
        const [updatedSale] = await db
            .update(sales)
            .set({
                paymentStatus: "completed",
                paypalCaptureId: capture.id,
                updatedAt: new Date(),
            })
            .where(eq(sales.id, sale.id))
            .returning();

        console.info("PayPal payment captured:", {
            saleId: sale.id,
            orderId: sale.paypalOrderId,
            captureId: capture.id,
        });

        // 8. Return the confirmed receipt data
        return NextResponse.json({
            success: true,
            message: "Payment completed successfully",
            saleId: updatedSale.id,
            paymentStatus: updatedSale.paymentStatus,
            captureId: updatedSale.paypalCaptureId,
            total: updatedSale.total,
            currency: "INR",
        });
    } catch (error) {
        console.error("PayPal capture error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Unable to verify or capture payment",
            },
            { status: 500 }
        );
    }
}
