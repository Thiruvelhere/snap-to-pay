
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PayPalReturnClient from "./PayPalReturnClient";

function PayPalReturnContent() {
    const searchParams = useSearchParams();

    const saleId = searchParams.get("saleId") ?? "";
    const orderId = searchParams.get("token") ?? "";

    return (
        <PayPalReturnClient
            saleId={saleId}
            orderId={orderId}
        />
    );
}

export default function PayPalReturnPage() {
    return (
        <Suspense
            fallback={
                <main className="min-h-screen flex items-center justify-center">
                    <p>Loading payment details...</p>
                </main>
            }
        >
            <PayPalReturnContent />
        </Suspense>
    );
}
