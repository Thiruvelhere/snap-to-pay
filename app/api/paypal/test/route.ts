
import { NextResponse } from "next/server";
import { getPayPalAccessToken } from "../../../../src/lib/paypal";

export async function GET() {
    try {
        const accessToken = await getPayPalAccessToken();

        // Never return the actual access token to the browser.
        return NextResponse.json({
            success: true,
            message: "Successfully connected to PayPal Sandbox",
            authenticated: Boolean(accessToken),
        });
    } catch (error) {
        console.error("PayPal test error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "PayPal connection failed. Check server logs.",
            },
            { status: 500 }
        );
    }
}
