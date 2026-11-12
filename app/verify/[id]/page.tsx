import { notFound } from "next/navigation";

import { verifySaleProof } from "../../../src/lib/sale-proof";

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount / 100);

export default async function VerifySalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const verification = await verifySaleProof(id);

  if (!verification.found || !verification.sale || !verification.proof) {
    notFound();
  }

  const valid = verification.isValid;

  return (
    <main className="min-h-screen bg-[#100B16] px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-violet-200/70">
              Proof of sale
            </p>
            <h1 className="mt-3 text-3xl font-bold">Transaction verification</h1>
          </div>

          <div
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              valid
                ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-300"
                : "border-rose-400/50 bg-rose-500/10 text-rose-300"
            }`}
          >
            {valid ? "Valid" : "Invalid"}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <p className="text-sm text-violet-200/70">Sale ID</p>
            <p className="mt-2 break-all text-lg font-medium">{verification.sale.id}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <p className="text-sm text-violet-200/70">Payment status</p>
            <p className="mt-2 text-lg font-medium uppercase">
              {verification.sale.paymentStatus}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <p className="text-sm text-violet-200/70">Amount</p>
            <p className="mt-2 text-lg font-medium">
              {formatINR(verification.sale.total)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <p className="text-sm text-violet-200/70">Item count</p>
            <p className="mt-2 text-lg font-medium">{verification.items.length}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-4">
          <p className="text-sm text-violet-200/70">Hash summary</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <span className="text-violet-200/70">Proof hash</span>
              <span className="break-all font-mono text-xs md:text-sm">
                {verification.proof.proofHash}
              </span>
            </div>

            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <span className="text-violet-200/70">Previous hash</span>
              <span className="break-all font-mono text-xs md:text-sm">
                {verification.proof.previousHash ?? "genesis"}
              </span>
            </div>

            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <span className="text-violet-200/70">Ledger hash</span>
              <span className="break-all font-mono text-xs md:text-sm">
                {verification.proof.ledgerHash}
              </span>
            </div>

            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <span className="text-violet-200/70">Ledger sequence</span>
              <span className="font-medium">{verification.proof.sequence}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-4">
          <p className="text-sm text-violet-200/70">Verification checks</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>Hash matches canonical transaction: {verification.hashValid ? "Yes" : "No"}</li>
            <li>Ledger chain integrity: {verification.ledgerValid ? "Yes" : "No"}</li>
            <li>Previous ledger continuity: {verification.chainValid ? "Yes" : "No"}</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/"
            className="rounded-full bg-violet-500 px-5 py-3 font-semibold text-white transition hover:bg-violet-400"
          >
            Back to Snap to Pay
          </a>
          <a
            href={`/pay/return?saleId=${encodeURIComponent(id)}&token=verified`}
            className="rounded-full border border-white/15 px-5 py-3 font-semibold text-white transition hover:bg-white/5"
          >
            Open receipt
          </a>
        </div>
      </div>
    </main>
  );
}
