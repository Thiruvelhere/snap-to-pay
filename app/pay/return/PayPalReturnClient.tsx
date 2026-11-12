
"use client";

import { useCallback, useEffect, useState } from "react";

type ReceiptItem = {
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
};

type Receipt = {
    id: string;
    paymentStatus: string;
    subtotal: number;
    tax: number;
    total: number;
    paypalOrderId: string | null;
    paypalCaptureId: string | null;
    createdAt: string;
    currency: string;
    items: ReceiptItem[];
};

type ApiResponse = {
    success: boolean;
    message?: string;
    sale?: Receipt;
};

const formatINR = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
    }).format(amount / 100);

export default function PayPalReturnClient({
    saleId,
    orderId,
}: {
    saleId: string;
    orderId: string;
}) {
    const [receipt, setReceipt] = useState<Receipt | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const verifyAndLoadReceipt = useCallback(async () => {
        if (!saleId || !orderId) {
            setError("Missing sale or PayPal order information.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");
        setReceipt(null);

        try {
            // Step 1: Ask the server to capture or verify payment.
            const captureResponse = await fetch(
                `/api/sales/${encodeURIComponent(saleId)}/capture`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ orderId }),
                    cache: "no-store",
                }
            );

            const captureData = await captureResponse.json();

            if (!captureResponse.ok || !captureData.success) {
                throw new Error(
                    captureData.message || "Payment could not be verified."
                );
            }

            // Step 2: Fetch the persisted receipt from the database.
            const receiptResponse = await fetch(
                `/api/sales/${encodeURIComponent(saleId)}`,
                {
                    method: "GET",
                    cache: "no-store",
                }
            );

            const receiptData: ApiResponse = await receiptResponse.json();

            if (
                !receiptResponse.ok ||
                !receiptData.success ||
                !receiptData.sale
            ) {
                throw new Error(
                    receiptData.message || "Unable to load receipt details."
                );
            }

            if (receiptData.sale.paymentStatus !== "completed") {
                throw new Error("Payment has not been marked as completed.");
            }

            setReceipt(receiptData.sale);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to verify payment. Please retry."
            );
        } finally {
            setLoading(false);
        }
    }, [saleId, orderId]);

    useEffect(() => {
        void verifyAndLoadReceipt();
    }, [verifyAndLoadReceipt]);

    return (
        <main className="min-h-screen bg-gray-50 px-4 py-10">
            <div className="mx-auto w-full max-w-2xl">

                {loading ? (
                    <div className="rounded-2xl bg-white p-10 text-center shadow-lg">
                        <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
                        <h1 className="text-2xl font-bold">
                            Verifying payment
                        </h1>
                        <p className="mt-2 text-gray-500">
                            Please wait while we confirm your payment and
                            retrieve your receipt.
                        </p>
                    </div>
                ) : error ? (
                    <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
                        <div className="text-5xl font-bold text-red-500">
                            !
                        </div>

                        <h1 className="mt-4 text-2xl font-bold">
                            Payment not confirmed
                        </h1>

                        <p className="mt-3 text-gray-600">
                            {error}
                        </p>

                        <button
                            onClick={verifyAndLoadReceipt}
                            className="mt-6 w-full rounded-lg bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800"
                        >
                            Retry verification
                        </button>

                        <a
                            href="/"
                            className="mt-4 block text-blue-600 underline"
                        >
                            Return to Snap to Pay
                        </a>
                    </div>
                ) : receipt ? (
                    <div className="overflow-hidden rounded-2xl bg-white shadow-lg">

                        {/* PAID HEADER */}
                        <div className="border-b border-green-100 bg-green-50 px-8 py-8 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-4xl font-bold text-green-600">
                                ✓
                            </div>

                            <h1 className="mt-4 text-2xl font-bold text-green-800">
                                Payment successful!
                            </h1>

                            <p className="mt-2 text-green-700">
                                Your payment has been captured successfully.
                            </p>

                            <div className="mt-5 inline-block rounded-full bg-green-700 px-8 py-2 text-lg font-extrabold tracking-widest text-white">
                                PAID
                            </div>
                        </div>

                        <div className="space-y-7 p-6 sm:p-8">

                            {/* TOTAL */}
                            <div className="text-center">
                                <p className="text-sm text-gray-500">
                                    Total amount paid
                                </p>

                                <p className="mt-2 text-4xl font-bold text-gray-900">
                                    {formatINR(receipt.total)}
                                </p>

                                <p className="mt-2 text-sm text-gray-500">
                                    {new Date(receipt.createdAt).toLocaleString(
                                        "en-IN",
                                        {
                                            dateStyle: "medium",
                                            timeStyle: "short",
                                        }
                                    )}
                                </p>
                            </div>

                            {/* ITEMS */}
                            <section>
                                <h2 className="mb-4 text-lg font-bold">
                                    Order summary
                                </h2>

                                <div className="space-y-4">
                                    {receipt.items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex justify-between gap-4 border-b border-gray-100 pb-4"
                                        >
                                            <div className="min-w-0">
                                                <p className="break-words font-medium text-gray-900">
                                                    {item.productName}
                                                </p>

                                                <p className="mt-1 text-sm text-gray-500">
                                                    {item.quantity} ×{" "}
                                                    {formatINR(item.unitPrice)}
                                                </p>
                                            </div>

                                            <p className="shrink-0 font-semibold">
                                                {formatINR(item.lineTotal)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* PRICE BREAKDOWN */}
                            <section className="space-y-3 border-t border-gray-200 pt-5">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>{formatINR(receipt.subtotal)}</span>
                                </div>

                                <div className="flex justify-between text-gray-600">
                                    <span>Tax</span>
                                    <span>{formatINR(receipt.tax)}</span>
                                </div>

                                <div className="flex justify-between border-t border-gray-200 pt-4 text-xl font-bold">
                                    <span>Total paid</span>
                                    <span>{formatINR(receipt.total)}</span>
                                </div>
                            </section>

                            {/* PAYMENT DETAILS */}
                            <section className="rounded-xl bg-gray-50 p-5">
                                <h2 className="mb-4 font-bold">
                                    Payment details
                                </h2>

                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between gap-4">
                                        <span className="text-gray-500">
                                            Payment status
                                        </span>
                                        <span className="font-semibold text-green-700">
                                            {receipt.paymentStatus.toUpperCase()}
                                        </span>
                                    </div>

                                    <div className="flex justify-between gap-4">
                                        <span className="text-gray-500">
                                            Payment provider
                                        </span>
                                        <span className="font-medium">
                                            PayPal
                                        </span>
                                    </div>

                                    <div>
                                        <p className="text-gray-500">
                                            Sale ID
                                        </p>
                                        <p className="mt-1 break-all font-medium">
                                            {receipt.id}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-gray-500">
                                            PayPal Capture ID
                                        </p>
                                        <p className="mt-1 break-all font-medium">
                                            {receipt.paypalCaptureId || "Unavailable"}
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <a
                                href="/"
                                className="block w-full rounded-lg bg-black px-5 py-4 text-center font-semibold text-white hover:bg-gray-800"
                            >
                                Back to Snap to Pay
                            </a>

                            <p className="text-center text-xs text-gray-400">
                                Payments powered by PayPal
                            </p>
                        </div>
                    </div>
                ) : null}
            </div>
        </main>
    );
}
