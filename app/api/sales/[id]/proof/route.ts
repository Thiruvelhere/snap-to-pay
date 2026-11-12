import { NextResponse } from "next/server";
import { z } from "zod";

import { verifySaleProof } from "../../../../../src/lib/sale-proof";

const proofIdSchema = z.string().uuid();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!proofIdSchema.safeParse(id).success) {
      return NextResponse.json(
        { success: false, message: "Invalid sale ID" },
        { status: 400 }
      );
    }

    const verification = await verifySaleProof(id);

    if (!verification.found || !verification.proof || !verification.sale) {
      return NextResponse.json(
        {
          success: false,
          message: "Proof not found for this sale",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      saleId: verification.sale.id,
      isValid: verification.isValid,
      summary: {
        paymentStatus: verification.sale.paymentStatus,
        total: verification.sale.total,
        currency: "INR",
        paypalCaptureId: verification.sale.paypalCaptureId,
        proofHash: verification.proof.proofHash,
        previousHash: verification.proof.previousHash,
        ledgerHash: verification.proof.ledgerHash,
        sequence: verification.proof.sequence,
        itemCount: verification.items.length,
        createdAt: verification.sale.createdAt.toISOString(),
        hashValid: verification.hashValid,
        ledgerValid: verification.ledgerValid,
        chainValid: verification.chainValid,
      },
    });
  } catch (error) {
    console.error("Sale proof verification error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to verify sale proof",
      },
      { status: 500 }
    );
  }
}
