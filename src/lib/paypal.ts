
const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL;
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

export async function getPayPalAccessToken(): Promise<string> {
    if (!PAYPAL_BASE_URL || !PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
        throw new Error("PayPal environment variables are missing");
    }

    const credentials = Buffer.from(
        `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(
        `${PAYPAL_BASE_URL}/v1/oauth2/token`,
        {
            method: "POST",
            headers: {
                Authorization: `Basic ${credentials}`,
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
            },
            body: "grant_type=client_credentials",
            cache: "no-store",
        }
    );

    if (!response.ok) {
        const error = await response.text();
        console.error("PayPal authentication failed:", error);
        throw new Error(`PayPal authentication failed (${response.status})`);
    }

    const data = await response.json();

    if (!data.access_token) {
        throw new Error("PayPal did not return an access token");
    }

    return data.access_token;
}
