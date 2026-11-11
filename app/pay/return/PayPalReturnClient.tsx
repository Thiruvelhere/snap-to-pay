
"use client";

import { useEffect, useState } from "react";

type PaymentResult = {
    success: boolean;
    message: string;
    saleId?: string;
    paymentStatus?: string;
    paypalCaptureId?: string;
    total?: number;
    currency?: string;
};

export default function PayPalReturnClient({
    saleId,
    orderId,
}: {
    saleId: string;
    orderId: string;
}) {
    const [result, setResult] = useState<PaymentResult | null>(null);
    const [loading, setLoading] = useState(true);

    async function capturePayment() {
        if (!saleId || !orderId) {
            setResult({
                success: false,
                message: "Missing sale or PayPal order information.",
            });
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                `/api/sales/${encodeURIComponent(saleId)}/capture`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ orderId }),
                }
            );

            const data: PaymentResult = await response.json();
            setResult(data);
        } catch {
            setResult({
                success: false,
                message: "Unable to contact the payment server. Please retry.",
            });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void capturePayment();
    }, [saleId, orderId]);

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
            <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg">
                {loading ? (
                    <div className="text-center space-y-4">
                        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                        <h1 className="text-2xl font-bold">Verifying payment</h1>
                        <p className="text-gray-500">
                            Please wait while we confirm your PayPal payment.
                        </p>
                    </div>
                ) : result?.success ? (
                    <div className="text-center space-y-4">
                        <div className="text-5xl text-green-600">✓</div>
                        <h1 className="text-2xl font-bold text-green-700">
                            Payment successful!
                        </h1>
                        <p className="text-gray-600">
                            Your payment has been captured successfully.
                        </p>

                        <div className="rounded-xl bg-gray-50 p-5 text-left space-y-3">
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-500">Sale ID</span>
                                <span className="font-medium break-all">{result.saleId}</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-500">Amount</span>
                                <span className="font-bold">
                                    ₹{((result.total ?? 0) / 100).toFixed(2)}
                                </span>
                            </div>

                            <div className="flex justify-between gap-4">
                                <span className="text-gray-500">Payment status</span>
                                <span className="font-semibold text-green-700">
                                    {result.paymentStatus}
                                </span>
                            </div>

                            <div className="flex justify-between gap-4">
                                <span className="text-gray-500">Capture ID</span>
                                <span className="font-medium break-all text-sm">
                                    {result.paypalCaptureId}
                                </span>
                            </div>
                        </div>

                        <a
                            href="/"
                            className="block w-full rounded-lg bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800"
                        >
                            Back to Snap to Pay
                        </a>
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="text-5xl text-red-500">!</div>
                        <h1 className="text-2xl font-bold">Payment not confirmed</h1>
                        <p className="text-gray-600">
                            {result?.message ?? "Something went wrong."}
                        </p>

                        <button
                            onClick={capturePayment}
                            className="w-full rounded-lg bg-black px-5 py-3 font-semibold text-white"
                        >
                            Retry verification
                        </button>

                        <a href="/" className="block text-blue-600 underline">
                            Return to Snap to Pay
                        </a>
                    </div>
                )}
            </div>
        </main>
    );
}
