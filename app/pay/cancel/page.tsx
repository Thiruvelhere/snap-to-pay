
export default function CancelPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
            <h1 className="text-2xl font-bold">Payment Cancelled</h1>
            <p className="mt-2 text-gray-600">
                Your payment was cancelled. No payment was completed.
            </p>
            <a
                href="/"
                className="mt-6 rounded-lg bg-black px-5 py-3 text-white"
            >
                Return to Snap to Pay
            </a>
        </main>
    );
}
