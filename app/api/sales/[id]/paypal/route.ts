
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, sales } from "../../../../../src/lib/db";
import { getPayPalAccessToken } from "../../../../../src/lib/paypal";

const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL;
const APP_BASE_URL = process.env.APP_BASE_URL?.replace(/\/$/, "");
const INR_TO_USD_RATE = Number(process.env.PAYPAL_INR_TO_USD_RATE);

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
            return NextResponse.json(
                { success: false, message: "Invalid sale ID" },
                { status: 400 }
            );
        }

        if (
            !PAYPAL_BASE_URL ||
            !APP_BASE_URL ||
            !Number.isFinite(INR_TO_USD_RATE) ||
            INR_TO_USD_RATE <= 0
        ) {
            throw new Error("PayPal configuration is invalid");
        }

        // 1. Retrieve the sale from PostgreSQL.
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

        if (sale.paymentStatus !== "pending") {
            return NextResponse.json(
                { success: false, message: "Only pending sales can be paid" },
                { status: 409 }
            );
        }

        if (sale.paypalOrderId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "A PayPal order already exists for this sale",
                    paypalOrderId: sale.paypalOrderId,
                },
                { status: 409 }
            );
        }

        if (!Number.isSafeInteger(sale.total) || sale.total <= 0) {
            return NextResponse.json(
                { success: false, message: "Sale total must be greater than zero" },
                { status: 400 }
            );
        }

        // 2. Convert INR paise to USD cents.
        // Example: ₹190 / 85 = $2.24 (rounded to two decimals).
        const inrAmount = sale.total / 100;
        const usdAmount = (inrAmount / INR_TO_USD_RATE).toFixed(2);

        if (Number(usdAmount) <= 0) {
            return NextResponse.json(
                { success: false, message: "Converted USD amount is too small" },
                { status: 400 }
            );
        }

        // 3. Authenticate with PayPal.
        const accessToken = await getPayPalAccessToken();

        // 4. Create a PayPal Sandbox order.
        const paypalResponse = await fetch(
            `${PAYPAL_BASE_URL}/v2/checkout/orders`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                    "PayPal-Request-Id": `snap-to-pay-${sale.id}`,
                    Prefer: "return=representation",
                },
                body: JSON.stringify({
                    intent: "CAPTURE",
                    purchase_units: [
                        {
                            reference_id: sale.id,
                            invoice_id: sale.id,
                            description: `Snap to Pay sale ${sale.id}`,
                            amount: {
                                currency_code: "USD",
                                value: usdAmount,
                            },
                        },
                    ],
                    payment_source: {
                        paypal: {
                            experience_context: {
                                brand_name: "Snap to Pay",
                                user_action: "PAY_NOW",
                                shipping_preference: "NO_SHIPPING",
                                return_url: `${APP_BASE_URL}/pay/return?saleId=${sale.id}`,
                                cancel_url: `${APP_BASE_URL}/pay/cancel?saleId=${sale.id}`,
                            },
                        },
                    },
                }),
                cache: "no-store",
            }
        );

        const paypalData = await paypalResponse.json();

        if (!paypalResponse.ok) {
            console.error("PayPal order creation failed:", paypalData);

            return NextResponse.json(
                {
                    success: false,
                    message: "PayPal could not create the order",
                    details: paypalData.message ?? "PayPal API request failed",
                },
                { status: 502 }
            );
        }

        const paypalOrderId = paypalData.id;

        const approvalLink = paypalData.links?.find(
            (link: { rel: string; href: string }) =>
                link.rel === "payer-action" || link.rel === "approve"
        );

        if (!paypalOrderId || !approvalLink?.href) {
            throw new Error("PayPal response did not contain an order ID or approval URL");
        }

        // 5. Save the PayPal order ID against the original sale.
        const [updatedSale] = await db
            .update(sales)
            .set({
                paypalOrderId,
                updatedAt: new Date(),
            })
            .where(eq(sales.id, id))
            .returning({ id: sales.id });

        if (!updatedSale) {
            throw new Error("Unable to associate PayPal order with sale");
        }

        // 6. Return the approval URL to the frontend.
        return NextResponse.json({
            success: true,
            message: "PayPal order created successfully",
            saleId: sale.id,
            paypalOrderId,
            originalAmount: {
                currency: "INR",
                value: sale.total,
            },
            paypalAmount: {
                currency: "USD",
                value: usdAmount,
            },
            approvalUrl: approvalLink.href,
        });
    } catch (error) {
        console.error("PayPal order API error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Unable to create PayPal order",
            },
            { status: 500 }
        );
    }
}
